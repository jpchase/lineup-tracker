import { PayloadAction } from '@reduxjs/toolkit';
import { PendingSubsInvalidPayload } from './live-action-types.js';
import { LiveState } from './live-slice.js';

export const invalidPendingSubsHandler = (state: LiveState, action: PayloadAction<PendingSubsInvalidPayload>) => {
  if (!action.payload.invalidSubs?.length) {
    state.invalidSubs = undefined;
    return;
  }
  state.invalidSubs = action.payload.invalidSubs;
};

export const invalidPendingSubsPrepare = (gameId: string, invalidSubs: string[]) => {
  return {
    payload: {
      gameId,
      invalidSubs,
    }
  };
}
