import { Game, Games, GameStatus } from '@app/models/game';
import {
  ADD_GAME,
  GET_GAMES
} from '@app/actions/game';
import games from '@app/reducers/games';
import { GamesState } from '@app/reducers/games';
import { getFakeAction, buildGames /*, getStoredPlayer, getStoredPlayerData */ } from '../helpers/test_data';

const GAMES_INITIAL_STATE: GamesState = {
  games: {} as Games,
  error: ''
};

describe('Games reducer', () => {
  const existingGame: Game = {
    id: 'EX', status: GameStatus.Start, name: 'Existing Game', teamId: 'T1', date: new Date(2016, 1, 10), opponent: 'Existing opponent'
  };
  const newGame: Game = {
    id: 'NG', status: GameStatus.New, name: 'New Game', teamId: 'T1', date: new Date(2016, 1, 10), opponent: 'Opponent for new'
  };

  it('should return the initial state', () => {
    expect(
      games(GAMES_INITIAL_STATE, getFakeAction())
      ).toEqual(GAMES_INITIAL_STATE);
  });

  it('should handle GET_GAMES', () => {
    const newState = games(GAMES_INITIAL_STATE, {
      type: GET_GAMES,
      games: buildGames([existingGame])
    });

    expect(newState).toEqual(expect.objectContaining({
      games: buildGames([existingGame]),
    }));

    expect(newState).not.toBe(GAMES_INITIAL_STATE);
    expect(newState.games).not.toBe(GAMES_INITIAL_STATE.games);
  });

  it('should handle ADD_GAME with empty games', () => {
    const newState = games(GAMES_INITIAL_STATE, {
      type: ADD_GAME,
      game: newGame
    });

    expect(newState).toEqual(expect.objectContaining({
      games: buildGames([newGame]),
    }));

    expect(newState).not.toBe(GAMES_INITIAL_STATE);
    expect(newState.games).not.toBe(GAMES_INITIAL_STATE.games);
  });

  it('should handle ADD_GAME with existing games', () => {
    const state: GamesState = {
      ...GAMES_INITIAL_STATE
    };
    state.games = buildGames([existingGame]);

    const newState = games(state, {
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
