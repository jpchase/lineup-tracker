import * as actions from '@app/actions/game';
import { FormationType } from '@app/models/formation';
import { Game, GameDetail, GameStatus } from '@app/models/game';
import { firebaseRef } from '@app/firebase';
/// <reference path="mock-cloud-firestore.d.ts" />
import * as MockFirebase from 'mock-cloud-firestore';
import { TEST_USER_ID, buildGames, buildRoster, getMockAuthState, getStoredTeam, getStoredTeamData, getStoredPlayer, getStoredPlayerData, MockAuthStateOptions } from '../helpers/test_data';

jest.mock('@app/firebase');

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
      games: {
        games: buildGames(games),
      },
      game: {
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
