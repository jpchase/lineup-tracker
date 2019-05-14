import * as actions from '@app/actions/game';
import { Game, StoredGameData } from '@app/models/game';
import { firebaseRef } from '@app/firebase';
import { Query, QuerySnapshot } from '@firebase/firestore-types';
/// <reference path="mock-cloud-firestore.d.ts" />
import * as MockFirebase from 'mock-cloud-firestore';
import { TEST_USER_ID, buildGames, getMockAuthState, getPublicTeam, getStoredTeam, MockAuthStateOptions } from '../helpers/test_data';

jest.mock('@app/firebase');

const PUBLIC_GAME_ID = 'pg1';

function getPublicGameData(): StoredGameData {
  return {
    teamId: getPublicTeam().id,
    name: 'Public G',
    date: new Date(2016, 1, 10),
    opponent: 'Public Opponent'
  };
};

function getPublicGame(): Game {
  return { id: PUBLIC_GAME_ID, ...getPublicGameData() };
};

function getStoredGameData(): StoredGameData {
  return {
    teamId: getStoredTeam().id,
    name: 'Stored G',
    date: new Date(2016, 1, 10),
    opponent: 'Stored Game Opponent'
  };
};

const STORED_GAME_ID = 'sg1';
function getStoredGame(): Game {
  return { id: STORED_GAME_ID, ...getStoredGameData() };
};


function getNewGameData(): StoredGameData {
  return {
    teamId: getStoredTeam().id,
    name: 'New G',
    date: new Date(2016, 4, 6),
    opponent: 'New Game Opponent'
  };
};

// New game created by the UI does not have an ID until added to storage.
function getNewGame(): Game {
  return { id: '', ...getNewGameData() };
}
const newGameSaved: Game = {
  ...getNewGame(), id: 'theGameId'
};

const fixtureData = {
  __collection__: {
    games: {
      __doc__: {
        [STORED_GAME_ID]: {
          ...getStoredGameData(),
          owner_uid: TEST_USER_ID,
        },
        sg2: {
          ...getStoredGameData(),
          teamId: 'otherTeam',
          owner_uid: TEST_USER_ID,
        },
        [PUBLIC_GAME_ID]: {
          ...getPublicGameData(),
          public: true,
        },
      }
    }
  }
};

function mockGetState(games: Game[], options?: MockAuthStateOptions) {
  return jest.fn(() => {
    return {
      auth: getMockAuthState(options),
      game: {
        games: buildGames(games),
        gameId: '',
        game: undefined
      }
    };
  });
}


describe('Game actions', () => {
  const mockFirebase = new MockFirebase(fixtureData);

  beforeEach(() => {
    jest.resetAllMocks();

    firebaseRef.firestore.mockImplementation(() => {
      return mockFirebase.firestore();
    });
  });

  describe('getGames', () => {
    it('should return a function to dispatch the getGames action', () => {
      expect( typeof actions.getGames() ).toBe('function');
    });

    it('should do nothing if team id is missing', () => {
      const dispatchMock = jest.fn();
      const getStateMock = jest.fn();

      actions.getGames()(dispatchMock, getStateMock, undefined);

      expect(firebaseRef.firestore).not.toHaveBeenCalled();

      expect(dispatchMock).not.toBeCalled();
    });

    it('should dispatch an action with owned games returned from storage', async () => {
      const dispatchMock = jest.fn();
      const getStateMock = mockGetState([], { signedIn: true, userId: TEST_USER_ID })

      actions.getGames(getStoredTeam().id)(dispatchMock, getStateMock, undefined);

      // Waits for promises to resolve.
      await Promise.resolve();

      expect(dispatchMock).toBeCalledWith(expect.objectContaining({
        type: actions.GET_GAMES,
        games: buildGames([getStoredGame()]),
      }));
    });

    it('should dispatch an action with public games when not signed in', async () => {
      const dispatchMock = jest.fn();
      const getStateMock = mockGetState([], { signedIn: false })

      actions.getGames(getPublicTeam().id)(dispatchMock, getStateMock, undefined);

      // Waits for promises to resolve.
      await Promise.resolve();

      expect(dispatchMock).toBeCalledWith(expect.objectContaining({
        type: actions.GET_GAMES,
        games: buildGames([getPublicGame()]),
      }));
    });

    it('should not dispatch an action when storage access fails', async () => {
      const dispatchMock = jest.fn();
      const getStateMock = jest.fn();

      firebaseRef.firestore.mockImplementationOnce(() => { throw new Error('Storage failed with some error'); });

      expect(() => {
        actions.getGames(getStoredTeam().id)(dispatchMock, getStateMock, undefined);
      }).toThrow();

      // Waits for promises to resolve.
      await Promise.resolve();

      expect(dispatchMock).not.toBeCalled();
    });

  }); // describe('getGames')

  describe('addNewGame', () => {
    it('should return a function to dispatch the action', () => {
      expect(typeof actions.addNewGame()).toBe('function');
    });

    it('should do nothing if new game is missing', () => {
      const dispatchMock = jest.fn();
      const getStateMock = jest.fn();

      actions.addNewGame()(dispatchMock, getStateMock, undefined);

      expect(getStateMock).not.toBeCalled();

      expect(dispatchMock).not.toBeCalled();
    });

    it('should dispatch an action to add a new game that is unique', () => {
      const dispatchMock = jest.fn();
      const getStateMock = mockGetState([getStoredGame()]);

      actions.addNewGame(getNewGame())(dispatchMock, getStateMock, undefined);

      expect(getStateMock).toBeCalled();

      expect(dispatchMock).toBeCalledWith(expect.any(Function));
    });

    it('should do nothing with a new game that is not unique', () => {
      const dispatchMock = jest.fn();
      const getStateMock = mockGetState([newGameSaved]);

      actions.addNewGame(getNewGame())(dispatchMock, getStateMock, undefined);

      expect(getStateMock).toBeCalled();

      expect(dispatchMock).not.toBeCalled();
    });
  });  // describe('addNewGame')

  describe('saveGame', () => {
    it('should return a function to dispatch the action', () => {
      expect(typeof actions.saveGame()).toBe('function');
    });

    it('should dispatch an action to add game', async () => {
      const dispatchMock = jest.fn();
      const getStateMock = jest.fn();

      actions.saveGame(getNewGame())(dispatchMock, getStateMock, undefined);

      // Waits for promises to resolve.
      await Promise.resolve();

      // Checks that the new team was saved to the database.
      const query: Query = mockFirebase.firestore().collection('games').where('name', '==', newGameSaved.name);
      const result: QuerySnapshot = await query.get();
      expect(result.size).toEqual(1);

      // Waits for promises to resolve.
      await Promise.resolve();
      expect(dispatchMock).toBeCalledWith(expect.any(Function));
    });

    it('should not dispatch an action when storage access fails', async () => {
      const dispatchMock = jest.fn();
      const getStateMock = jest.fn();
      firebaseRef.firestore.mockImplementationOnce(() => { throw new Error('Storage failed with some error'); });

      expect(() => {
        actions.saveGame(getNewGame())(dispatchMock, getStateMock, undefined);
      }).toThrow();

      // Waits for promises to resolve.
      await Promise.resolve();

      expect(dispatchMock).not.toBeCalled();
    });
  }); // describe('saveGame')

  describe('addGame', () => {
    it('should return a function to dispatch the addGame action', () => {
      expect(typeof actions.addGame()).toBe('function');
    });

    it('should dispatch an action to add the team', () => {
      const dispatchMock = jest.fn();
      const getStateMock = jest.fn();

      actions.addGame(newGameSaved)(dispatchMock, getStateMock, undefined);

      expect(dispatchMock).toBeCalledWith(expect.objectContaining({
        type: actions.ADD_GAME,
        game: newGameSaved,
      }));
    });
  }); // describe('addGame')

}); // describe('Game actions')
