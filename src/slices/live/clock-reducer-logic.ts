/**
@license
*/

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Timer, TimerData } from '../../models/clock.js';
import { LiveGame, PeriodStatus } from '../../models/live.js';

export interface ClockState {
  timer?: TimerData;
  currentPeriod: number;
  periodStatus: PeriodStatus;
  totalPeriods: number;
  periodLength: number;
}

export interface ConfigurePeriodsPayload {
  gameId: string;
  totalPeriods: number;
  periodLength: number;
}

export interface StartPeriodPayload {
  gameId: string;
  gameAllowsStart: boolean;
}

const INITIAL_STATE: ClockState = {
  timer: undefined,
  currentPeriod: 0,
  periodStatus: PeriodStatus.Pending,
  totalPeriods: 2,
  periodLength: 45
};

export const configurePeriodsHandler = (game: LiveGame, action: PayloadAction<ConfigurePeriodsPayload>) => {
  const periods = action.payload.totalPeriods || 0;
  const length = action.payload.periodLength || 0;
  if (periods < 1 || length < 10) {
    return;
  }
  // The periods cannot be configured once started.
  if (game.clock && (game.clock.currentPeriod > 0 || game.clock.periodStatus !== PeriodStatus.Pending)) {
    return;
  }
  const state = getInitializedClock(game);
  state.totalPeriods = periods;
  state.periodLength = length;
};

export const configurePeriodsPrepare = (gameId: string, totalPeriods: number, periodLength: number) => {
  return {
    payload: {
      gameId,
      totalPeriods,
      periodLength
    }
  };
}

export const startPeriodHandler = (game: LiveGame, action: PayloadAction<StartPeriodPayload>) => {
  if (!action.payload.gameAllowsStart) {
    return;
  }
  if (game.clock && (game.clock.currentPeriod === game.clock.totalPeriods
    || game.clock.periodStatus === PeriodStatus.Running)) {
    return;
  }
  const state = getInitializedClock(game);
  const timer = new Timer();
  timer.start();
  state.timer = timer.toJSON();
  if (!state.currentPeriod || state.currentPeriod < 1) {
    state.currentPeriod = 1;
  } else {
    state.currentPeriod++;
  }
  state.periodStatus = PeriodStatus.Running;
}

export const startPeriodPrepare = (gameId: string, gameAllowsStart: boolean) => {
  return {
    payload: {
      gameId,
      gameAllowsStart
    }
  };
}

const clockSlice = createSlice({
  name: 'clock',
  initialState: INITIAL_STATE,
  reducers: {

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
export const { endPeriod, toggle } = actions;

function getInitializedClock(game: LiveGame) {
  if (!game.clock) {
    game.clock = { ...INITIAL_STATE };
  }
  return game.clock;
}
