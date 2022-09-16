import { GameState } from '@app/slices/game/game-slice.js';
import { LiveState } from '@app/slices/live/live-slice.js';
import { RootState } from '@app/store.js';

export function buildRootState(game?: GameState, live?: LiveState): RootState {
  return {
    game,
    live
  };
}
