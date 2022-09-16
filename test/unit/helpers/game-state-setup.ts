import { GameDetail } from '@app/models/game.js';
import { GameState } from '@app/slices/game/game-slice.js';

const INITIAL_STATE: GameState = {
  hydrated: false,
  gameId: '',
  game: undefined,
  games: {},
  detailLoading: false,
  detailFailure: false,
  rosterLoading: false,
  rosterFailure: false,
  error: ''
};

export function buildInitialGameState(): GameState {
  return {
    ...INITIAL_STATE,
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
