/**
@license
*/

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { PlayerTimeTrackerMap, PlayerTimeTrackerMapData } from '../../models/shift.js';
import { StartPeriodPayload } from './live-action-types.js';
import { applyPendingSubs, endPeriod, gameSetupCompleted, GameSetupCompletedPayload, PendingSubsAppliedPayload, startPeriod } from './live-slice.js';

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
      const trackerMap = new PlayerTimeTrackerMap(state.trackerMap);
      trackerMap.initialize(action.payload.liveGame.players);
      state.trackerMap = trackerMap.toJSON();
    }).addCase(startPeriod, (state, action: PayloadAction<StartPeriodPayload>) => {
      if (!action.payload.gameAllowsStart) {
        return;
      }
      // TODO: validate game matches?
      const trackerMap = new PlayerTimeTrackerMap(state.trackerMap);
      trackerMap.startShiftTimers();
      state.trackerMap = trackerMap.toJSON();
    }).addCase(endPeriod, (state) => {
      if (!state.trackerMap?.clockRunning) {
        return;
      }
      // TODO: validate game matches?
      const trackerMap = new PlayerTimeTrackerMap(state.trackerMap);
      trackerMap.stopShiftTimers();
      state.trackerMap = trackerMap.toJSON();
    }).addCase(applyPendingSubs, (state, action: PayloadAction<PendingSubsAppliedPayload>) => {
      if (!action.payload.subs?.length) {
        return;
      }
      const subs = action.payload.subs.map(player => {
        return { in: player.id, out: player.replaces! };
      });
      const trackerMap = new PlayerTimeTrackerMap(state.trackerMap);
      trackerMap.substitutePlayers(subs);
      state.trackerMap = trackerMap.toJSON();
    });
  },

});

const { reducer } = shiftSlice;

export const shift = reducer;
