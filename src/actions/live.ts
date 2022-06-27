import { Action, ActionCreator } from 'redux';
import { LiveGames } from '../models/live.js';
import {
  LIVE_HYDRATE
} from '../slices/live-types.js';
import { ShiftState } from '../slices/live/shift-slice.js';

export interface LiveActionHydrate extends Action<typeof LIVE_HYDRATE> { gameId?: string, games?: LiveGames, shift?: ShiftState };

export const hydrateLive: ActionCreator<LiveActionHydrate> = (games: LiveGames, gameId?: string, shift?: ShiftState) => {
  return {
    type: LIVE_HYDRATE,
    gameId,
    games,
    shift
  }
};
