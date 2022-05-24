/**
@license
*/

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { PlayerTimeTrackerMap, PlayerTimeTrackerMapData } from '../../models/shift.js';
import { gameSetupCompleted, GameSetupCompletedPayload } from './live-slice.js';

export interface ShiftState {
  players?: PlayerTimeTrackerMapData;
}

const INITIAL_STATE: ShiftState = {
  players: undefined,
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
      const trackerMap = new PlayerTimeTrackerMap();
      trackerMap.initialize(action.payload.liveGame.players);
      state.players = trackerMap.toJSON();
    });
  },

});

const { reducer } = shiftSlice;

export const shift = reducer;
