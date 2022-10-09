import { PayloadAction } from '@reduxjs/toolkit';
import { findPlayersByStatus, getPlayer, LiveGame, LivePlayer, removePlayer } from '../../models/live.js';
import { PlayerStatus } from '../../models/player.js';
import { extractIdFromSwapPlayerId, LiveGamePayload, PendingSubsAppliedPayload, PendingSubsInvalidPayload } from './live-action-types.js';
import { LiveState } from './live-slice.js';

export const pendingSubsAppliedHandler = (_state: LiveState, game: LiveGame, action: PayloadAction<PendingSubsAppliedPayload>) => {
  action.payload.subs.forEach(sub => {
    const player = getPlayer(game, sub.id);
    if (!player || player.isSwap || player.status !== PlayerStatus.Next) {
      return;
    }
    const replacedPlayer = getPlayer(game, player.replaces!);
    if (!(replacedPlayer && replacedPlayer.status === PlayerStatus.On)) {
      return;
    }

    player.status = PlayerStatus.On;
    player.replaces = undefined;
    player.selected = false;

    replacedPlayer.status = PlayerStatus.Off;
    replacedPlayer.currentPosition = undefined;
    replacedPlayer.selected = false;
  });

  // Apply any position swaps
  const nextPlayers = findPlayersByStatus(game, PlayerStatus.Next,
    action.payload.selectedOnly, /* includeSwaps */ true);
  nextPlayers.forEach(swapPlayer => {
    if (!swapPlayer.isSwap) {
      return;
    }
    const actualPlayerId = extractIdFromSwapPlayerId(swapPlayer.id);
    const player = getPlayer(game, actualPlayerId);
    if (player?.status !== PlayerStatus.On) {
      return;
    }

    player.currentPosition = { ...swapPlayer.nextPosition! };
    player.selected = false;

    removePlayer(game, swapPlayer.id);
  });
}

export const pendingSubsAppliedPrepare = (gameId: string, subs: LivePlayer[], selectedOnly?: boolean) => {
  return {
    payload: {
      gameId,
      subs,
      selectedOnly: !!selectedOnly
    }
  };
}

export const invalidPendingSubsHandler = (state: LiveState, _game: LiveGame, action: PayloadAction<PendingSubsInvalidPayload>) => {
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
