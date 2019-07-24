import { FormationType } from '@app/models/formation';
import { Game, GameDetail, GameStatus, SetupStatus, SetupSteps, SetupTask } from '@app/models/game';
import { Player } from '@app/models/player';
import {
  GET_GAME_REQUEST,
  GET_GAME_SUCCESS,
  GET_GAME_FAIL,
  CAPTAINS_DONE,
  ROSTER_DONE,
  STARTERS_DONE,
  START_GAME,
  SET_FORMATION
} from '@app/actions/game';
import game from '@app/reducers/game';
import { GameState } from '@app/reducers/game';
import { getFakeAction, buildRoster, getStoredPlayer, getStoredPlayerData } from '../helpers/test_data';

const GAME_INITIAL_STATE: GameState = {
  gameId: '',
  game: undefined,
  detailLoading: false,
  detailFailure: false,
  error: ''
};

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
  const existingGame: Game = {
    id: 'EX', status: GameStatus.Start, name: 'Existing Game', teamId: 'T1', date: new Date(2016, 1, 10), opponent: 'Existing opponent'
  };
  const newGame: Game = {
    id: 'NG', status: GameStatus.New, name: 'New Game', teamId: 'T1', date: new Date(2016, 1, 10), opponent: 'Opponent for new'
  };

  it('should return the initial state', () => {
    expect(
      game(GAME_INITIAL_STATE, getFakeAction())
      ).toEqual(GAME_INITIAL_STATE);
  });

  it('should handle GET_GAME_REQUEST', () => {
    const newState = game(GAME_INITIAL_STATE, {
      type: GET_GAME_REQUEST,
      gameId: newGame.id
    });

    expect(newState).toEqual(expect.objectContaining({
      gameId: newGame.id,
      detailLoading: true,
      detailFailure: false
    }));

    expect(newState).not.toBe(GAME_INITIAL_STATE);
    expect(newState.gameId).not.toBe(GAME_INITIAL_STATE.gameId);
  });

  it('should handle GET_GAME_SUCCESS', () => {
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

  it('should handle GET_GAME_SUCCESS ignore team roster when already set', () => {
    const gamePlayer: Player = {
      ...getStoredPlayerData(),
      id: 'gp1'
    };
    const inputGame: GameDetail = {
      ...existingGame,
      roster: buildRoster([gamePlayer])
    };

    const newState = game(GAME_INITIAL_STATE, {
      type: GET_GAME_SUCCESS,
      game: inputGame,
      teamRoster: buildRoster([getStoredPlayer()])
    });

    const gameDetail: GameDetail = {
      ...existingGame,
      hasDetail: true,
      roster: buildRoster([gamePlayer])
    };

    expect(newState).toEqual(expect.objectContaining({
      game: gameDetail,
      // TODO: Ensure games state has latest game detail
      // games: buildGames([gameDetail]),
      detailLoading: false,
      detailFailure: false,
    }));

    expect(newState).not.toBe(GAME_INITIAL_STATE);
    expect(newState.game).not.toBe(GAME_INITIAL_STATE.game);
  });

  it('should handle GET_GAME_SUCCESS and copy team roster', () => {
    const inputGame: GameDetail = {
      ...newGame,
      roster: {}
    };
    const newState = game(GAME_INITIAL_STATE, {
      type: GET_GAME_SUCCESS,
      game: inputGame,
      teamRoster: buildRoster([getStoredPlayer()])
    });

    const gameDetail: GameDetail = {
      ...newGame,
      hasDetail: true,
      roster: buildRoster([getStoredPlayer()]),
      setupTasks: buildSetupTasks()
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

  it('should handle GET_GAME_FAIL', () => {
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

  it('should handle SET_FORMATION', () => {
    const state: GameState = {
      ...GAME_INITIAL_STATE,
      game: {
        ...newGame,
        hasDetail: true,
        roster: buildRoster([getStoredPlayer()]),
        setupTasks: buildSetupTasks()
      }
    };

    const newState = game(state, {
      type: SET_FORMATION,
      formationType: FormationType.F4_3_3
    });

    const updatedTasks = buildSetupTasks();
    updatedTasks[SetupSteps.Formation].status = SetupStatus.Complete;
    updatedTasks[SetupSteps.Roster].status = SetupStatus.Active;

    const gameDetail: GameDetail = {
      ...newGame,
      hasDetail: true,
      roster: buildRoster([getStoredPlayer()]),
      setupTasks: updatedTasks,
      formation: { type: FormationType.F4_3_3 }
    };

    expect(newState).toEqual(expect.objectContaining({
      game: gameDetail,
    }));

    expect(newState).not.toBe(state);
    expect(newState.game).not.toBe(state.game);
  });

  describe('CAPTAINS_DONE', () => {

    it('should handle CAPTAINS_DONE', () => {
      const state: GameState = {
        ...GAME_INITIAL_STATE,
        game: {
          ...newGame,
          hasDetail: true,
          roster: buildRoster([getStoredPlayer()]),
          setupTasks: buildSetupTasks()
        }
      };

      const newState = game(state, {
        type: CAPTAINS_DONE
      });

      const updatedTasks = buildSetupTasks();
      updatedTasks[SetupSteps.Captains].status = SetupStatus.Complete;
      updatedTasks[SetupSteps.Starters].status = SetupStatus.Active;

      const gameDetail: GameDetail = {
        ...newGame,
        hasDetail: true,
        roster: buildRoster([getStoredPlayer()]),
        setupTasks: updatedTasks
      };

      expect(newState).toEqual(expect.objectContaining({
        game: gameDetail,
      }));

      expect(newState).not.toBe(state);
      expect(newState.game).not.toBe(state.game);
    });

  }); // describe('CAPTAINS_DONE')

  describe('ROSTER_DONE', () => {

    it('should handle ROSTER_DONE', () => {
      const state: GameState = {
        ...GAME_INITIAL_STATE,
        game: {
          ...newGame,
          hasDetail: true,
          roster: buildRoster([getStoredPlayer()]),
          setupTasks: buildSetupTasks()
        }
      };

      const newState = game(state, {
        type: ROSTER_DONE
      });

      const updatedTasks = buildSetupTasks();
      updatedTasks[SetupSteps.Roster].status = SetupStatus.Complete;
      updatedTasks[SetupSteps.Captains].status = SetupStatus.Active;

      const gameDetail: GameDetail = {
        ...newGame,
        hasDetail: true,
        roster: buildRoster([getStoredPlayer()]),
        setupTasks: updatedTasks
      };

      expect(newState).toEqual(expect.objectContaining({
        game: gameDetail,
      }));

      expect(newState).not.toBe(state);
      expect(newState.game).not.toBe(state.game);
    });

  }); // describe('ROSTER_DONE')

  describe('STARTERS_DONE', () => {

    it('should handle STARTERS_DONE', () => {
      const state: GameState = {
        ...GAME_INITIAL_STATE,
        game: {
          ...newGame,
          hasDetail: true,
          roster: buildRoster([getStoredPlayer()]),
          setupTasks: buildSetupTasks()
        }
      };

      const newState = game(state, {
        type: STARTERS_DONE
      });

      const updatedTasks = buildSetupTasks();
      updatedTasks[SetupSteps.Starters].status = SetupStatus.Complete;

      const gameDetail: GameDetail = {
        ...newGame,
        hasDetail: true,
        roster: buildRoster([getStoredPlayer()]),
        setupTasks: updatedTasks
      };

      expect(newState).toEqual(expect.objectContaining({
        game: gameDetail,
      }));

      expect(newState).not.toBe(state);
      expect(newState.game).not.toBe(state.game);
    });

  }); // describe('STARTERS_DONE')

  describe('START_GAME', () => {

    it('should handle START_GAME', () => {
      const completedTasks = buildSetupTasks();
      completedTasks.forEach(task => {task.status = SetupStatus.Complete;})

      const state: GameState = {
        ...GAME_INITIAL_STATE,
        game: {
          ...newGame,
          hasDetail: true,
          roster: buildRoster([getStoredPlayer()]),
          setupTasks: completedTasks
        }
      };

      const newState = game(state, {
        type: START_GAME
      });

      const gameDetail: GameDetail = {
        ...newGame,
        hasDetail: true,
        roster: buildRoster([getStoredPlayer()]),
        setupTasks: undefined
      };
      gameDetail.status = GameStatus.Start;

      expect(newState).toEqual(expect.objectContaining({
        game: gameDetail,
      }));

      expect(newState).not.toBe(state);
      expect(newState.game).not.toBe(state.game);
    });

  }); // describe('START_GAME')

});
