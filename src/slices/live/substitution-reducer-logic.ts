/** @format */

import { PayloadAction } from '@reduxjs/toolkit';
import { Position } from '../../models/formation.js';
import {
  findPlayersByStatus,
  getPlayer,
  LiveGame,
  LivePlayer,
  removePlayer,
} from '../../models/live.js';
import { PlayerStatus } from '../../models/player.js';
import {
  buildSwapPlayerId,
  ConfirmSubPayload,
  extractIdFromSwapPlayerId,
  LiveGamePayload,
  PendingSubsAppliedPayload,
  PendingSubsDiscardedPayload,
  PendingSubsInvalidPayload,
  SelectPlayerPayload,
} from './live-action-types.js';
import { LiveState } from './live-slice.js';

export const selectPlayerHandler = (
  state: LiveState,
  game: LiveGame,
  action: PayloadAction<SelectPlayerPayload>
) => {
  const playerId = action.payload.playerId;
  const selectedPlayer = getPlayer(game, playerId);
  if (!selectedPlayer) {
    return;
  }

  // Always sets the selected flag to true/false as appropriate.
  selectedPlayer.selected = !!action.payload.selected;

  // Only On, Off, Out statuses need further handling.
  switch (selectedPlayer.status) {
    case PlayerStatus.On:
    case PlayerStatus.Off:
    case PlayerStatus.Out:
      break;
    default:
      return;
  }

  const status = selectedPlayer.status;
  if (action.payload.selected) {
    setCurrentSelected(state, status, playerId);
    if (status === PlayerStatus.Out) {
      return;
    }
    const madeSub = prepareSubIfPossible(state, game);
    if (!madeSub) {
      prepareSwapIfPossible(state, game);
    }
  } else {
    // De-selection.
    if (getCurrentSelected(state, status) === playerId) {
      setCurrentSelected(state, status, undefined);
    }
  }
};

export const selectPlayerPrepare = (gameId: string, playerId: string, selected: boolean) => {
  return {
    payload: {
      gameId,
      playerId,
      selected: !!selected,
    },
  };
};

export const confirmSubHandler = (
  state: LiveState,
  game: LiveGame,
  action: PayloadAction<ConfirmSubPayload>
) => {
  const sub = state.proposedSub;
  if (!sub) {
    return;
  }

  game.players!.forEach((player) => {
    if (player.id === sub.id) {
      player.selected = false;
      player.status = PlayerStatus.Next;
      player.currentPosition = action.payload.newPosition || sub.currentPosition;
      player.replaces = sub.replaces;
      return;
    }
    if (player.id === sub.replaces) {
      player.selected = false;
    }
  });

  clearProposedSub(state);
};

export const confirmSubPrepare = (gameId: string, newPosition?: Position) => {
  return {
    payload: {
      gameId,
      newPosition,
    },
  };
};

export const cancelSubHandler = (
  state: LiveState,
  game: LiveGame,
  _action: PayloadAction<LiveGamePayload>
) => {
  if (!state.proposedSub) {
    return;
  }
  const cancelIds = [state.selectedOffPlayer!, state.selectedOnPlayer!];
  for (const playerId of cancelIds) {
    const selectedPlayer = getPlayer(game, playerId);
    if (selectedPlayer && selectedPlayer.selected) {
      selectedPlayer.selected = false;
    }
  }
  clearProposedSub(state);
};

export const confirmSwapHandler = (
  state: LiveState,
  game: LiveGame,
  _action: PayloadAction<LiveGamePayload>
) => {
  const swap = state.proposedSwap;
  if (!swap) {
    return;
  }

  const swapIds = [state.selectedOnPlayer!, state.selectedOnPlayer2!];
  for (const playerId of swapIds) {
    const selectedPlayer = getPlayer(game, playerId);
    if (!!selectedPlayer?.selected) {
      selectedPlayer.selected = false;
    }
  }

  const nextSwap: LivePlayer = {
    ...swap,
    id: buildSwapPlayerId(swap.id),
    status: PlayerStatus.Next,
    selected: false,
  };
  game.players!.push(nextSwap);

  clearProposedSwap(state);
};

export const cancelSwapHandler = (
  state: LiveState,
  game: LiveGame,
  _action: PayloadAction<LiveGamePayload>
) => {
  if (!state.proposedSwap) {
    return;
  }
  const cancelIds = [state.selectedOnPlayer!, state.selectedOnPlayer2!];
  for (const playerId of cancelIds) {
    const selectedPlayer = getPlayer(game, playerId);
    if (!!selectedPlayer?.selected) {
      selectedPlayer.selected = false;
    }
  }
  clearProposedSwap(state);
};

export const pendingSubsAppliedHandler = (
  state: LiveState,
  game: LiveGame,
  action: PayloadAction<PendingSubsAppliedPayload>
) => {
  action.payload.subs.forEach((sub) => {
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
  const nextPlayers = findPlayersByStatus(
    game,
    PlayerStatus.Next,
    action.payload.selectedOnly,
    /* includeSwaps */ true
  );
  nextPlayers.forEach((swapPlayer) => {
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
  state.invalidSubs = undefined;
};

export const pendingSubsAppliedPrepare = (
  gameId: string,
  subs: LivePlayer[],
  selectedOnly?: boolean
) => {
  return {
    payload: {
      gameId,
      subs,
      selectedOnly: !!selectedOnly,
    },
  };
};

export const invalidPendingSubsHandler = (
  state: LiveState,
  _game: LiveGame,
  action: PayloadAction<PendingSubsInvalidPayload>
) => {
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
    },
  };
};

export const discardPendingSubsHandler = (
  state: LiveState,
  game: LiveGame,
  action: PayloadAction<PendingSubsDiscardedPayload>
) => {
  const nextPlayers = findPlayersByStatus(
    game,
    PlayerStatus.Next,
    action.payload.selectedOnly,
    /* includeSwaps */ true
  );
  nextPlayers.forEach((player) => {
    if (player.isSwap) {
      removePlayer(game, player.id);
      return;
    }

    player.status = PlayerStatus.Off;
    player.replaces = undefined;
    player.currentPosition = undefined;
    player.selected = false;
  });
  state.invalidSubs = undefined;
};

export const discardPendingSubsPrepare = (gameId: string, selectedOnly?: boolean) => {
  return {
    payload: {
      gameId,
      selectedOnly: !!selectedOnly,
    },
  };
};

export const markPlayerOutHandler = (
  state: LiveState,
  game: LiveGame,
  _action: PayloadAction<LiveGamePayload>
) => {
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

export const returnOutPlayerHandler = (
  state: LiveState,
  game: LiveGame,
  _action: PayloadAction<LiveGamePayload>
) => {
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

function prepareSubIfPossible(state: LiveState, game: LiveGame): boolean {
  if (!state.selectedOffPlayer || !state.selectedOnPlayer) {
    // Need both an On and Off player selected to set up a sub
    return false;
  }

  const offPlayer = getPlayer(game, state.selectedOffPlayer);
  if (!offPlayer) {
    return false;
  }
  const onPlayer = getPlayer(game, state.selectedOnPlayer);
  if (!onPlayer) {
    return false;
  }

  state.proposedSub = {
    ...offPlayer,
    currentPosition: {
      ...onPlayer.currentPosition!,
    },
    replaces: onPlayer.id,
  };
  return true;
}

function clearProposedSub(state: LiveState) {
  delete state.selectedOffPlayer;
  delete state.selectedOnPlayer;
  delete state.proposedSub;
}

function prepareSwapIfPossible(state: LiveState, game: LiveGame) {
  if (!state.selectedOnPlayer || !state.selectedOnPlayer2) {
    // Need two On players selected to set up a swap.
    return;
  }

  const onPlayer = getPlayer(game, state.selectedOnPlayer);
  if (!onPlayer) {
    return;
  }
  const positionPlayer = getPlayer(game, state.selectedOnPlayer2);
  if (!positionPlayer) {
    return;
  }

  const swap: LivePlayer = {
    ...onPlayer,
    nextPosition: {
      ...positionPlayer.currentPosition!,
    },
    isSwap: true,
  };
  state.proposedSwap = swap;
}

function clearProposedSwap(state: LiveState) {
  state.selectedOnPlayer = undefined;
  state.selectedOnPlayer2 = undefined;
  state.proposedSwap = undefined;
}

function getCurrentSelected(state: LiveState, status: PlayerStatus) {
  switch (status) {
    case PlayerStatus.Off:
      return state.selectedOffPlayer;
    case PlayerStatus.On:
      return state.selectedOnPlayer;
    case PlayerStatus.Out:
      return state.selectedOutPlayer;
  }
  throw new Error(`Unsupported status: ${status}`);
}

function setCurrentSelected(state: LiveState, status: PlayerStatus, value: string | undefined) {
  switch (status) {
    case PlayerStatus.Off:
      state.selectedOffPlayer = value;
      break;
    case PlayerStatus.On:
      if (value && state.selectedOnPlayer) {
        // Second On player selected.
        state.selectedOnPlayer2 = value;
      } else {
        // Otherwise, this is either the first On player to be selected, or is
        // de-selecting. When de-selecting, there should only ever by one On
        // player selected,
        state.selectedOnPlayer = value;
      }
      break;
    case PlayerStatus.Out:
      state.selectedOutPlayer = value;
      break;
    default:
      throw new Error(`Unsupported status: ${status}`);
  }
}
