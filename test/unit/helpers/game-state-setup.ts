import { GameDetail } from '@app/models/game.js';
import { GameState, GAME_INITIAL_STATE } from '@app/slices/game/game-slice.js';

export function buildInitialGameState(): GameState {
  return {
    ...GAME_INITIAL_STATE,
    // Set to a new object, otherwise multiple tests will share the instance
    // on the constant.
    games: {}
  };
}

export function buildGameStateWithCurrentGame(game: GameDetail, rest?: Partial<GameState>): GameState {
  const state: GameState = {
    ...buildInitialGameState(),
    ...rest,
  };
  if (game) {
    state.gameId = game.id;
    state.game = game;
    if (!state.games) {
      state.games = {};
    }
    state.games![game.id] = game;
  }
  return state;
}
