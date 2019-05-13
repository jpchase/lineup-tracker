import * as actions from '@app/actions/game';
import { Game, StoredGameData } from '@app/models/game';
import { firebaseRef } from '@app/firebase';
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
  }
};

function getPublicGame(): Game {
  return { id: PUBLIC_GAME_ID, ...getPublicGameData() }
};

function getStoredGameData(): StoredGameData {
  return {
    teamId: getStoredTeam().id,
    name: 'Stored G',
    date: new Date(2016, 1, 10),
    opponent: 'Stored Game Opponent'
  }
};

const STORED_GAME_ID = 'sg1';
function getStoredGame(): Game {
  return { id: STORED_GAME_ID, ...getStoredGameData() }
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
}); // describe('Game actions')
