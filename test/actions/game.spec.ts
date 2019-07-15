import * as actions from '@app/actions/game';
import { FormationType } from '@app/models/formation';
import { Game, GameDetail, GameMetadata, GameStatus } from '@app/models/game';
import { firebaseRef } from '@app/firebase';
import { DocumentData, Query, QueryDocumentSnapshot, QuerySnapshot } from '@firebase/firestore-types';
/// <reference path="mock-cloud-firestore.d.ts" />
import * as MockFirebase from 'mock-cloud-firestore';
import { TEST_USER_ID, buildGames, buildRoster, getMockAuthState, getMockTeamState, getPublicTeam, getStoredTeam, getStoredTeamData, getStoredPlayer, getStoredPlayerData, MockAuthStateOptions } from '../helpers/test_data';

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

function getTeamRoster() {
  return buildRoster([getStoredPlayer()]);
};

function getStoredGameDetail(): GameDetail {
  return {
    ...getStoredGame(),
    roster: getTeamRoster()
  };
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

  describe('getGame', () => {
    it('should return a function to dispatch the getGame action', () => {
      expect(typeof actions.getGame()).toBe('function');
    });

    it('should do nothing if game id is missing', () => {
      const dispatchMock = jest.fn();
      const getStateMock = jest.fn();

      actions.getGame()(dispatchMock, getStateMock, undefined);

      expect(firebaseRef.firestore).not.toHaveBeenCalled();

      expect(dispatchMock).not.toBeCalled();
    });

    it('should dispatch success action with game returned from storage', async () => {
      const dispatchMock = jest.fn();
      const getStateMock = mockGetState([]);

      const gameId = getStoredGame().id;
      await actions.getGame(gameId)(dispatchMock, getStateMock, undefined);

      expect(firebaseRef.firestore).toHaveBeenCalledTimes(2);

      expect(dispatchMock).toHaveBeenCalledTimes(2);

      // Checks that first dispatch was the request action
      expect(dispatchMock.mock.calls[0]).toEqual([expect.objectContaining({
        type: actions.GET_GAME_REQUEST,
        gameId: gameId,
      })]);

      expect(dispatchMock).lastCalledWith(expect.objectContaining({
        type: actions.GET_GAME_SUCCESS,
        game: getStoredGameDetail(),
      }));
    });

    it('should use the already loaded game, without retrieving from storage', async () => {
      const dispatchMock = jest.fn();
      const loadedGame: GameDetail = {
        ...getStoredGameDetail(),
        hasDetail: true
      };
      const getStateMock = mockGetState([loadedGame]);

      await actions.getGame(getStoredGame().id)(dispatchMock, getStateMock, undefined);

      expect(firebaseRef.firestore).not.toHaveBeenCalled();

      // The request action is dispatched, regardless.
      expect(dispatchMock).toHaveBeenCalledTimes(2);

      expect(dispatchMock).lastCalledWith(expect.objectContaining({
        type: actions.GET_GAME_SUCCESS,
        game: loadedGame,
      }));
    });

    it('should retrieve from storage when already loaded game is missing detail', async () => {
      const dispatchMock = jest.fn();
      const getStateMock = mockGetState([getStoredGame()]);

      await actions.getGame(getStoredGame().id)(dispatchMock, getStateMock, undefined);

      expect(firebaseRef.firestore).toHaveBeenCalledTimes(2);

      // The request action is dispatched, regardless.
      expect(dispatchMock).toHaveBeenCalledTimes(2);

      expect(dispatchMock).lastCalledWith(expect.objectContaining({
        type: actions.GET_GAME_SUCCESS,
        game: getStoredGameDetail(),
      }));
    });

    it('should retrieve team roster from storage when game roster is empty', async () => {
      const dispatchMock = jest.fn();
      const getStateMock = mockGetState([]);

      await actions.getGame(OTHER_STORED_GAME_ID)(dispatchMock, getStateMock, undefined);

      expect(firebaseRef.firestore).toHaveBeenCalledTimes(3);

      // The request action is dispatched, regardless.
      expect(dispatchMock).toHaveBeenCalledTimes(2);

      const storedGame: GameDetail = {
        ...getOtherStoredGameWithoutDetail(),
        roster: {}
      }
      expect(dispatchMock).lastCalledWith(expect.objectContaining({
        type: actions.GET_GAME_SUCCESS,
        game: storedGame,
        teamRoster: getTeamRoster()
      }));
    });

    it('should fail when game not found in storage', async () => {
      const dispatchMock = jest.fn();
      const getStateMock = mockGetState([]);

      const gameId = 'nosuchgame';
      await actions.getGame(gameId)(dispatchMock, getStateMock, undefined);

      expect(dispatchMock).toHaveBeenCalledTimes(2);

      // Checks that first dispatch was the request action
      expect(dispatchMock.mock.calls[0]).toEqual([expect.objectContaining({
        type: actions.GET_GAME_REQUEST,
        gameId: gameId,
      })]);

      expect(dispatchMock).lastCalledWith(expect.objectContaining({
        type: actions.GET_GAME_FAIL,
        error: `Error: Game not found: ${gameId}`,
      }));
    });

    it('should dispatch only request action when storage access fails', async () => {
      const dispatchMock = jest.fn();
      const getStateMock = jest.fn();
      const gameId = getStoredGame().id;

      firebaseRef.firestore.mockImplementationOnce(() => { throw new Error('Storage failed with some error'); });

      expect(() => {
        actions.getGame(gameId)(dispatchMock, getStateMock, undefined);
      }).toThrow();

      expect(dispatchMock).toHaveBeenCalledTimes(1);

      // Checks that first dispatch was the request action
      expect(dispatchMock).lastCalledWith(expect.objectContaining({
        type: actions.GET_GAME_REQUEST,
        gameId: gameId,
      }));
    });

  }); // describe('getGame')

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

  describe('markCaptainsDone', () => {
    it('should return a function to dispatch the markCaptainsDone action', () => {
      expect(typeof actions.markCaptainsDone()).toBe('function');
    });

    it('should dispatch an action to mark the captains as done', () => {
      const dispatchMock = jest.fn();
      const getStateMock = jest.fn();

      actions.markCaptainsDone()(dispatchMock, getStateMock, undefined);

      expect(dispatchMock).toBeCalledWith(expect.objectContaining({
        type: actions.CAPTAINS_DONE
      }));
    });
  }); // describe('markCaptainsDone')

  describe('markRosterDone', () => {
    it('should return a function to dispatch the markRosterDone action', () => {
      expect(typeof actions.markRosterDone()).toBe('function');
    });

    it('should dispatch an action to mark the roster as done', () => {
      const dispatchMock = jest.fn();
      const getStateMock = jest.fn();

      actions.markRosterDone()(dispatchMock, getStateMock, undefined);

      expect(dispatchMock).toBeCalledWith(expect.objectContaining({
        type: actions.ROSTER_DONE
      }));
    });
  }); // describe('markRosterDone')

  describe('markStartersDone', () => {
    it('should return a function to dispatch the markStartersDone action', () => {
      expect(typeof actions.markStartersDone()).toBe('function');
    });

    it('should dispatch an action to mark the starters as done', () => {
      const dispatchMock = jest.fn();
      const getStateMock = jest.fn();

      actions.markStartersDone()(dispatchMock, getStateMock, undefined);

      expect(dispatchMock).toBeCalledWith(expect.objectContaining({
        type: actions.STARTERS_DONE
      }));
    });
  }); // describe('markStartersDone')

  describe('setFormation', () => {
    it('should return a function to dispatch the setFormation action', () => {
      expect(typeof actions.setFormation()).toBe('function');
    });

    it('should do nothing if formation input is missing', () => {
      const dispatchMock = jest.fn();
      const getStateMock = jest.fn();

      actions.setFormation()(dispatchMock, getStateMock, undefined);

      expect(getStateMock).not.toBeCalled();

      expect(dispatchMock).not.toBeCalled();
    });

    it('should dispatch an action to set the formation', () => {
      const dispatchMock = jest.fn();
      const getStateMock = jest.fn();

      actions.setFormation(FormationType.F4_3_3)(dispatchMock, getStateMock, undefined);

      expect(dispatchMock).toBeCalledWith(expect.objectContaining({
        type: actions.SET_FORMATION,
        formationType: FormationType.F4_3_3,
      }));
    });
  }); // describe('setFormation')

  describe('startGame', () => {
    it('should return a function to dispatch the startGame action', () => {
      expect(typeof actions.startGame()).toBe('function');
    });

    it('should dispatch an action to move the game to start status', () => {
      const dispatchMock = jest.fn();
      const getStateMock = jest.fn();

      actions.startGame()(dispatchMock, getStateMock, undefined);

      expect(dispatchMock).toBeCalledWith(expect.objectContaining({
        type: actions.START_GAME
      }));

      // TODO: Test that game is saved to storage
    });
  }); // describe('setFormation')

}); // describe('Game actions')
