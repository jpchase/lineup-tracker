import { Game, Games } from '@app/models/game';
import { ADD_GAME, GET_GAME_REQUEST, GET_GAME_SUCCESS, GET_GAME_FAIL, GET_GAMES } from '@app/actions/game';
import game from '@app/reducers/game';
import { GameState } from '@app/reducers/game';
import { getFakeAction, buildGames } from '../helpers/test_data';

const GAME_INITIAL_STATE: GameState = {
  games: {} as Games,
  gameId: '',
  game: undefined,
  detailLoading: false,
  detailFailure: false,
  error: ''
};

describe('Games reducer', () => {
  const existingGame: Game = {
    id: 'EX', name: 'Existing Game', teamId: 'T1', date: new Date(2016, 1, 10), opponent: 'Existing opponent'
  };
  const newGame: Game = {
    id: 'NG', name: 'New Game', teamId: 'T1', date: new Date(2016, 1, 10), opponent: 'Opponent for new'
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
    const newState = game(GAME_INITIAL_STATE, {
      type: GET_GAME_SUCCESS,
      game: newGame
    });

    expect(newState).toEqual(expect.objectContaining({
      game: newGame,
      games: buildGames([newGame]),
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
