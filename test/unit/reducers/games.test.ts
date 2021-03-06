import { ADD_GAME, GET_GAMES } from '@app/actions/games';
import { Games } from '@app/models/game';
import games, { GamesState } from '@app/reducers/games';
import { expect } from '@open-wc/testing';
import { buildGames, getFakeAction, getNewGame, getStoredGame } from '../helpers/test_data';

const GAMES_INITIAL_STATE: GamesState = {
  games: {} as Games,
  error: ''
};

describe('Games reducer', () => {
  const existingGame = getStoredGame();
  const newGame = getNewGame();

  it('should return the initial state', () => {
    expect(
      games(GAMES_INITIAL_STATE, getFakeAction())
      ).to.equal(GAMES_INITIAL_STATE);
  });

  it('should return the initial state when none provided', () => {
    expect(
      games(undefined, getFakeAction())
      ).to.deep.equal(GAMES_INITIAL_STATE);
  });

  describe('GET_GAMES', () => {
    it('should handle GET_GAMES', () => {
      const newState = games(GAMES_INITIAL_STATE, {
        type: GET_GAMES,
        games: buildGames([existingGame])
      });

      expect(newState).to.deep.include({
        games: buildGames([existingGame]),
      });

      expect(newState).to.not.equal(GAMES_INITIAL_STATE);
      expect(newState.games).to.not.equal(GAMES_INITIAL_STATE.games);
    });
  }); // describe('GET_GAMES')

  describe('ADD_GAME', () => {
    it('should handle ADD_GAME with empty games', () => {
      const newState = games(GAMES_INITIAL_STATE, {
        type: ADD_GAME,
        game: newGame
      });

      expect(newState).to.deep.include({
        games: buildGames([newGame]),
      });

      expect(newState).to.not.equal(GAMES_INITIAL_STATE);
      expect(newState.games).to.not.equal(GAMES_INITIAL_STATE.games);
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

      expect(newState).to.deep.include({
        games: buildGames([existingGame, newGame]),
      });

      expect(newState).to.not.equal(state);
      expect(newState.games).to.not.equal(state.games);
    });
  }); // describe('ADD_GAME')

});
