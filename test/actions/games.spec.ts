import * as actions from '@app/actions/games';
import { Game, GameMetadata, GameStatus } from '@app/models/game';
import { firebaseRef } from '@app/firebase';
import { DocumentData, Query, QueryDocumentSnapshot, QuerySnapshot } from '@firebase/firestore-types';
/// <reference path="mock-cloud-firestore.d.ts" />
import * as MockFirebase from 'mock-cloud-firestore';
import {
  TEST_USER_ID,
  buildGames,
  getMockAuthState, getMockTeamState,
  getPublicTeam, getStoredTeam, getStoredTeamData,
  getStoredPlayerData,
  MockAuthStateOptions
} from '../helpers/test_data';

jest.mock('@app/firebase');

const PUBLIC_GAME_ID = 'pg1';

function getPublicGameData(): any {
  return {
    teamId: getPublicTeam().id,
    status: GameStatus.Done,
    name: 'Public G',
    date: new Date(2016, 1, 10),
    opponent: 'Public Opponent'
  };
};

function getPublicGame(): Game {
  return { id: PUBLIC_GAME_ID, ...getPublicGameData() };
};

function getStoredGameData(): any {
  return {
    teamId: getStoredTeam().id,
    status: GameStatus.New,
    name: 'Stored G',
    date: new Date(2016, 1, 10),
    opponent: 'Stored Game Opponent'
  };
};

const STORED_GAME_ID = 'sg1';
function getStoredGame(): Game {
  return { id: STORED_GAME_ID, ...getStoredGameData() };
};
const OTHER_STORED_GAME_ID = 'sg2';
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

const fixtureData = {
  __collection__: {
    games: {
      __doc__: {
        [STORED_GAME_ID]: {
          ...getStoredGameData(),
          owner_uid: TEST_USER_ID,

          __collection__: {
            roster: {
              __doc__: {
                sp1: {
                  ...getStoredPlayerData()
                }
              }
            }
          }
        },
        [OTHER_STORED_GAME_ID]: {
          ...getStoredGameData(),
          owner_uid: TEST_USER_ID,
        },
        sgOther: {
          ...getStoredGameData(),
          teamId: 'otherTeam',
          owner_uid: TEST_USER_ID,
        },
        [PUBLIC_GAME_ID]: {
          ...getPublicGameData(),
          public: true,
        },
      }
    },
    teams: {
      __doc__: {
        st1: {
          ...getStoredTeamData(),
          owner_uid: TEST_USER_ID,

          __collection__: {
            roster: {
              __doc__: {
                sp1: {
                  ...getStoredPlayerData()
                }
              }
            }
          }
        },
      }
    }
  }
};

function mockGetState(games: Game[], options?: MockAuthStateOptions, teamState?: any) {
  return jest.fn(() => {
    const mockState = {
      auth: getMockAuthState(options),
      game: {
        games: buildGames(games),
        gameId: '',
        game: undefined,
        detailLoading: false,
        detailFailure: false
      },
      team: undefined
    };
    if (teamState) {
      mockState.team = teamState;
    }
    return mockState;
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

    it('should dispatch an action with owned games for team returned from storage', async () => {
      const dispatchMock = jest.fn();
      const getStateMock = mockGetState([], { signedIn: true, userId: TEST_USER_ID });

      actions.getGames(getStoredTeam().id)(dispatchMock, getStateMock, undefined);

      // Waits for promises to resolve.
      await Promise.resolve();

      expect(dispatchMock).toBeCalledWith(expect.objectContaining({
        type: actions.GET_GAMES,
        games: buildGames([getStoredGame(), getOtherStoredGameWithoutDetail()]),
      }));
    });

    it('should dispatch an action with public games when not signed in', async () => {
      const dispatchMock = jest.fn();
      const getStateMock = mockGetState([], { signedIn: false });

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

      actions.addNewGame(getNewGameMetadata())(dispatchMock, getStateMock, undefined);

      expect(getStateMock).toBeCalled();

      expect(dispatchMock).toBeCalledWith(expect.any(Function));
    });

    it('should do nothing with a new game that is not unique', () => {
      const dispatchMock = jest.fn();
      const getStateMock = mockGetState([getNewGameSaved()]);

      actions.addNewGame(getNewGameMetadata())(dispatchMock, getStateMock, undefined);

      expect(getStateMock).toBeCalled();

      expect(dispatchMock).not.toBeCalled();
    });
  });  // describe('addNewGame')

  describe('saveGame', () => {
    it('should return a function to dispatch the action', () => {
      expect(typeof actions.saveGame()).toBe('function');
    });

    it('should save to storage and dispatch an action to add game', async () => {
      const dispatchMock = jest.fn();
      const getStateMock = mockGetState([], { signedIn: true, userId: TEST_USER_ID }, getMockTeamState([], getStoredTeam()));

      actions.saveGame(getNewGameMetadata())(dispatchMock, getStateMock, undefined);

      // Waits for promises to resolve.
      await Promise.resolve();

      // Checks that the new team was saved to the database.
      const newGame = getNewGameMetadata();
      const query: Query = mockFirebase.firestore().collection('games').where('name', '==', newGame.name);
      const result: QuerySnapshot = await query.get();
      expect(result.size).toEqual(1);

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

      expect(id).toBeTruthy();
      expect(id).toMatch(/[A-Za-z0-9]+/);
      expect(data).toEqual(expect.objectContaining(expectedData));
      expect(data.date.toDate()).toEqual(newGame.date);

      // Waits for promises to resolve.
      await Promise.resolve();
      expect(dispatchMock).toBeCalledWith(expect.any(Function));
    });

    it('should not dispatch an action when storage access fails', async () => {
      const dispatchMock = jest.fn();
      const getStateMock = jest.fn();
      firebaseRef.firestore.mockImplementationOnce(() => { throw new Error('Storage failed with some error'); });

      expect(() => {
        actions.saveGame(getNewGameMetadata())(dispatchMock, getStateMock, undefined);
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
      const newGameSaved = getNewGameSaved();
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
