import { Action, ActionCreator } from 'redux';
import { LiveGames } from '../models/live.js';
import {
  LIVE_HYDRATE
} from '../slices/live-types.js';
import { ClockState } from '../slices/live/clock-slice.js';
import { ShiftState } from '../slices/live/shift-slice.js';

export interface LiveActionHydrate extends Action<typeof LIVE_HYDRATE> { gameId?: string, games?: LiveGames, clock?: ClockState, shift?: ShiftState };

export const hydrateLive: ActionCreator<LiveActionHydrate> = (games: LiveGames, gameId?: string, clock?: ClockState, shift?: ShiftState) => {
  return {
    type: LIVE_HYDRATE,
    gameId,
    games,
    clock,
    shift
  }
};
