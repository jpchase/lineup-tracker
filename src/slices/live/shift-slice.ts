/** @format */

import { createSlice } from '@reduxjs/toolkit';
import { PlayerTimeTrackerMap, PlayerTimeTrackerMapData } from '../../models/shift.js';
import {
  applyPendingSubs,
  endPeriod,
  gameSetupCompleted,
  startPeriod,
  toggleClock,
} from './live-slice.js';

export interface ShiftState {
  trackerMaps?: TrackerMaps;
}

export interface TrackerMaps {
  [index: string]: PlayerTimeTrackerMapData;
}

export const SHIFT_INITIAL_STATE: ShiftState = {
  trackerMaps: undefined,
};

const shiftSlice = createSlice({
  name: 'shift',
  initialState: SHIFT_INITIAL_STATE,
  reducers: {},

  extraReducers: (builder) => {
    builder
      .addCase(gameSetupCompleted, (state, action) => {
        if (!action.payload.gameId || !action.payload.liveGame?.players?.length) {
          return;
        }
        const trackerMap = PlayerTimeTrackerMap.createFromGame(action.payload.liveGame);
        setTrackerMap(state, trackerMap);
      })
      .addCase(startPeriod, (state, action) => {
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
      })
      .addCase(endPeriod, (state, action) => {
        const trackerMap = getTrackerMap(state, action.payload.gameId);
        if (!trackerMap || !trackerMap.clockRunning) {
          // TODO: Error or message to distinguish failure cases?
          return;
        }
        trackerMap.stopShiftTimers(action.payload.stopTime);
        setTrackerMap(state, trackerMap);
      })
      .addCase(toggleClock, (state, action) => {
        const trackerMap = getTrackerMap(state, action.payload.gameId);
        if (!trackerMap) {
          // TODO: Error or message to distinguish failure cases?
          return;
        }
        // The isRunning flag in the action provides the final state, so it should be opposite to the current clock state of the tracker.
        if (action.payload.isRunning === trackerMap.clockRunning) {
          throw new Error(
            `Inconsistent state for toggle clock: intended = ${action.payload.isRunning}, but already current = ${trackerMap.clockRunning}, for ${JSON.stringify(trackerMap.toJSON())}`,
          );
        }
        if (trackerMap.clockRunning) {
          trackerMap.stopShiftTimers();
        } else {
          trackerMap.startShiftTimers();
        }
        setTrackerMap(state, trackerMap);
      })
      .addCase(applyPendingSubs, (state, action) => {
        if (!action.payload.subs?.length) {
          return;
        }
        const subs = action.payload.subs
          .filter((player) => !player.isSwap)
          .map((player) => {
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
    return undefined;
  }
  const data = state.trackerMaps[gameId];
  if (!data) {
    return undefined;
  }
  return PlayerTimeTrackerMap.create(data);
}

function setTrackerMap(state: ShiftState, trackerMap: PlayerTimeTrackerMap) {
  if (!state.trackerMaps) {
    state.trackerMaps = {};
  }
  state.trackerMaps[trackerMap.id] = trackerMap.toJSON();
}
