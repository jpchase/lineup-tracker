/**
@license
*/

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Timer, TimerData } from '../../models/clock.js';
import { PeriodStatus } from '../../models/live.js';

export interface ClockState {
  timer?: TimerData;
  currentPeriod: number;
  periodStatus: PeriodStatus;
  totalPeriods: number;
  periodLength: number;
}

export interface StartPeriodPayload {
  gameAllowsStart: boolean
}

const INITIAL_STATE: ClockState = {
  timer: undefined,
  currentPeriod: 0,
  periodStatus: PeriodStatus.Pending,
  totalPeriods: 2,
  periodLength: 45
};

const clockSlice = createSlice({
  name: 'clock',
  initialState: INITIAL_STATE,
  reducers: {

    configurePeriods: {
      reducer: (state, action: PayloadAction<{ totalPeriods: number, periodLength: number }>) => {
        const periods = action.payload.totalPeriods || 0;
        const length = action.payload.periodLength || 0;
        if (periods < 1 || length < 10) {
          return;
        }
        // The periods cannot be configured once started.
        if (state.currentPeriod > 0 || state.periodStatus !== PeriodStatus.Pending) {
          return;
        }
        state.totalPeriods = periods;
        state.periodLength = length;
      },

      prepare: (totalPeriods: number, periodLength: number) => {
        return {
          payload: {
            totalPeriods,
            periodLength
          }
        };
      }
    },

    startPeriod: {
      reducer: (state, action: PayloadAction<StartPeriodPayload>) => {
        if (!action.payload.gameAllowsStart) {
          return;
        }
        if (state.currentPeriod === state.totalPeriods
          || state.periodStatus === PeriodStatus.Running) {
          return;
        }
        const timer = new Timer();
        timer.start();
        state.timer = timer.toJSON();
        if (!state.currentPeriod || state.currentPeriod < 1) {
          state.currentPeriod = 1;
        } else {
          state.currentPeriod++;
        }
        state.periodStatus = PeriodStatus.Running;
      },

      prepare: (gameAllowsStart: boolean) => {
        return {
          payload: {
            gameAllowsStart
          }
        };
      }
    },

    endPeriod: (state) => {
      if (state.periodStatus !== PeriodStatus.Running) {
        return;
      }
      const timer = new Timer(state.timer);
      timer.stop();
      state.timer = timer.toJSON();
      if (state.currentPeriod === state.totalPeriods) {
        // Ending the last period of the game.
        state.periodStatus = PeriodStatus.Done;
      } else {
        state.periodStatus = PeriodStatus.Pending;
      }
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
export const { configurePeriods, startPeriod, endPeriod, toggle } = actions;
