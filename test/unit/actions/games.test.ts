import * as actions from '@app/actions/games';
import { firebaseRef } from '@app/firebase';
import { Game, GameMetadata, GameStatus } from '@app/models/game';
import { DocumentData, Query, QueryDocumentSnapshot, QuerySnapshot } from '@firebase/firestore-types';
import { expect } from '@open-wc/testing';
import * as sinon from 'sinon';
import { getMockFirebase, mockFirestoreAccessor } from '../helpers/mock-firebase-factory';
import {
  buildGames, getMockAuthState, getMockTeamState,
  getPublicGame, getPublicTeam, getStoredGame, getStoredGameData, getStoredTeam,
  MockAuthStateOptions, OTHER_STORED_GAME_ID, TEST_USER_ID
} from '../helpers/test_data';

function getOtherStoredGameWithoutDetail(): Game {
  return { id: OTHER_STORED_GAME_ID, ...getStoredGameData() };
};

function getNewGameMetadata(): GameMetadata {
  return {
    name: 'New G',
    date: new Date(2016, 4, 6),
    opponent: 'New Game Opponent'
  };
};

// New game created by the UI does not have IDs until added to storage.
function getNewGameSaved(): Game {
  return { ...getNewGameMetadata(), id: 'theGameId', teamId: getStoredTeam().id, status: GameStatus.New };
}

function mockGetState(games: Game[], options?: MockAuthStateOptions, teamState?: any) {
  return sinon.fake(() => {
    const mockState = {
      auth: getMockAuthState(options),
      games: {
        games: buildGames(games)
      },
      team: undefined
    };
    if (teamState) {
      mockState.team = teamState;
    }
    return mockState;
  });
}

describe('Games actions', () => {
  let mockFirebase: any;
  let firestoreAccessorStub: sinon.SinonStub;

  beforeEach(() => {
    sinon.restore();

    mockFirebase = getMockFirebase();
    firestoreAccessorStub = mockFirestoreAccessor(mockFirebase);
  });

  describe('getGames', () => {
    it('should return a function to dispatch the getGames action', () => {
      expect( typeof actions.getGames() ).to.equal('function');
    });

    it('should do nothing if team id is missing', () => {
      const dispatchMock = sinon.stub();
      const getStateMock = sinon.stub();

      actions.getGames()(dispatchMock, getStateMock, undefined);

      expect(firebaseRef.firestore).to.not.have.been.called;

      expect(dispatchMock).to.not.have.been.called;
    });

    it('should dispatch an action with owned games for team returned from storage', async () => {
      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState([], { signedIn: true, userId: TEST_USER_ID });

      actions.getGames(getStoredTeam().id)(dispatchMock, getStateMock, undefined);

      // Waits for promises to resolve.
      await Promise.resolve();

      expect(dispatchMock).to.have.been.calledWith({
        type: actions.GET_GAMES,
        games: buildGames([getStoredGame(), getOtherStoredGameWithoutDetail()]),
      });
    });

    it('should dispatch an action with public games when not signed in', async () => {
      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState([], { signedIn: false });

      actions.getGames(getPublicTeam().id)(dispatchMock, getStateMock, undefined);

      // Waits for promises to resolve.
      await Promise.resolve();

      expect(dispatchMock).to.have.been.calledWith({
        type: actions.GET_GAMES,
        games: buildGames([getPublicGame()]),
      });
    });

    it('should not dispatch an action when storage access fails', async () => {
      const dispatchMock = sinon.stub();
      const getStateMock = sinon.stub();

      firestoreAccessorStub.onFirstCall().throws(() => { return new Error('Storage failed with some error'); });

      expect(() => {
        actions.getGames(getStoredTeam().id)(dispatchMock, getStateMock, undefined);
      }).to.throw();

      // Waits for promises to resolve.
      await Promise.resolve();

      expect(dispatchMock).to.not.have.been.called;
    });

  }); // describe('getGames')

  describe('addNewGame', () => {
    it('should return a function to dispatch the action', () => {
      expect(typeof actions.addNewGame()).to.equal('function');
    });

    it('should do nothing if new game is missing', () => {
      const dispatchMock = sinon.stub();
      const getStateMock = sinon.stub();

      actions.addNewGame()(dispatchMock, getStateMock, undefined);

      expect(getStateMock).to.not.have.been.called;

      expect(dispatchMock).to.not.have.been.called;
    });

    it('should dispatch an action to add a new game that is unique', () => {
      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState([getStoredGame()]);

      actions.addNewGame(getNewGameMetadata())(dispatchMock, getStateMock, undefined);

      expect(getStateMock).to.have.been.called;

      expect(dispatchMock).to.have.been.calledWith(sinon.match.instanceOf(Function));
    });

    it('should do nothing with a new game that is not unique', () => {
      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState([getNewGameSaved()]);

      actions.addNewGame(getNewGameMetadata())(dispatchMock, getStateMock, undefined);

      expect(getStateMock).to.have.been.called;

      expect(dispatchMock).to.not.have.been.called;
    });
  });  // describe('addNewGame')

  describe('saveGame', () => {
    it('should return a function to dispatch the action', () => {
      expect(typeof actions.saveGame()).to.equal('function');
    });

    it('should save to storage and dispatch an action to add game', async () => {
      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState([], { signedIn: true, userId: TEST_USER_ID }, getMockTeamState([], getStoredTeam()));

      actions.saveGame(getNewGameMetadata())(dispatchMock, getStateMock, undefined);

      // Waits for promises to resolve.
      await Promise.resolve();

      // Checks that the new game was saved to the database.
      const newGame = getNewGameMetadata();
      const query: Query = mockFirebase.firestore().collection('games').where('name', '==', newGame.name);
      const result: QuerySnapshot = await query.get();
      expect(result.size).to.equal(1);

      const expectedData: any = {
        ...newGame,
        status: GameStatus.New,
        teamId: getStoredTeam().id,
        owner_uid: TEST_USER_ID
      };
      // The date property is checked separately, as firestore doesn't store as JavaScript Date values.
      delete expectedData.date;

      let id = '';
      let data: DocumentData = {};
      result.forEach((doc: QueryDocumentSnapshot) => {
        id = doc.id;
        data = doc.data();
      });

      expect(id).to.be.ok;
      expect(id).to.match(/[A-Za-z0-9]+/);
      expect(data).to.deep.include(expectedData);
      expect(data.date.toDate()).to.deep.equal(newGame.date);

      // Waits for promises to resolve.
      await Promise.resolve();
      expect(dispatchMock).to.have.been.calledWith(sinon.match.instanceOf(Function));
    });

    it('should not dispatch an action when storage access fails', async () => {
      const dispatchMock = sinon.stub();
      const getStateMock = sinon.stub();

      firestoreAccessorStub.onFirstCall().throws(() => { return new Error('Storage failed with some error'); });

      expect(() => {
        actions.saveGame(getNewGameMetadata())(dispatchMock, getStateMock, undefined);
      }).to.throw();

      // Waits for promises to resolve.
      await Promise.resolve();

      expect(dispatchMock).to.not.have.been.called;
    });
  }); // describe('saveGame')

  describe('addGame', () => {
    it('should return a function to dispatch the addGame action', () => {
      expect(typeof actions.addGame()).to.equal('function');
    });

    it('should dispatch an action to add the team', () => {
      const newGameSaved = getNewGameSaved();
      const dispatchMock = sinon.stub();
      const getStateMock = sinon.stub();

      actions.addGame(newGameSaved)(dispatchMock, getStateMock, undefined);

      expect(dispatchMock).to.have.been.calledWith({
        type: actions.ADD_GAME,
        game: newGameSaved,
      });
    });
  }); // describe('addGame')
}); // describe('Game actions')
