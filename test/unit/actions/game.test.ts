import * as actions from '@app/actions/game';
import { Game, GameDetail } from '@app/models/game.js';
import { Roster } from '@app/models/player.js';
import { GameState } from '@app/reducers/game';
import * as actionTypes from '@app/slices/game-types';
import { reader } from '@app/storage/firestore-reader.js';
import { RootState } from '@app/store';
import { expect } from '@open-wc/testing';
import sinon from 'sinon';
import {
  buildGames, buildRoster, getMockAuthState, getOtherStoredPlayer,
  getStoredGame, getStoredGameData, getStoredPlayer,
  OTHER_STORED_GAME_ID
} from '../helpers/test_data';

function getOtherStoredGameWithoutDetail(): Game {
  return { id: OTHER_STORED_GAME_ID, ...getStoredGameData() };
};

function getTeamRoster() {
  return buildRoster([getStoredPlayer(), getOtherStoredPlayer()]);
};

function getStoredGameDetail(): GameDetail {
  return {
    ...getStoredGame(),
    roster: getTeamRoster()
  };
};

const KEY_GAMES = 'games';

interface MockStateUpdateFunc {
  (state: GameState): void;
}

function mockGetState(games?: Game[], updateFn?: MockStateUpdateFunc) {
  return sinon.fake(() => {
    const mockState: RootState = {
      auth: getMockAuthState(),
      game: {
        gameId: '',
        game: undefined,
        games: buildGames(games || []),
        detailLoading: false,
        detailFailure: false,
        rosterLoading: false,
        rosterFailure: false
      },
      team: undefined
    };
    if (updateFn) {
      updateFn(mockState.game!);
    }
    return mockState;
  });
}


describe('Game actions', () => {
  let readerStub: sinon.SinonStubbedInstance<typeof reader>;

  beforeEach(() => {
    sinon.restore();

    readerStub = sinon.stub<typeof reader>(reader);
  });

  function mockLoadDocumentWithGame(game: Game) {
    return readerStub.loadDocument
      .withArgs(`${KEY_GAMES}/${game.id}`, sinon.match.object)
      .resolves(game);
  }

  function mockLoadCollectionWithGameRoster(gameId: string, roster: Roster) {
    return readerStub.loadCollection
      .withArgs(`${KEY_GAMES}/${gameId}/roster`, sinon.match.object)
      .resolves(roster);
  }

  describe('getGame', () => {
    it('should do nothing if game id is missing', async () => {
      const dispatchMock = sinon.stub();
      const getStateMock = sinon.stub();

      let getRejected = false;
      try {
        await actions.getGame(undefined as unknown as string)(dispatchMock, getStateMock, undefined);
      } catch {
        getRejected = true;
      }
      expect(getRejected, 'getGame() rejected').to.be.true;

      expect(readerStub.loadDocument, 'loadDocument').to.not.have.been.called;
      expect(readerStub.loadCollection, 'loadCollection').to.not.have.been.called;

      expect(dispatchMock).to.not.have.been.called;
    });

    it('should dispatch success action with game returned from storage', async () => {
      const expectedGame = getStoredGame();
      const expectedGameDetail = getStoredGameDetail();
      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState([]);
      const loadDocumentStub = mockLoadDocumentWithGame(expectedGame);
      const loadCollectionStub = mockLoadCollectionWithGameRoster(
        expectedGameDetail.id, expectedGameDetail.roster);

      await actions.getGame(expectedGameDetail.id)(dispatchMock, getStateMock, undefined);

      expect(loadDocumentStub, 'loadDocument').to.have.callCount(1);
      expect(loadCollectionStub, 'loadCollection').to.have.callCount(1);

      expect(dispatchMock, 'dispatch').to.have.callCount(2);

      // Checks that first dispatch was the request action
      expect(dispatchMock.firstCall).to.have.been.calledWith({
        type: actionTypes.GET_GAME_REQUEST,
        gameId: expectedGameDetail.id,
      });

      expect(dispatchMock.lastCall).to.have.been.calledWith({
        type: actionTypes.GET_GAME_SUCCESS,
        game: expectedGameDetail,
      });
    });

    it('should dispatch success action when game roster is empty', async () => {
      const storedGame: GameDetail = {
        ...getOtherStoredGameWithoutDetail(),
        roster: {}
      }

      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState([]);
      const loadDocumentStub = mockLoadDocumentWithGame(storedGame);
      const loadCollectionStub = mockLoadCollectionWithGameRoster(
        storedGame.id, {});

      await actions.getGame(OTHER_STORED_GAME_ID)(dispatchMock, getStateMock, undefined);

      expect(loadDocumentStub, 'loadDocument').to.have.callCount(1);
      expect(loadCollectionStub, 'loadCollection').to.have.callCount(1);

      // The request action is dispatched, regardless.
      expect(dispatchMock).to.have.callCount(2);

      expect(dispatchMock.lastCall).to.have.been.calledWith({
        type: actionTypes.GET_GAME_SUCCESS,
        game: storedGame
      });
    });

    it('should use the already loaded game from game detail in state, without retrieving from storage', async () => {
      const dispatchMock = sinon.stub();
      const loadedGame: GameDetail = {
        ...getStoredGameDetail(),
        hasDetail: true
      };
      const getStateMock = mockGetState(undefined, (gameState) => {
        gameState.gameId = loadedGame.id;
        gameState.game = loadedGame;
      });

      await actions.getGame(loadedGame.id)(dispatchMock, getStateMock, undefined);

      expect(readerStub.loadDocument, 'loadDocument').to.not.have.been.called;
      expect(readerStub.loadCollection, 'loadCollection').to.not.have.been.called;

      // The request action is dispatched, regardless.
      expect(dispatchMock).to.have.callCount(2);

      expect(dispatchMock.lastCall).to.have.been.calledWith({
        type: actionTypes.GET_GAME_SUCCESS,
        game: loadedGame,
      });
    });

    it('should use the already loaded game from games list in state, without retrieving from storage', async () => {
      const dispatchMock = sinon.stub();
      const loadedGame: GameDetail = {
        ...getStoredGameDetail(),
        hasDetail: true
      };
      const getStateMock = mockGetState([loadedGame]);

      await actions.getGame(loadedGame.id)(dispatchMock, getStateMock, undefined);

      expect(readerStub.loadDocument, 'loadDocument').to.not.have.been.called;
      expect(readerStub.loadCollection, 'loadCollection').to.not.have.been.called;

      // The request action is dispatched, regardless.
      expect(dispatchMock).to.have.callCount(2);

      expect(dispatchMock.lastCall).to.have.been.calledWith({
        type: actionTypes.GET_GAME_SUCCESS,
        game: loadedGame,
      });
    });

    it('should retrieve from storage when already loaded game is missing detail', async () => {
      const expectedGame = getStoredGame();
      const expectedGameDetail = getStoredGameDetail();

      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState([{
        ...expectedGameDetail, hasDetail: false
      }]);
      const loadDocumentStub = mockLoadDocumentWithGame(expectedGame);
      const loadCollectionStub = mockLoadCollectionWithGameRoster(
        expectedGameDetail.id, expectedGameDetail.roster);

      await actions.getGame(expectedGame.id)(dispatchMock, getStateMock, undefined);

      expect(loadDocumentStub, 'loadDocument').to.have.callCount(1);
      expect(loadCollectionStub, 'loadCollection').to.have.callCount(1);

      // The request action is dispatched, regardless.
      expect(dispatchMock).to.have.callCount(2);

      expect(dispatchMock.lastCall).to.have.been.calledWith({
        type: actionTypes.GET_GAME_SUCCESS,
        game: expectedGameDetail,
      });
    });

    it('should fail when game not found in storage', async () => {
      const gameId = 'nosuchgame';

      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState([]);
      readerStub.loadDocument
        .withArgs(`${KEY_GAMES}/${gameId}`, sinon.match.object)
        .rejects(new Error(`Document not found: ${KEY_GAMES}/${gameId}`));

      await actions.getGame(gameId)(dispatchMock, getStateMock, undefined);

      expect(dispatchMock).to.have.callCount(2);

      // Checks that first dispatch was the request action
      expect(dispatchMock.firstCall).to.have.been.calledWith({
        type: actionTypes.GET_GAME_REQUEST,
        gameId: gameId,
      });

      expect(dispatchMock.lastCall).to.have.been.calledWith({
        type: actionTypes.GET_GAME_FAIL,
        error: `Error: Document not found: ${KEY_GAMES}/${gameId}`,
      });
    });

    it('should dispatch only request action when storage access fails', async () => {
      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState();
      const gameId = getStoredGame().id;

      readerStub.loadDocument.onFirstCall().throws(() => { return new Error('Storage failed with some error'); });

      expect(() => {
        actions.getGame(gameId)(dispatchMock, getStateMock, undefined);
      }).to.throw('Storage failed');

      expect(dispatchMock).to.have.callCount(1);

      // Checks that first dispatch was the request action
      expect(dispatchMock.lastCall).to.have.been.calledWith({
        type: actionTypes.GET_GAME_REQUEST,
        gameId: gameId,
      });
    });
  }); // describe('getGame')

}); // describe('Game actions')
