import { PayloadAction } from '@reduxjs/toolkit';
import { GameStatus } from '../../models/game.js';
import { LiveGame, LiveGameBuilder } from '../../models/live.js';
import { GameSetupCompletedPayload, StartersInvalidPayload } from './live-action-types.js';
import { LiveState } from './live-slice.js';

export const invalidStartersHandler = (state: LiveState, _game: LiveGame, action: PayloadAction<StartersInvalidPayload>) => {
  if (!action.payload.invalidStarters?.length) {
    state.invalidStarters = undefined;
    return;
  }
  state.invalidStarters = action.payload.invalidStarters;
};

export const invalidStartersPrepare = (gameId: string, invalidStarters: string[]) => {
  return {
    payload: {
      gameId,
      invalidStarters,
    }
  };
}

export const setupCompletedHandler = (_state: LiveState, game: LiveGame, _action: PayloadAction<GameSetupCompletedPayload>) => {
  if (game.status !== GameStatus.New) {
    return;
  }
  game.status = GameStatus.Start;
  if (!game.clock) {
    game.clock = LiveGameBuilder.createClock();
  }
  delete game.setupTasks;
}
