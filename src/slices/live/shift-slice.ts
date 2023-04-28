/**
@license
*/

import { createSlice } from '@reduxjs/toolkit';
import { PlayerTimeTrackerMap, PlayerTimeTrackerMapData } from '../../models/shift.js';
import { applyPendingSubs, endPeriod, gameSetupCompleted, startPeriod } from './live-slice.js';

export interface ShiftState {
  trackerMaps?: TrackerMaps;
}

export interface TrackerMaps {
  [index: string]: PlayerTimeTrackerMapData;
}

const INITIAL_STATE: ShiftState = {
  trackerMaps: undefined,
};

const shiftSlice = createSlice({
  name: 'shift',
  initialState: INITIAL_STATE,
  reducers: {
  },

  extraReducers: (builder) => {
    builder.addCase(gameSetupCompleted, (state, action) => {
      if (!action.payload.gameId || !action.payload.liveGame?.players?.length) {
        return;
      }
      const trackerMap = PlayerTimeTrackerMap.createFromGame(action.payload.liveGame);
      setTrackerMap(state, trackerMap);
    }).addCase(startPeriod, (state, action) => {
      if (!action.payload.gameAllowsStart) {
        return;
      }
      const trackerMap = getTrackerMap(state, action.payload.gameId);
      if (!trackerMap) {
        // TODO: Error or message to distinguish failure cases?
        return;
      }
      trackerMap.startShiftTimers();
      setTrackerMap(state, trackerMap);
    }).addCase(endPeriod, (state, action) => {
      const trackerMap = getTrackerMap(state, action.payload.gameId);
      if (!trackerMap || !trackerMap.clockRunning) {
        // TODO: Error or message to distinguish failure cases?
        return;
      }
      trackerMap.stopShiftTimers(action.payload.retroactiveStopTime);
      setTrackerMap(state, trackerMap);
    }).addCase(applyPendingSubs, (state, action) => {
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
      const trackerMap = getTrackerMap(state, action.payload.gameId);
      if (!trackerMap) {
        // TODO: Error or message to distinguish failure cases?
        return;
      }
      trackerMap.substitutePlayers(subs);
      setTrackerMap(state, trackerMap);
    });
  },

});

const { reducer } = shiftSlice;

export const shift = reducer;

function getTrackerMap(state: ShiftState, gameId: string): PlayerTimeTrackerMap | undefined {
  if (!state.trackerMaps || !(gameId in state.trackerMaps)) {
    return;
  }
  const data = state.trackerMaps[gameId];
  if (!data) {
    return;
  }
  return PlayerTimeTrackerMap.create(data);
}

function setTrackerMap(state: ShiftState, trackerMap: PlayerTimeTrackerMap) {
  if (!state.trackerMaps) {
    state.trackerMaps = {};
  }
  state.trackerMaps[trackerMap.id] = trackerMap.toJSON();
}
