import { Position } from '../../models/formation.js';
import { LiveGame, LivePlayer } from '../../models/live.js';

const SWAP_ID_SUFFIX = '_swap';

export interface LiveGamePayload {
  gameId: string;
}

export interface SelectPlayerPayload {
  playerId: string;
  selected: boolean;
};

export interface ConfirmSubPayload {
  newPosition?: Position;
};

export interface GameSetupCompletedPayload extends LiveGamePayload {
  liveGame: LiveGame;
}

export interface ConfigurePeriodsPayload extends LiveGamePayload {
  totalPeriods: number;
  periodLength: number;
}

export interface StartPeriodPayload extends LiveGamePayload {
  gameAllowsStart: boolean;
}

export interface PendingSubsAppliedPayload extends LiveGamePayload {
  subs: LivePlayer[],
  selectedOnly?: boolean
}

export interface PendingSubsInvalidPayload extends LiveGamePayload {
  invalidSubs: string[]
}

export interface StartersInvalidPayload extends LiveGamePayload {
  invalidStarters: string[]
}

export const prepareLiveGamePayload = (gameId: string) => {
  return {
    payload: {
      gameId,
    }
  };
}

export function buildSwapPlayerId(playerId: string) {
  if (playerId.endsWith(SWAP_ID_SUFFIX)) {
    return playerId;
  }
  return playerId + SWAP_ID_SUFFIX;
}

export function extractIdFromSwapPlayerId(swapPlayerId: string) {
  if (!swapPlayerId.endsWith(SWAP_ID_SUFFIX)) {
    return swapPlayerId;
  }
  return swapPlayerId.slice(0, swapPlayerId.length - SWAP_ID_SUFFIX.length);
}
