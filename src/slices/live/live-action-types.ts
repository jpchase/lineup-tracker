import { LiveGame } from "../../models/live.js";

export interface LiveGamePayload {
  gameId: string;
}

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

export const prepareLiveGamePayload = (gameId: string) => {
  return {
    payload: {
      gameId,
    }
  };
}
