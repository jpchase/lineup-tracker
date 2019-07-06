import { Game, Games, GameDetail, GameStatus, FormationType, SetupStatus, SetupSteps, SetupTask } from '@app/models/game';
import { Player } from '@app/models/player';
import { ADD_GAME, GET_GAME_REQUEST, GET_GAME_SUCCESS, GET_GAME_FAIL, GET_GAMES, SET_FORMATION } from '@app/actions/game';
import game from '@app/reducers/game';
import { GameState } from '@app/reducers/game';
import { getFakeAction, buildGames, buildRoster, getStoredPlayer, getStoredPlayerData } from '../helpers/test_data';

const GAME_INITIAL_STATE: GameState = {
  games: {} as Games,
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
      games: buildGames([gameDetail]),
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
      games: buildGames([gameDetail]),
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
      games: buildGames([gameDetail]),
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

  it('should handle GET_GAMES', () => {
    const newState = game(GAME_INITIAL_STATE, {
      type: GET_GAMES,
      games: buildGames([existingGame])
    });

    expect(newState).toEqual(expect.objectContaining({
      games: buildGames([existingGame]),
    }));

    expect(newState).not.toBe(GAME_INITIAL_STATE);
    expect(newState.games).not.toBe(GAME_INITIAL_STATE.games);
  });

  it('should handle ADD_GAME with empty games', () => {
    const newState = game(GAME_INITIAL_STATE, {
      type: ADD_GAME,
      game: newGame
    });

    expect(newState).toEqual(expect.objectContaining({
      games: buildGames([newGame]),
    }));

    expect(newState).not.toBe(GAME_INITIAL_STATE);
    expect(newState.games).not.toBe(GAME_INITIAL_STATE.games);
  });

  it('should handle ADD_GAME with existing games', () => {
    const state: GameState = {
      ...GAME_INITIAL_STATE
    };
    state.games = buildGames([existingGame]);

    const newState = game(state, {
      type: ADD_GAME,
      game: newGame
    });

    expect(newState).toEqual(expect.objectContaining({
      games: buildGames([existingGame, newGame]),
    }));

    expect(newState).not.toBe(state);
    expect(newState.games).not.toBe(state.games);
  });

});
