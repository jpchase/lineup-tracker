import { Game, Games } from '@app/models/game';
import { ADD_GAME, GET_GAME, GET_GAMES } from '@app/actions/game';
import game from '@app/reducers/game';
import { GameState } from '@app/reducers/game';
import { getFakeAction, buildGames } from '../helpers/test_data';

const GAME_INITIAL_STATE: GameState = {
  games: {} as Games,
  gameId: '',
  game: undefined,
  error: ''
};

describe('Games reducer', () => {
  const existingGame: Game = {
    id: 'EX', teamId: 'T1', date: new Date(2016, 1, 10), opponent: 'Existing opponent'
  };
  const newGame: Game = {
    id: 'NG', teamId: 'T1', date: new Date(2016, 1, 10), opponent: 'Opponent for new'
  };

  it('should return the initial state', () => {
    expect(
      game(GAME_INITIAL_STATE, getFakeAction())
      ).toEqual(GAME_INITIAL_STATE);
  });

  it('should handle GET_GAME', () => {
    const newState = game(GAME_INITIAL_STATE, {
      type: GET_GAME,
      gameId: newGame.id
    });

    expect(newState).toEqual(expect.objectContaining({
      gameId: newGame.id,
    }));

    expect(newState).not.toBe(GAME_INITIAL_STATE);
    expect(newState.gameId).not.toBe(GAME_INITIAL_STATE.gameId);
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
