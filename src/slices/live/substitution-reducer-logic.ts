import { PayloadAction } from '@reduxjs/toolkit';
import { getPlayer, LiveGame } from '../../models/live.js';
import { PlayerStatus } from '../../models/player.js';
import { LiveGamePayload, PendingSubsInvalidPayload } from './live-action-types.js';
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

export const markPlayerOutHandler = (state: LiveState, game: LiveGame, _action: PayloadAction<LiveGamePayload>) => {
  if (!state.selectedOffPlayer) {
    return;
  }
  const offPlayer = getPlayer(game, state.selectedOffPlayer);
  if (!offPlayer) {
    return;
  }
  offPlayer.status = PlayerStatus.Out;
  offPlayer.selected = false;
  state.selectedOffPlayer = undefined;
};

export const returnOutPlayerHandler = (state: LiveState, game: LiveGame, _action: PayloadAction<LiveGamePayload>) => {
  if (!state.selectedOutPlayer) {
    return;
  }
  const outPlayer = getPlayer(game, state.selectedOutPlayer);
  if (!outPlayer) {
    return;
  }
  outPlayer.status = PlayerStatus.Off;
  outPlayer.selected = false;
  state.selectedOutPlayer = undefined;
};
