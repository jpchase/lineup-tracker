import { FormationType, Position } from '@app/models/formation';
import {
  GameDetail, GameStatus,
  LivePlayer,
  SetupStatus, SetupSteps, SetupTask
} from '@app/models/game';
import { Player, PlayerStatus } from '@app/models/player';
import {
  APPLY_STARTER,
  CANCEL_STARTER,
  GET_GAME_REQUEST,
  GET_GAME_SUCCESS,
  GET_GAME_FAIL,
  CAPTAINS_DONE,
  COPY_ROSTER_REQUEST,
  COPY_ROSTER_SUCCESS,
  COPY_ROSTER_FAIL,
  ADD_PLAYER,
  ROSTER_DONE,
  STARTERS_DONE,
  START_GAME,
  SET_FORMATION,
  SELECT_PLAYER,
  SELECT_POSITION
} from '@app/actions/game-types';
import game from '@app/reducers/game';
import { GameState } from '@app/reducers/game';
import {
  getFakeAction,
  getNewGame, getNewGameDetail, getNewGameWithLiveDetail,
  buildRoster, getNewPlayer, getStoredPlayer, getStoredGame
} from '../helpers/test_data';

const GAME_INITIAL_STATE: GameState = {
  gameId: '',
  game: undefined,
  selectedPlayer: undefined,
  selectedPosition: undefined,
  proposedStarter: undefined,
  detailLoading: false,
  detailFailure: false,
  rosterLoading: false,
  rosterFailure: false,
  error: ''
};

function buildNewGameDetailAndRoster(): GameDetail {
  return getNewGameWithLiveDetail(buildRoster([getStoredPlayer()]));
}

function buildSetupTasks(): SetupTask[] {
  return [
    {
      step: SetupSteps.Formation,
      status: SetupStatus.Active
    },
    {
      step: SetupSteps.Roster,
      status: SetupStatus.Pending
    },
    {
      step: SetupSteps.Captains,
      status: SetupStatus.Pending
    },
    {
      step: SetupSteps.Starters,
      status: SetupStatus.Pending
    }
  ]
}

describe('Games reducer', () => {

  it('should return the initial state', () => {
    expect(
      game(GAME_INITIAL_STATE, getFakeAction())
      ).toEqual(GAME_INITIAL_STATE);
  });

  describe('GET_GAME_REQUEST', () => {
    it('should set game id and loading flag', () => {
      const gameId = 'idfornewgame';
      const newState = game(GAME_INITIAL_STATE, {
        type: GET_GAME_REQUEST,
        gameId: gameId
      });

      expect(newState).toEqual(expect.objectContaining({
        gameId: gameId,
        detailLoading: true,
        detailFailure: false
      }));

      expect(newState).not.toBe(GAME_INITIAL_STATE);
      expect(newState.gameId).not.toBe(GAME_INITIAL_STATE.gameId);
    });
  }); // describe('GET_GAME_REQUEST')

  describe('GET_GAME_SUCCESS', () => {
    it('should set game to given game with full detail', () => {
      const existingGame = getStoredGame();
      const inputGame: GameDetail = {
        ...existingGame,
        roster: buildRoster([getStoredPlayer()])
      };
      const newState = game(GAME_INITIAL_STATE, {
        type: GET_GAME_SUCCESS,
        game: inputGame
      });

      const gameDetail: GameDetail = {
        ...existingGame,
        hasDetail: true,
        roster: buildRoster([getStoredPlayer()])
      };

      expect(newState).toEqual(expect.objectContaining({
        game: gameDetail,
        // TODO: Ensure games state has latest game detail
        // games: buildGames([gameDetail]),
        detailLoading: false,
        detailFailure: false
      }));

      expect(newState).not.toBe(GAME_INITIAL_STATE);
      expect(newState.game).not.toBe(GAME_INITIAL_STATE.game);
    });

    it('should initialize detail when game roster is empty', () => {
      const currentGame = getNewGame();
      const inputGame: GameDetail = {
        ...currentGame,
        roster: {}
      };
      const newState = game(GAME_INITIAL_STATE, {
        type: GET_GAME_SUCCESS,
        game: inputGame
      });

      const gameDetail: GameDetail = {
        ...currentGame,
        hasDetail: true,
        roster: {},
        liveDetail: {
          id: currentGame.id,
          setupTasks: buildSetupTasks()
        }
      };

      expect(newState).toEqual(expect.objectContaining({
        game: gameDetail,
        // TODO: Ensure games state has latest game detail
        // games: buildGames([gameDetail]),
        detailLoading: false,
        detailFailure: false
      }));

      expect(newState).not.toBe(GAME_INITIAL_STATE);
      expect(newState.game).not.toBe(GAME_INITIAL_STATE.game);
    });

    it('should initialize live detail for new game', () => {
      const currentGame = getNewGame();
      const inputGame: GameDetail = {
        ...currentGame,
        roster: buildRoster([getStoredPlayer()])
      };
      const newState = game(GAME_INITIAL_STATE, {
        type: GET_GAME_SUCCESS,
        game: inputGame
      });

      const gameDetail: GameDetail = {
        ...currentGame,
        hasDetail: true,
        roster: buildRoster([getStoredPlayer()]),
        liveDetail: {
          id: currentGame.id,
          setupTasks: buildSetupTasks()
        }
      };

      expect(newState).toEqual(expect.objectContaining({
        game: gameDetail,
        // TODO: Ensure games state has latest game detail
        // games: buildGames([gameDetail]),
        detailLoading: false,
        detailFailure: false
      }));

      expect(newState).not.toBe(GAME_INITIAL_STATE);
      expect(newState.game).not.toBe(GAME_INITIAL_STATE.game);
    });
  }); // describe('GET_GAME_SUCCESS')

  describe('GET_GAME_FAIL', () => {
    it('should set failure flag and error message', () => {

      const newState = game(GAME_INITIAL_STATE, {
        type: GET_GAME_FAIL,
        error: 'What a game failure!'
      });

      expect(newState).toEqual(expect.objectContaining({
        error: 'What a game failure!',
        detailLoading: false,
        detailFailure: true
      }));

      expect(newState).not.toBe(GAME_INITIAL_STATE);
      expect(newState.error).not.toBe(GAME_INITIAL_STATE.error);
    });
  }); // describe('GET_GAME_FAIL')

  describe('SET_FORMATION', () => {

    it('should set formation type and update setup tasks to mark formation complete', () => {
      const currentGame = getNewGameWithLiveDetail(undefined, buildSetupTasks());
      const state: GameState = {
        ...GAME_INITIAL_STATE,
        game: {
          ...currentGame
        }
      };

      const newState = game(state, {
        type: SET_FORMATION,
        formationType: FormationType.F4_3_3
      });

      const updatedTasks = buildSetupTasks();
      updatedTasks[SetupSteps.Formation].status = SetupStatus.Complete;
      updatedTasks[SetupSteps.Roster].status = SetupStatus.Active;

      const gameDetail = getNewGameWithLiveDetail(undefined, updatedTasks);
      gameDetail.formation = { type: FormationType.F4_3_3 };

      expect(newState).toEqual(expect.objectContaining({
        game: gameDetail,
      }));

      expect(newState).not.toBe(state);
      expect(newState.game).not.toBe(state.game);
      expect(newState.game!.liveDetail).not.toBe(state.game!.liveDetail);
    });
  }); // describe('SET_FORMATION')

  describe('CAPTAINS_DONE', () => {

    it('should update setup tasks to mark captains complete and next active', () => {
      const currentGame = getNewGameWithLiveDetail(undefined, buildSetupTasks());
      const state: GameState = {
        ...GAME_INITIAL_STATE,
        game: {
          ...currentGame
        }
      };

      const newState = game(state, {
        type: CAPTAINS_DONE
      });

      const updatedTasks = buildSetupTasks();
      updatedTasks[SetupSteps.Captains].status = SetupStatus.Complete;
      updatedTasks[SetupSteps.Starters].status = SetupStatus.Active;

      const gameDetail = getNewGameWithLiveDetail(undefined, updatedTasks);

      expect(newState).toEqual(expect.objectContaining({
        game: gameDetail,
      }));

      expect(newState).not.toBe(state);
      expect(newState.game).not.toBe(state.game);
      expect(newState.game!.liveDetail).not.toBe(state.game!.liveDetail);
    });
  }); // describe('CAPTAINS_DONE')

  describe('COPY_ROSTER_REQUEST', () => {
    it('should set copying flag', () => {
      const gameId = 'agameid';
      const newState = game(GAME_INITIAL_STATE, {
        type: COPY_ROSTER_REQUEST,
        gameId: gameId
      });

      expect(newState).toEqual(expect.objectContaining({
        gameId: gameId,
        rosterLoading: true,
        rosterFailure: false
      }));

      expect(newState).not.toBe(GAME_INITIAL_STATE);
      expect(newState.gameId).not.toBe(GAME_INITIAL_STATE.gameId);
    });
  }); // describe('COPY_ROSTER_REQUEST')

  describe('COPY_ROSTER_SUCCESS', () => {
    let currentState: GameState = GAME_INITIAL_STATE;
    let currentGame = getNewGame();

    beforeEach(() => {
      currentState = {
        ...GAME_INITIAL_STATE,
        rosterLoading: true,
        game: {
          ...currentGame,
          hasDetail: true,
          roster: {}
        }
      };
    });

    it('should only update flags when roster already set', () => {
      currentState.game!.roster = buildRoster([getStoredPlayer()]);

      const newState = game(currentState, {
        type: COPY_ROSTER_SUCCESS,
        gameId: currentState.game!.id
      });

      const gameDetail: GameDetail = {
        ...currentState.game as GameDetail
      };

      expect(newState).toEqual(expect.objectContaining({
        game: gameDetail,
        rosterLoading: false,
        rosterFailure: false
      }));

      expect(newState).not.toBe(currentState);
      expect(newState.game).toBe(currentState.game);
      expect(newState.game!.roster).toBe(currentState.game!.roster);
    });

    it('should set roster and update flags', () => {
      const rosterPlayers = [getStoredPlayer()];

      expect(currentState.game!.roster).toEqual({});

      const newState = game(currentState, {
        type: COPY_ROSTER_SUCCESS,
        gameId: currentState.game!.id,
        gameRoster: buildRoster(rosterPlayers)
      });

      const gameDetail: GameDetail = {
        ...currentGame,
        hasDetail: true,
        roster: buildRoster(rosterPlayers)
      };

      expect(newState).toEqual(expect.objectContaining({
        game: gameDetail,
        rosterLoading: false,
        rosterFailure: false
      }));

      expect(newState).not.toBe(currentState);
      expect(newState.game).not.toBe(currentState.game);
      expect(newState.game!.roster).not.toBe(currentState.game!.roster);
    });
  }); // describe('COPY_ROSTER_SUCCESS')

  describe('COPY_ROSTER_FAIL', () => {
    it('should set failure flag and error message', () => {

      const newState = game(GAME_INITIAL_STATE, {
        type: COPY_ROSTER_FAIL,
        error: 'What a roster failure!'
      });

      expect(newState).toEqual(expect.objectContaining({
        error: 'What a roster failure!',
        rosterLoading: false,
        rosterFailure: true
      }));

      expect(newState).not.toBe(GAME_INITIAL_STATE);
      expect(newState.error).not.toBe(GAME_INITIAL_STATE.error);
    });
  }); // describe('COPY_ROSTER_FAIL')

  describe('ADD_PLAYER', () => {
    let newPlayer: Player;
    let existingPlayer: Player;
    let currentState: GameState = GAME_INITIAL_STATE;

    beforeEach(() => {
      newPlayer = getNewPlayer();
      existingPlayer = getStoredPlayer();

      currentState = {
        ...GAME_INITIAL_STATE,
        game: {
          ...getNewGameWithLiveDetail(undefined, buildSetupTasks())
        }
      };
    });

    it('should add new player to empty roster', () => {
      const newState = game(currentState, {
        type: ADD_PLAYER,
        player: newPlayer
      });

      expect(newState.game).toEqual(expect.objectContaining({
        roster: buildRoster([newPlayer]),
      }));

      expect(newState).not.toBe(currentState);
      expect(newState.game!.roster).not.toBe(currentState.game!.roster);
    });

    it('should add new player to roster with existing players', () => {
      currentState.game!.roster = buildRoster([existingPlayer]);

      const newState = game(currentState, {
        type: ADD_PLAYER,
        player: newPlayer
      });

      expect(newState.game).toEqual(expect.objectContaining({
        roster: buildRoster([existingPlayer, newPlayer]),
      }));

      expect(newState).not.toBe(currentState);
      expect(newState.game!.roster).not.toBe(currentState.game!.roster);
    });
  }); // describe('ADD_PLAYER')

  describe('ROSTER_DONE', () => {

    it('should update setup tasks and init live players from roster', () => {
      const rosterPlayers = [getStoredPlayer()];

      const currentGame = getNewGameWithLiveDetail(buildRoster(rosterPlayers), buildSetupTasks());
      const state: GameState = {
        ...GAME_INITIAL_STATE,
        game: {
          ...currentGame,
        }
      };
      expect(state.game!.liveDetail).toBeDefined();
      expect(state.game!.liveDetail!.players).toBeUndefined();

      const newState = game(state, {
        type: ROSTER_DONE
      });

      const updatedTasks = buildSetupTasks();
      updatedTasks[SetupSteps.Roster].status = SetupStatus.Complete;
      updatedTasks[SetupSteps.Captains].status = SetupStatus.Active;

      const gameDetail = getNewGameWithLiveDetail(buildRoster(rosterPlayers), updatedTasks);
      gameDetail.liveDetail!.players = rosterPlayers.map(player => {
        return { ...player } as LivePlayer;
      });

      expect(newState).toEqual(expect.objectContaining({
        game: gameDetail
      }));

      expect(newState).not.toBe(state);
      expect(newState.game).not.toBe(state.game);
      expect(newState.game!.liveDetail).not.toBe(state.game!.liveDetail);
    });
  }); // describe('ROSTER_DONE')

  describe('STARTERS_DONE', () => {

    it('should update setup tasks to mark starters complete', () => {
      const currentGame = getNewGameWithLiveDetail();
      const state: GameState = {
        ...GAME_INITIAL_STATE,
        game: {
          ...currentGame
        }
      };

      const newState = game(state, {
        type: STARTERS_DONE
      });

      const updatedTasks = buildSetupTasks();
      updatedTasks[SetupSteps.Starters].status = SetupStatus.Complete;

      const gameDetail = getNewGameWithLiveDetail(undefined, updatedTasks);

      expect(newState).toEqual(expect.objectContaining({
        game: gameDetail,
      }));

      expect(newState).not.toBe(state);
      expect(newState.game).not.toBe(state.game);
      expect(newState.game!.liveDetail).not.toBe(state.game!.liveDetail);
    });
  }); // describe('STARTERS_DONE')

  describe('START_GAME', () => {

    it('should set status to Start and clear setup tasks', () => {
      const completedTasks = buildSetupTasks();
      completedTasks.forEach(task => {task.status = SetupStatus.Complete;})

      const currentGame = getNewGameWithLiveDetail(buildRoster([getStoredPlayer()]), completedTasks);
      const state: GameState = {
        ...GAME_INITIAL_STATE,
        game: {
          ...currentGame
        }
      };

      const newState = game(state, {
        type: START_GAME
      });

      const gameDetail = getNewGameWithLiveDetail(buildRoster([getStoredPlayer()]), undefined);
      gameDetail.status = GameStatus.Start;

      expect(newState).toEqual(expect.objectContaining({
        game: gameDetail,
      }));

      expect(newState).not.toBe(state);
      expect(newState.game).not.toBe(state.game);
      expect(newState.game!.liveDetail).not.toBe(state.game!.liveDetail);
    });
  }); // describe('START_GAME')

  describe('SELECT_PLAYER', () => {

    it('should only set selectedPlayer with nothing selected', () => {
      const state: GameState = {
        ...GAME_INITIAL_STATE,
        game: getNewGameDetail()
      };
      expect(state.selectedPlayer).toBeUndefined();

      const selectedPlayer = getStoredPlayer();

      const newState = game(state, {
        type: SELECT_PLAYER,
        playerId: selectedPlayer.id
      });

      expect(newState).toEqual(expect.objectContaining({
        game: getNewGameDetail(),
        selectedPlayer: selectedPlayer.id
      }));
      // Separate check as it causes a TS error inside objectContaining
      expect(newState.proposedStarter).toBeUndefined();

      expect(newState).not.toBe(state);
    });

    it('should set selectedPlayer and propose starter with position selected', () => {
      const selectedPosition: Position = { id: 'AM1', type: 'AM'};

      const state: GameState = {
        ...GAME_INITIAL_STATE,
        game: buildNewGameDetailAndRoster(),
        selectedPosition: { ...selectedPosition }
      };
      expect(state.selectedPlayer).toBeUndefined();

      const selectedPlayer = getStoredPlayer();

      const newState = game(state, {
        type: SELECT_PLAYER,
        playerId: selectedPlayer.id
      });

      const starter: LivePlayer = {
        ...selectedPlayer,
        currentPosition: { ...selectedPosition }
      }

      expect(newState).toEqual(expect.objectContaining({
        game: buildNewGameDetailAndRoster(),
        selectedPosition: { ...selectedPosition },
        selectedPlayer: selectedPlayer.id,
        proposedStarter: expect.objectContaining(starter)
      }));

      expect(newState).not.toBe(state);
    });
  }); // describe('SELECT_PLAYER')

  describe('SELECT_POSITION', () => {

    it('should only set selectedPosition with nothing selected', () => {
      const state: GameState = {
        ...GAME_INITIAL_STATE,
        game: getNewGameDetail()
      };
      expect(state.selectedPosition).toBeUndefined();

      const selectedPosition: Position = { id: 'AM1', type: 'AM'};
      const newState = game(state, {
        type: SELECT_POSITION,
        position: selectedPosition
      });

      expect(newState).toEqual(expect.objectContaining({
        game: getNewGameDetail(),
        selectedPosition: { ...selectedPosition }
      }));
      // Separate check as it causes a TS error inside objectContaining
      expect(newState.proposedStarter).toBeUndefined();

      expect(newState).not.toBe(state);
    });

    it('should set selectedPosition and propose starter with player selected', () => {
      const selectedPlayer = getStoredPlayer();

      const state: GameState = {
        ...GAME_INITIAL_STATE,
        game: buildNewGameDetailAndRoster(),
        selectedPlayer: selectedPlayer.id,
      };
      expect(state.selectedPosition).toBeUndefined();

      const selectedPosition: Position = { id: 'AM1', type: 'AM'};
      const newState = game(state, {
        type: SELECT_POSITION,
        position: selectedPosition
      });

      const starter: LivePlayer = {
        ...selectedPlayer,
        currentPosition: { ...selectedPosition }
      }

      expect(newState).toEqual(expect.objectContaining({
        game: buildNewGameDetailAndRoster(),
        selectedPlayer: selectedPlayer.id,
        selectedPosition: { ...selectedPosition },
        proposedStarter: expect.objectContaining(starter)
      }));

      expect(newState).not.toBe(state);
    });
  }); // describe('SELECT_POSITION')

  describe('APPLY_STARTER', () => {
    let currentState: GameState;
    let selectedPlayer: LivePlayer;
    let selectedPosition: Position;

    beforeEach(() => {
      selectedPlayer = getStoredPlayer();
      selectedPosition = { id: 'AM1', type: 'AM'};
      const starter: LivePlayer = {
        ...selectedPlayer,
        currentPosition: { ...selectedPosition }
      }

      currentState = {
        ...GAME_INITIAL_STATE,
        game: buildNewGameDetailAndRoster(),
        selectedPlayer: selectedPlayer.id,
        selectedPosition: { ...selectedPosition },
        proposedStarter: starter
      };
      currentState.game!.liveDetail!.players = [getStoredPlayer()];
    });

    it('should set live player to ON with currentPosition', () => {
      const newState: GameState = game(currentState, {
        type: APPLY_STARTER
      });

      expect(newState.game!.liveDetail!.players).toBeDefined();
      const newPlayers = newState.game!.liveDetail!.players!;

      const newPlayer = newPlayers.find(player => (player.id === selectedPlayer.id));
      expect(newPlayer).toBeDefined();
      expect(newPlayer).toEqual(expect.objectContaining({
        id: selectedPlayer.id,
        status: PlayerStatus.On,
        currentPosition: { ...selectedPosition }
      }));

      expect(newState).not.toBe(currentState);
      expect(newState.game).not.toBe(currentState.game);
      expect(newState.game!.liveDetail).not.toBe(currentState.game!.liveDetail);
      expect(newPlayers).not.toBe(currentState.game!.liveDetail!.players);
    });

    it('should clear selected player/position and proposed starter', () => {
      const newState = game(currentState, {
        type: APPLY_STARTER
      });

      expect(newState.selectedPlayer).toBeUndefined();
      expect(newState.selectedPosition).toBeUndefined();
      expect(newState.proposedStarter).toBeUndefined();

      expect(newState).not.toBe(currentState);
    });

    it('should replace player already in the position', () => {
      const existingStarter: LivePlayer = {
        ...getNewPlayer(),
        status: PlayerStatus.On,
        currentPosition: { ...selectedPosition }
      }
      currentState.game!.liveDetail!.players!.push(existingStarter);

      const newState: GameState = game(currentState, {
        type: APPLY_STARTER
      });

      expect(newState.game!.liveDetail!.players).toBeDefined();
      const newPlayers = newState.game!.liveDetail!.players!;

      const newPlayer = newPlayers.find(player => (player.id === selectedPlayer.id));
      expect(newPlayer).toBeDefined();
      expect(newPlayer).toEqual(expect.objectContaining({
        id: selectedPlayer.id,
        status: PlayerStatus.On,
        currentPosition: { ...selectedPosition }
      }));

      const replacedPlayer = newPlayers.find(player => (player.id === existingStarter.id));
      expect(replacedPlayer).toBeDefined();
      expect(replacedPlayer).toEqual(expect.objectContaining({
        id: existingStarter.id,
        status: PlayerStatus.Off,
      }));
      expect(replacedPlayer!.currentPosition).not.toBeDefined();

      expect(newState).not.toBe(currentState);
      expect(newState.game).not.toBe(currentState.game);
      expect(newState.game!.liveDetail).not.toBe(currentState.game!.liveDetail);
      expect(newPlayers).not.toBe(currentState.game!.liveDetail!.players);
    });
  }); // describe('APPLY_STARTER')

  describe('CANCEL_STARTER', () => {
    let currentState: GameState;
    let selectedPlayer: LivePlayer;
    let selectedPosition: Position;

    beforeEach(() => {
      selectedPlayer = getStoredPlayer();
      selectedPosition = { id: 'AM1', type: 'AM'};
      const starter: LivePlayer = {
        ...selectedPlayer,
        currentPosition: { ...selectedPosition }
      }

      currentState = {
        ...GAME_INITIAL_STATE,
        game: buildNewGameDetailAndRoster(),
        selectedPlayer: selectedPlayer.id,
        selectedPosition: { ...selectedPosition },
        proposedStarter: starter
      };
      currentState.game!.liveDetail!.players = [getStoredPlayer()];
    });

    it('should clear selected player/position and proposed starter', () => {
      const newState = game(currentState, {
        type: CANCEL_STARTER
      });

      expect(newState.selectedPlayer).toBeUndefined();
      expect(newState.selectedPosition).toBeUndefined();
      expect(newState.proposedStarter).toBeUndefined();

      expect(newState).not.toBe(currentState);
    });
  }); // describe('CANCEL_STARTER')

});
