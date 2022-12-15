import { Game, GameDetail } from '@app/models/game.js';
import { Player, Roster } from '@app/models/player.js';
import * as actionTypes from '@app/slices/game-types';
import { copyRoster, GameState } from '@app/slices/game/game-slice.js';
import * as actions from '@app/slices/game/roster-logic.js';
import { reader } from '@app/storage/firestore-reader.js';
import { writer } from '@app/storage/firestore-writer.js';
import { RootState } from '@app/store';
import { expect } from '@open-wc/testing';
import sinon from 'sinon';
import {
  buildGames, buildRoster, getMockAuthState,
  getNewPlayer, getNewPlayerData,
  getOtherStoredPlayer,
  getStoredGame, getStoredPlayer, STORED_GAME_ID
} from '../../helpers/test_data.js';

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
const KEY_ROSTER = 'roster';
const KEY_TEAMS = 'teams';

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

describe('Game slice: roster actions', () => {
  let readerStub: sinon.SinonStubbedInstance<typeof reader>;
  let writerStub: sinon.SinonStubbedInstance<typeof writer>;

  beforeEach(() => {
    sinon.restore();

    readerStub = sinon.stub<typeof reader>(reader);
    writerStub = sinon.stub<typeof writer>(writer);
  });

  function mockLoadCollectionWithTeamRoster(teamId: string, roster: Roster) {
    return readerStub.loadCollection
      .withArgs(`${KEY_TEAMS}/${teamId}/roster`, sinon.match.object)
      .resolves(roster);
  }

  describe('copyRoster', () => {
    it('should do nothing if game id is missing', async () => {
      const dispatchMock = sinon.stub();
      const getStateMock = sinon.stub();

      await actions.copyRoster(undefined as unknown as string)(dispatchMock, getStateMock, undefined);

      expect(readerStub.loadCollection, 'loadCollection').to.not.have.been.called;

      expect(dispatchMock).to.not.have.been.called;
    });

    it('should do nothing when game id does not match loaded game', async () => {
      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState([]);

      const gameId = 'nosuchgame';
      await actions.copyRoster(gameId)(dispatchMock, getStateMock, undefined);

      expect(readerStub.loadCollection, 'loadCollection').to.not.have.been.called;

      // The request action is dispatched, regardless.
      expect(dispatchMock).to.have.callCount(2);

      expect(dispatchMock.lastCall).to.have.been.calledWith(sinon.match({
        type: copyRoster.rejected.type,
        error: { message: 'No existing game found for id: nosuchgame' }
      }));
    });

    it('should do nothing if game already loaded has a roster with players', async () => {
      const dispatchMock = sinon.stub();
      const loadedGame: GameDetail = {
        ...getStoredGameDetail(),
        hasDetail: true
      };
      const getStateMock = mockGetState(undefined, (gameState) => {
        gameState.gameId = loadedGame.id;
        gameState.game = loadedGame;
      });

      await actions.copyRoster(loadedGame.id)(dispatchMock, getStateMock, undefined);

      expect(readerStub.loadCollection, 'loadCollection').to.not.have.been.called;

      // The request action is dispatched, regardless.
      expect(dispatchMock).to.have.callCount(2);

      expect(dispatchMock.lastCall).to.have.been.calledWithMatch({
        type: copyRoster.fulfilled.type,
        payload: {
          gameId: loadedGame.id,
        }
      });

    });

    it('should dispatch success action with team roster copied to game in storage', async () => {
      const dispatchMock = sinon.stub();
      const loadedGame: GameDetail = {
        ...getStoredGameDetail(),
        hasDetail: true,
        roster: {}
      };
      const teamRoster = getTeamRoster();
      const rosterSize = Object.keys(teamRoster).length;

      const getStateMock = mockGetState(undefined, (gameState) => {
        gameState.gameId = loadedGame.id;
        gameState.game = loadedGame;
      });
      const loadCollectionStub = mockLoadCollectionWithTeamRoster(loadedGame.teamId,
        teamRoster);
      const saveNewDocumentStub = writerStub.saveNewDocument.resolves();

      const gameId = loadedGame.id;
      await actions.copyRoster(gameId)(dispatchMock, getStateMock, undefined);

      expect(loadCollectionStub, 'loadCollection').to.have.callCount(1);

      // Checks that each player was saved to the game roster.
      expect(saveNewDocumentStub, 'saveNewDocument').to.have.callCount(rosterSize);
      Object.keys(teamRoster).forEach((key, index) => {
        expect(saveNewDocumentStub.getCall(index)).to.have.been.calledWith(
          teamRoster[key], `${KEY_GAMES}/${gameId}/roster`, sinon.match.object, undefined, { keepExistingId: true });
      });
      expect(dispatchMock).to.have.callCount(2);

      // Checks that first dispatch was the request action
      expect(dispatchMock.firstCall).to.have.been.calledWith(sinon.match({
        type: copyRoster.pending.type,
        meta: {
          gameId: gameId,
        }
      }));

      expect(dispatchMock.lastCall).to.have.been.calledWith(sinon.match({
        type: copyRoster.fulfilled.type,
        payload: {
          gameId: gameId,
          gameRoster: { ...teamRoster }
        }
      }));
    });

    it('should dispatch rejected action when storage access fails', async () => {
      const dispatchMock = sinon.stub();
      const loadedGame: GameDetail = {
        ...getStoredGameDetail(),
        hasDetail: true,
        roster: {}
      };
      const getStateMock = mockGetState(undefined, (gameState) => {
        gameState.gameId = loadedGame.id;
        gameState.game = loadedGame;
      });

      const gameId = loadedGame.id;

      readerStub.loadCollection.onFirstCall().throws(() => { return new Error('Storage failed with some error'); });

      await actions.copyRoster(gameId)(dispatchMock, getStateMock, undefined);

      expect(dispatchMock).to.have.callCount(2);

      // Checks that first dispatch was the request action
      expect(dispatchMock).to.have.been.calledWith(sinon.match({
        type: copyRoster.pending.type,
        meta: {
          gameId: gameId,
        }
      }));

      expect(dispatchMock.lastCall).to.have.been.calledWith(sinon.match({
        type: copyRoster.rejected.type,
        error: { message: 'Storage failed with some error' }
      }));
    });
  }); // describe('copyRoster')

  describe('addNewGamePlayer', () => {
    it('should do nothing if new player is missing', () => {
      const dispatchMock = sinon.stub();
      const getStateMock = sinon.stub();

      actions.addNewGamePlayer(undefined as unknown as Player)(dispatchMock, getStateMock, undefined);

      expect(getStateMock).to.not.have.been.called;

      expect(dispatchMock).to.not.have.been.called;
    });

    it('should dispatch an action to add a new player that is unique', () => {
      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState(undefined, (gameState) => {
        gameState.gameId = STORED_GAME_ID;
        gameState.game = getStoredGameDetail();
      });

      actions.addNewGamePlayer(getNewPlayer())(dispatchMock, getStateMock, undefined);

      expect(getStateMock).to.have.been.called;

      expect(dispatchMock).to.have.been.calledWith(sinon.match.func);
    });

    it('should do nothing with a new player that is not unique', () => {
      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState(undefined, (gameState) => {
        gameState.gameId = STORED_GAME_ID;
        gameState.game = getStoredGameDetail();
      });

      actions.addNewGamePlayer(getStoredPlayer())(dispatchMock, getStateMock, undefined);

      expect(getStateMock).to.have.been.called;

      expect(dispatchMock).to.not.have.been.called;
    });
  });  // describe('addNewGamePlayer')

  describe('saveGamePlayer', () => {
    it('should save to storage and dispatch an action to add player', async () => {
      const expectedId = 'randomGamePlayerID68097';
      const expectedSavedPlayer: Player = {
        ...getNewPlayerData(),
        id: expectedId,
      };

      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState(undefined, (gameState) => {
        gameState.gameId = STORED_GAME_ID;
        gameState.game = getStoredGameDetail();
      });
      const saveNewDocumentStub = writerStub.saveNewDocument.callsFake(
        (model) => { model.id = expectedId; }
      );

      const inputPlayer = getNewPlayer();
      actions.saveGamePlayer(inputPlayer)(dispatchMock, getStateMock, undefined);

      // Waits for promises to resolve.
      await Promise.resolve();

      // Checks that the new player was saved to the database.
      expect(saveNewDocumentStub).calledOnceWith(
        inputPlayer, `${KEY_GAMES}/${STORED_GAME_ID}/${KEY_ROSTER}`, sinon.match.object);
      expect(inputPlayer, 'Input player should have properties set by saving').to.deep.equal(expectedSavedPlayer);

      // Waits for promises to resolve.
      await Promise.resolve();
      expect(dispatchMock).to.have.been.calledWith({
        type: actionTypes.ADD_GAME_PLAYER,
        player: expectedSavedPlayer,
      });
    });

    it('should not dispatch an action when storage access fails', async () => {
      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState(undefined, (gameState) => {
        gameState.gameId = STORED_GAME_ID;
        gameState.game = getStoredGameDetail();
      });
      writerStub.saveNewDocument.onFirstCall().throws(() => { return new Error('Storage failed with some error'); });

      expect(() => {
        actions.saveGamePlayer(getNewPlayer())(dispatchMock, getStateMock, undefined);
      }).to.throw('Storage failed');

      // Waits for promises to resolve.
      await Promise.resolve();

      expect(dispatchMock).to.not.have.been.called;
    });
  }); // describe('saveGamePlayer')

  describe('addGamePlayer', () => {
    it('should dispatch an action to add the player', () => {
      expect(actions.addGamePlayer(getNewPlayer())).to.deep.equal({
        type: actionTypes.ADD_GAME_PLAYER,
        player: getNewPlayer(),
      });
    });
  }); // describe('addGamePlayer')

}); // describe('Game slice: roster actions')
