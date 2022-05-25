import { Action, ActionCreator } from 'redux';
import { LiveGame } from '../models/game.js';
import {
  LIVE_HYDRATE
} from '../slices/live-types.js';
import { ClockState } from '../slices/live/clock-slice.js';
import { ShiftState } from '../slices/live/shift-slice.js';

export interface LiveActionHydrate extends Action<typeof LIVE_HYDRATE> { gameId?: string, game?: LiveGame, clock?: ClockState, shift?: ShiftState };

export const hydrateLive: ActionCreator<LiveActionHydrate> = (game: LiveGame, gameId?: string, clock?: ClockState, shift?: ShiftState) => {
  return {
    type: LIVE_HYDRATE,
    gameId,
    game,
    clock,
    shift
  }
};
