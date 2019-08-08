import * as actions from '@app/actions/game';
import { FormationType, Position } from '@app/models/formation';
import { Game, GameDetail, GameStatus, LivePlayer } from '@app/models/game';
import { GameState } from '@app/reducers/game';
import { firebaseRef } from '@app/firebase';
import { DocumentData, Query, QueryDocumentSnapshot, QuerySnapshot } from '@firebase/firestore-types';
/// <reference path="mock-cloud-firestore.d.ts" />
import * as MockFirebase from 'mock-cloud-firestore';
import {
  TEST_USER_ID, buildGames, buildRoster, getMockAuthState,
  getStoredTeam, getStoredTeamData,
  getNewPlayer, getNewPlayerData, getStoredPlayer, getStoredPlayerData
} from '../helpers/test_data';

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

const KEY_GAMES = 'games';
const KEY_ROSTER = 'roster';

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

interface MockStateUpdateFunc {
    (state: GameState): void;
}

function mockGetState(games?: Game[], updateFn?: MockStateUpdateFunc) {
  return jest.fn(() => {
    const mockState = {
      auth: getMockAuthState(),
      games: {
        games: buildGames(games || []),
      },
      game: {
        gameId: '',
        game: undefined,
        detailLoading: false,
        detailFailure: false
      },
      team: undefined
    };
    if (updateFn) {
      updateFn(mockState.game);
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

    it('should use the already loaded game from game detail in state, without retrieving from storage', async () => {
      const dispatchMock = jest.fn();
      const loadedGame: GameDetail = {
        ...getStoredGameDetail(),
        hasDetail: true
      };
      const getStateMock = mockGetState(undefined, (gameState) => {
        gameState.gameId = loadedGame.id;
        gameState.game = loadedGame;
      });

      await actions.getGame(getStoredGame().id)(dispatchMock, getStateMock, undefined);

      expect(firebaseRef.firestore).not.toHaveBeenCalled();

      // The request action is dispatched, regardless.
      expect(dispatchMock).toHaveBeenCalledTimes(2);

      expect(dispatchMock).lastCalledWith(expect.objectContaining({
        type: actions.GET_GAME_SUCCESS,
        game: loadedGame,
      }));
    });

    it('should use the already loaded game from games list in state, without retrieving from storage', async () => {
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

  describe('addNewGamePlayer', () => {
    it('should return a function to dispatch the action', () => {
      expect(typeof actions.addNewGamePlayer()).toBe('function');
    });

    it('should do nothing if new player is missing', () => {
      const dispatchMock = jest.fn();
      const getStateMock = jest.fn();

      actions.addNewGamePlayer()(dispatchMock, getStateMock, undefined);

      expect(getStateMock).not.toBeCalled();

      expect(dispatchMock).not.toBeCalled();
    });

    it('should dispatch an action to add a new player that is unique', () => {
      const dispatchMock = jest.fn();
      const getStateMock = mockGetState(undefined, (gameState) => {
        gameState.gameId = STORED_GAME_ID;
        gameState.game = getStoredGameDetail();
      });

      actions.addNewGamePlayer(getNewPlayer())(dispatchMock, getStateMock, undefined);

      expect(getStateMock).toBeCalled();

      expect(dispatchMock).toBeCalledWith(expect.any(Function));
    });

    it('should do nothing with a new player that is not unique', () => {
      const dispatchMock = jest.fn();
      const getStateMock = mockGetState(undefined, (gameState) => {
        gameState.gameId = STORED_GAME_ID;
        gameState.game = getStoredGameDetail();
      });

      actions.addNewGamePlayer(getStoredPlayer())(dispatchMock, getStateMock, undefined);

      expect(getStateMock).toBeCalled();

      expect(dispatchMock).not.toBeCalled();
    });
  });

  describe('saveGamePlayer', () => {
    it('should return a function to dispatch the action', () => {
      expect(typeof actions.saveGamePlayer()).toBe('function');
    });


    it('should save to storage and dispatch an action to add player', async () => {
      const dispatchMock = jest.fn();

      // const team: Team = getStoredTeam();
      // const getStateMock = mockGetState([team], team, { signedIn: true, userId: TEST_USER_ID });
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
      expect(result.size).toEqual(1);

      const expectedData: any = {
        ...getNewPlayerData()
      };

      let id = '';
      let data: DocumentData = {};
      result.forEach((doc: QueryDocumentSnapshot) => {
        id = doc.id;
        data = doc.data();
      });

      expect(id).toBeTruthy();
      expect(id).toMatch(/[A-Za-z0-9]+/);
      expect(data).toEqual(expectedData);

      // Waits for promises to resolve.
      await Promise.resolve();
      expect(dispatchMock).toBeCalledWith(expect.any(Function));
    });

    it('should not dispatch an action when storage access fails', async () => {
      const dispatchMock = jest.fn();
      const getStateMock = jest.fn();
      firebaseRef.firestore.mockImplementationOnce(() => { throw new Error('Storage failed with some error'); });

      expect(() => {
        actions.saveGamePlayer(getNewPlayer())(dispatchMock, getStateMock, undefined);
      }).toThrow();

      // Waits for promises to resolve.
      await Promise.resolve();

      expect(dispatchMock).not.toBeCalled();
    });
  }); // describe('saveGamePlayer')

  describe('addGamePlayer', () => {
    it('should return a function to dispatch the addGamePlayer action', () => {
      expect(typeof actions.addGamePlayer()).toBe('function');
    });

    it('should dispatch an action to add the player', () => {
      const dispatchMock = jest.fn();
      const getStateMock = jest.fn();

      actions.addGamePlayer(getNewPlayer())(dispatchMock, getStateMock, undefined);

      expect(dispatchMock).toBeCalledWith(expect.objectContaining({
        type: actions.ADD_PLAYER,
        player: getNewPlayer(),
      }));
    });

  }); // describe('addGamePlayer')

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

  describe('applyProposedStarter', () => {
    it('should return a function to dispatch the applyProposedStarter action', () => {
      expect(typeof actions.applyProposedStarter()).toBe('function');
    });

    it('should do nothing if proposed starter is missing', () => {
      const dispatchMock = jest.fn();
      const getStateMock = mockGetState();

      actions.applyProposedStarter()(dispatchMock, getStateMock, undefined);

      expect(dispatchMock).not.toBeCalled();
    });

    it('should dispatch an action to apply the proposed starter', () => {
      const selectedPosition: Position = { id: 'AM1', type: 'AM'};
      const starter: LivePlayer = {
        ...getStoredPlayer(),
        currentPosition: { ...selectedPosition }
      }

      const dispatchMock = jest.fn();
      const getStateMock = mockGetState(undefined, (gameState) => {
        gameState.selectedPlayer = 'foo';
        gameState.selectedPosition = { id: 'id', type: 'foo' };
        gameState.proposedStarter = starter;
      });

      actions.applyProposedStarter()(dispatchMock, getStateMock, undefined);

      expect(dispatchMock).toBeCalledWith(expect.objectContaining({
        type: actions.APPLY_STARTER
      }));
    });
  }); // describe('applyProposedStarter')

  describe('cancelProposedStarter', () => {
    it('should return a function to dispatch the cancelProposedStarter action', () => {
      expect(typeof actions.cancelProposedStarter()).toBe('function');
    });

    it('should do nothing if proposed starter is missing', () => {
      const dispatchMock = jest.fn();
      const getStateMock = mockGetState();

      actions.cancelProposedStarter()(dispatchMock, getStateMock, undefined);

      expect(dispatchMock).not.toBeCalled();
    });

    it('should dispatch an action to cancel the proposed starter', () => {
      const selectedPosition: Position = { id: 'AM1', type: 'AM'};
      const starter: LivePlayer = {
        ...getStoredPlayer(),
        currentPosition: { ...selectedPosition }
      }

      const dispatchMock = jest.fn();
      const getStateMock = mockGetState(undefined, (gameState) => {
        gameState.selectedPlayer = 'foo';
        gameState.selectedPosition = { id: 'id', type: 'foo' };
        gameState.proposedStarter = starter;
      });

      actions.cancelProposedStarter()(dispatchMock, getStateMock, undefined);

      expect(dispatchMock).toBeCalledWith(expect.objectContaining({
        type: actions.CANCEL_STARTER
      }));
    });
  }); // describe('cancelProposedStarter')

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
  }); // describe('startGame')

  describe('selectPlayer', () => {
    it('should return a function to dispatch the selectPlayer action', () => {
      expect(typeof actions.selectPlayer()).toBe('function');
    });

    it('should do nothing if player input is missing', () => {
      const dispatchMock = jest.fn();
      const getStateMock = jest.fn();

      actions.selectPlayer()(dispatchMock, getStateMock, undefined);

      expect(getStateMock).not.toBeCalled();

      expect(dispatchMock).not.toBeCalled();
    });

    it('should dispatch an action to select the player', () => {
      const dispatchMock = jest.fn();
      const getStateMock = jest.fn();

      actions.selectPlayer('player id')(dispatchMock, getStateMock, undefined);

      expect(dispatchMock).toBeCalledWith(expect.objectContaining({
        type: actions.SELECT_PLAYER,
        playerId: 'player id'
      }));
    });
  }); // describe('selectPlayer')

  describe('selectPosition', () => {
    it('should return a function to dispatch the selectPlayer action', () => {
      expect(typeof actions.selectPosition()).toBe('function');
    });

    it('should do nothing if position input is missing', () => {
      const dispatchMock = jest.fn();
      const getStateMock = jest.fn();

      actions.selectPosition()(dispatchMock, getStateMock, undefined);

      expect(getStateMock).not.toBeCalled();

      expect(dispatchMock).not.toBeCalled();
    });

    it('should dispatch an action to select the position', () => {
      const dispatchMock = jest.fn();
      const getStateMock = jest.fn();

      const position: Position = { id: 'AM1', type: 'AM' };
      actions.selectPosition(position)(dispatchMock, getStateMock, undefined);

      expect(dispatchMock).toBeCalledWith(expect.objectContaining({
        type: actions.SELECT_POSITION,
        position: position
      }));
    });
  }); // describe('selectPosition')

}); // describe('Game actions')
