/** @format */

import { RootState } from '@app/app/store.js';
import { AuthState } from '@app/slices/auth/auth-slice.js';
import { GameState } from '@app/slices/game/game-slice.js';
import { LiveState } from '@app/slices/live/index.js';
import sinon from 'sinon';
import { buildInitialGameState } from './game-state-setup.js';
import { buildInitialLiveState } from './live-state-setup.js';

export function buildRootState(game?: GameState, live?: LiveState): RootState {
  return {
    auth: {} as AuthState,
    game,
    live,
  };
}

export function mockGetState(
  gameState?: GameState,
  authState?: AuthState,
  teamState?: any,
  liveState?: LiveState,
) {
  return sinon.fake(() => {
    const mockState = {
      auth: authState,
      game: gameState ?? buildInitialGameState(),
      live: liveState ?? buildInitialLiveState(),
      team: teamState,
    };
    return mockState;
  });
}
