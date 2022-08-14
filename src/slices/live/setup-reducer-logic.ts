import { PayloadAction } from '@reduxjs/toolkit';
import { StartersInvalidPayload } from './live-action-types.js';
import { LiveState } from './live-slice.js';

export const invalidStartersHandler = (state: LiveState, action: PayloadAction<StartersInvalidPayload>) => {
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
