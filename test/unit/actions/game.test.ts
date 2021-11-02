import * as actions from '@app/actions/game';
import { firebaseRef } from '@app/firebase';
import { FormationType } from '@app/models/formation';
import { Game, GameDetail, GameStatus } from '@app/models/game';
import { Player, Roster } from '@app/models/player';
import { GameState } from '@app/reducers/game';
import * as actionTypes from '@app/slices/game-types';
import { reader } from '@app/storage/firestore-reader.js';
import { writer } from '@app/storage/firestore-writer.js';
import { RootState } from '@app/store';
import {
  DocumentData,
  Query, QueryDocumentSnapshot, QuerySnapshot
} from '@firebase/firestore-types';
import { expect } from '@open-wc/testing';
import sinon from 'sinon';
import { getMockFirebase, mockFirestoreAccessor } from '../helpers/mock-firebase-factory';
import {
  buildGames, buildRoster, getMockAuthState,
  getNewPlayer, getNewPlayerData,
  getStoredGame, getStoredGameData, getStoredPlayer,
  OTHER_STORED_GAME_ID, STORED_GAME_ID
} from '../helpers/test_data';

function getOtherStoredGameWithoutDetail(): Game {
  return { id: OTHER_STORED_GAME_ID, ...getStoredGameData() };
};

function getTeamRoster() {
  return buildRoster([getStoredPlayer()]);
};

function getStoredGameDetail(): GameDetail {
  return {
    ...getStoredGame(),
    roster: getTeamRoster()
  };
};

const KEY_GAMES = 'games';
const KEY_ROSTER = 'roster';

interface MockStateUpdateFunc {
  (state: GameState): void;
}

function mockGetState(games?: Game[], updateFn?: MockStateUpdateFunc) {
  return sinon.fake(() => {
    const mockState: RootState = {
      auth: getMockAuthState(),
      games: {
        games: buildGames(games || []),
      },
      game: {
        hydrated: false,
        gameId: '',
        game: undefined,
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
  let mockFirebase: any;
  let firestoreAccessorMock: sinon.SinonStub;
  let readerStub: sinon.SinonStubbedInstance<typeof reader>;
  let writerStub: sinon.SinonStubbedInstance<typeof writer>;

  beforeEach(() => {
    sinon.restore();

    readerStub = sinon.stub<typeof reader>(reader);
    writerStub = sinon.stub<typeof writer>(writer);

    mockFirebase = getMockFirebase();
    firestoreAccessorMock = mockFirestoreAccessor(mockFirebase);
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
    it('should return a function to dispatch the getGame action', () => {
      expect(actions.getGame()).to.be.instanceof(Function);
    });

    it('should do nothing if game id is missing', async () => {
      const dispatchMock = sinon.stub();
      const getStateMock = sinon.stub();

      let getRejected = false;
      try {
        await actions.getGame()(dispatchMock, getStateMock, undefined);
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

  describe('copyRoster', () => {

    async function verifyStoredRoster(gameId: string, expectedRoster: Roster) {
      const expectedIds = Object.keys(expectedRoster);
      const path = `${KEY_GAMES}/${gameId}/${KEY_ROSTER}`;
      const query: Query = mockFirebase.firestore().collection(path);
      const result: QuerySnapshot = await query.get();
      expect(result.size).to.equal(expectedIds.length);

      let matchingCount = 0;
      result.forEach((doc: QueryDocumentSnapshot) => {
        const id = doc.id;

        expect(id).to.be.ok;
        expect(id).to.match(/[A-Za-z0-9]+/);

        expect(expectedRoster[id]).to.not.be.undefined;

        const data = doc.data();
        const matchingPlayer: Player = expectedRoster[id];

        expect(data).to.deep.equal(matchingPlayer);

        matchingCount++;
      });

      // Checks that all of the expected players were found.
      expect(matchingCount).to.equal(expectedIds.length);
    }

    it('should return a function to dispatch the copyRoster action', () => {
      expect(actions.copyRoster()).to.be.instanceof(Function);
    });

    it('should do nothing if game id is missing', async () => {
      const dispatchMock = sinon.stub();
      const getStateMock = sinon.stub();

      await actions.copyRoster()(dispatchMock, getStateMock, undefined);

      expect(firebaseRef.firestore).to.not.have.been.called;

      expect(dispatchMock).to.not.have.been.called;
    });

    it('should do nothing when game id does not match loaded game', async () => {
      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState([]);

      const gameId = 'nosuchgame';
      await actions.copyRoster(gameId)(dispatchMock, getStateMock, undefined);

      expect(firebaseRef.firestore).to.not.have.been.called;

      expect(dispatchMock).to.not.have.been.called;
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

      expect(firebaseRef.firestore).to.not.have.been.called;

      // The request action is dispatched, regardless.
      expect(dispatchMock).to.have.callCount(2);

      expect(dispatchMock.lastCall).to.have.been.calledWithMatch({
        type: actionTypes.COPY_ROSTER_SUCCESS,
        gameId: loadedGame.id,
      });

    });

    it('should dispatch success action with team roster copied to game in storage', async () => {
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
      await actions.copyRoster(gameId)(dispatchMock, getStateMock, undefined);

      expect(firebaseRef.firestore).to.have.callCount(2);

      expect(dispatchMock).to.have.callCount(2);

      // Checks that first dispatch was the request action
      expect(dispatchMock.firstCall).to.have.been.calledWith({
        type: actionTypes.COPY_ROSTER_REQUEST,
        gameId: gameId,
      });

      expect(dispatchMock.lastCall).to.have.been.calledWith({
        type: actionTypes.COPY_ROSTER_SUCCESS,
        gameId: gameId,
        gameRoster: buildRoster([getStoredPlayer()]),
      });

      await verifyStoredRoster(gameId, buildRoster([getStoredPlayer()]));
    });

    it('should dispatch only request action when storage access fails', async () => {
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

      firestoreAccessorMock.onFirstCall().throws(() => { return new Error('Storage failed with some error'); });

      expect(() => {
        actions.copyRoster(gameId)(dispatchMock, getStateMock, undefined);
      }).to.throw();

      expect(dispatchMock).to.have.callCount(1);

      // Checks that first dispatch was the request action
      expect(dispatchMock.lastCall).to.have.been.calledWith({
        type: actionTypes.COPY_ROSTER_REQUEST,
        gameId: gameId,
      });
    });
  }); // describe('copyRoster')

  describe('markCaptainsDone', () => {
    it('should return a function to dispatch the markCaptainsDone action', () => {
      expect(actions.markCaptainsDone()).to.be.instanceof(Function);
    });

    it('should dispatch an action to mark the captains as done', () => {
      const dispatchMock = sinon.stub();
      const getStateMock = sinon.stub();

      actions.markCaptainsDone()(dispatchMock, getStateMock, undefined);

      expect(dispatchMock).to.have.been.calledWith({
        type: actionTypes.CAPTAINS_DONE
      });
    });
  }); // describe('markCaptainsDone')

  describe('addNewGamePlayer', () => {
    it('should return a function to dispatch the action', () => {
      expect(actions.addNewGamePlayer()).to.be.instanceof(Function);
    });

    it('should do nothing if new player is missing', () => {
      const dispatchMock = sinon.stub();
      const getStateMock = sinon.stub();

      actions.addNewGamePlayer()(dispatchMock, getStateMock, undefined);

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
    it('should return a function to dispatch the action', () => {
      expect(actions.saveGamePlayer()).to.be.instanceof(Function);
    });

    it('should save to storage and dispatch an action to add player', async () => {
      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState(undefined, (gameState) => {
        gameState.gameId = STORED_GAME_ID;
        gameState.game = getStoredGameDetail();
      });

      actions.saveGamePlayer(getNewPlayer())(dispatchMock, getStateMock, undefined);

      // Waits for promises to resolve.
      await Promise.resolve();

      // Checks that the new player was saved to the database.
      const newPlayerSaved = getNewPlayer();
      const path = `${KEY_GAMES}/${STORED_GAME_ID}/${KEY_ROSTER}`;
      const query: Query = mockFirebase.firestore().collection(path).where('name', '==', newPlayerSaved.name);
      const result: QuerySnapshot = await query.get();
      expect(result.size).to.equal(1);

      const expectedData: any = {
        ...getNewPlayerData()
      };

      let id = '';
      let data: DocumentData = {};
      result.forEach((doc: QueryDocumentSnapshot) => {
        id = doc.id;
        data = doc.data();
      });

      expect(id).to.be.ok;
      expect(id).to.match(/[A-Za-z0-9]+/);
      expect(data).to.deep.equal(expectedData);

      // Waits for promises to resolve.
      await Promise.resolve();
      expect(dispatchMock).to.have.been.calledWith(sinon.match.func);
    });

    it('should not dispatch an action when storage access fails', async () => {
      const dispatchMock = sinon.stub();
      const getStateMock = sinon.stub();
      firestoreAccessorMock.onFirstCall().throws(() => { return new Error('Storage failed with some error'); });

      expect(() => {
        actions.saveGamePlayer(getNewPlayer())(dispatchMock, getStateMock, undefined);
      }).to.throw();

      // Waits for promises to resolve.
      await Promise.resolve();

      expect(dispatchMock).to.not.have.been.called;
    });
  }); // describe('saveGamePlayer')

  describe('addGamePlayer', () => {
    it('should return a function to dispatch the addGamePlayer action', () => {
      expect(actions.addGamePlayer()).to.be.instanceof(Function);
    });

    it('should dispatch an action to add the player', () => {
      const dispatchMock = sinon.stub();
      const getStateMock = sinon.stub();

      actions.addGamePlayer(getNewPlayer())(dispatchMock, getStateMock, undefined);

      expect(dispatchMock).to.have.been.calledWith({
        type: actionTypes.ADD_GAME_PLAYER,
        player: getNewPlayer(),
      });
    });
  }); // describe('addGamePlayer')

  describe('markRosterDone', () => {
    it('should return a function to dispatch the markRosterDone action', () => {
      expect(actions.markRosterDone()).to.be.instanceof(Function);
    });

    it('should dispatch an action to mark the roster as done', () => {
      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState(undefined, (gameState) => {
        gameState.gameId = STORED_GAME_ID;
        gameState.game = getStoredGameDetail();
      });

      actions.markRosterDone()(dispatchMock, getStateMock, undefined);

      expect(dispatchMock).to.have.been.calledWith({
        type: actionTypes.ROSTER_DONE,
        roster: getTeamRoster()
      });
    });
  }); // describe('markRosterDone')

  describe('markStartersDone', () => {
    it('should return a function to dispatch the markStartersDone action', () => {
      expect(actions.markStartersDone()).to.be.instanceof(Function);
    });

    it('should dispatch an action to mark the starters as done', () => {
      const dispatchMock = sinon.stub();
      const getStateMock = sinon.stub();

      actions.markStartersDone()(dispatchMock, getStateMock, undefined);

      expect(dispatchMock).to.have.been.calledWith({
        type: actionTypes.STARTERS_DONE
      });
    });
  }); // describe('markStartersDone')

  describe('setFormation', () => {
    it('should return a function to dispatch the setFormation action', () => {
      expect(actions.setFormation()).to.be.instanceof(Function);
    });

    it('should do nothing if formation input is missing', () => {
      const dispatchMock = sinon.stub();
      const getStateMock = sinon.stub();

      actions.setFormation()(dispatchMock, getStateMock, undefined);

      expect(getStateMock).to.not.have.been.called;

      expect(dispatchMock).to.not.have.been.called;
    });

    it('should dispatch an action to set the formation', () => {
      const dispatchMock = sinon.stub();
      const getStateMock = sinon.stub();

      actions.setFormation(FormationType.F4_3_3)(dispatchMock, getStateMock, undefined);

      expect(dispatchMock).to.have.been.calledWith({
        type: actionTypes.SET_FORMATION,
        formationType: FormationType.F4_3_3,
      });
    });
  }); // describe('setFormation')

  describe('startGame', () => {
    let existingGame: GameDetail;
    let getStateMock: sinon.SinonSpy;

    beforeEach(() => {
      existingGame = getStoredGameDetail();
      getStateMock = mockGetState(undefined, (gameState) => {
        gameState.gameId = existingGame.id;
        gameState.game = existingGame;
      });
    });

    it('should return a function to dispatch the startGame action', () => {
      expect(actions.startGame()).to.be.instanceof(Function);
    });

    it('should dispatch an action to move the game to start status', () => {
      const dispatchMock = sinon.stub();

      actions.startGame()(dispatchMock, getStateMock, undefined);

      expect(dispatchMock).to.have.been.calledWith({
        type: actionTypes.START_GAME
      });
    });

    it('should save updated game to storage', async () => {
      const game = getStoredGame();

      const dispatchMock = sinon.stub();
      const updateDocumentStub = writerStub.updateDocument.returns();

      actions.startGame()(dispatchMock, getStateMock, undefined);

      // Waits for promises to resolve.
      await Promise.resolve();

      // Checks that the game was saved to the database.
      expect(updateDocumentStub).calledOnceWith(
        { status: GameStatus.Start }, `${KEY_GAMES}/${game.id}`);
    });

    it('should not dispatch an action when storage access fails', async () => {
      const dispatchMock = sinon.stub();

      writerStub.updateDocument.onFirstCall().throws(() => { return new Error('Storage failed with some error'); });

      expect(() => {
        actions.startGame()(dispatchMock, getStateMock, undefined);
      }).to.throw('Storage failed');

      // Waits for promises to resolve.
      await Promise.resolve();

      expect(dispatchMock).to.not.have.been.called;
    });
  }); // describe('startGame')

}); // describe('Game actions')
