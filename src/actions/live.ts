import { Action, ActionCreator } from 'redux';
import { LiveGame } from '../models/game';
import {
  LIVE_HYDRATE,
} from '../slices/live-types';
import { ClockState } from '../slices/live/clock-slice.js';

export interface LiveActionHydrate extends Action<typeof LIVE_HYDRATE> { gameId?: string, game?: LiveGame, clock?: ClockState };

export const hydrateLive: ActionCreator<LiveActionHydrate> = (game: LiveGame, gameId?: string, clock?: ClockState) => {
  return {
    type: LIVE_HYDRATE,
    gameId,
    game,
    clock
  }
};
