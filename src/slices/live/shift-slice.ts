/**
@license
*/

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { PlayerTimeTrackerMap, PlayerTimeTrackerMapData } from '../../models/shift.js';
import { GameSetupCompletedPayload, PendingSubsAppliedPayload, StartPeriodPayload } from './live-action-types.js';
import { applyPendingSubs, endPeriod, gameSetupCompleted, startPeriod } from './live-slice.js';

export interface ShiftState {
  trackerMap?: PlayerTimeTrackerMapData;
}

const INITIAL_STATE: ShiftState = {
  trackerMap: undefined,
};

const shiftSlice = createSlice({
  name: 'shift',
  initialState: INITIAL_STATE,
  reducers: {
  },

  extraReducers: (builder) => {
    builder.addCase(gameSetupCompleted, (state, action: PayloadAction<GameSetupCompletedPayload>) => {
      if (!action.payload.gameId || !action.payload.liveGame?.players?.length) {
        return;
      }
      // TODO: validate game matches?
      const trackerMap = PlayerTimeTrackerMap.createFromGame(action.payload.liveGame);
      state.trackerMap = trackerMap.toJSON();
    }).addCase(startPeriod, (state, action: PayloadAction<StartPeriodPayload>) => {
      if (!action.payload.gameAllowsStart) {
        return;
      }
      // TODO: validate game matches?
      const trackerMap = PlayerTimeTrackerMap.create(state.trackerMap!);
      trackerMap.startShiftTimers();
      state.trackerMap = trackerMap.toJSON();
    }).addCase(endPeriod, (state) => {
      if (!state.trackerMap?.clockRunning) {
        return;
      }
      // TODO: validate game matches?
      const trackerMap = PlayerTimeTrackerMap.create(state.trackerMap!);
      trackerMap.stopShiftTimers();
      state.trackerMap = trackerMap.toJSON();
    }).addCase(applyPendingSubs, (state, action: PayloadAction<PendingSubsAppliedPayload>) => {
      if (!action.payload.subs?.length) {
        return;
      }
      const subs = action.payload.subs.filter(player => !player.isSwap).map(player => {
        return { in: player.id, out: player.replaces! };
      });
      if (!subs.length) {
        // This might be empty if there are only swaps provided.
        return;
      }
      const trackerMap = PlayerTimeTrackerMap.create(state.trackerMap!);
      trackerMap.substitutePlayers(subs);
      state.trackerMap = trackerMap.toJSON();
    });
  },

});

const { reducer } = shiftSlice;

export const shift = reducer;
