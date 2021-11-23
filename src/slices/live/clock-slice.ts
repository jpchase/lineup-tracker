/**
@license
*/

import { createSlice } from '@reduxjs/toolkit';
import { Timer, TimerData } from '../../models/clock.js';

export interface ClockState {
  timer?: TimerData;
}

const INITIAL_STATE: ClockState = {
  timer: undefined,
};

const clockSlice = createSlice({
  name: 'clock',
  initialState: INITIAL_STATE,
  reducers: {
    startPeriod: (state) => {
      const timer = new Timer();
      timer.start();
      state.timer = timer.toJSON();
    },

    endPeriod: (state) => {
      const timer = new Timer(state.timer);
      timer.stop();
      state.timer = timer.toJSON();
    },

    toggle: (state) => {
      const timer = new Timer(state.timer);

      if (timer.isRunning) {
        timer.stop();
      } else {
        timer.start();
      }
      state.timer = timer.toJSON();
    },
  }
});

const { actions, reducer } = clockSlice;

export const clock = reducer;
export const { startPeriod, endPeriod, toggle } = actions;
