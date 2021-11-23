/**
@license
*/

import { Reducer } from 'redux';
import { END_PERIOD, START_PERIOD, TOGGLE_CLOCK } from '../live-types.js';
import { createReducer } from '../../reducers/createReducer.js';
import { TimerData, Timer } from '../../models/clock.js';

export interface ClockState {
  timer?: TimerData;
}

const INITIAL_STATE: ClockState = {
  timer: undefined,
};

export const clock: Reducer<ClockState> = createReducer(INITIAL_STATE, {
  [START_PERIOD]: (newState, /*action*/) => {
    const timer = new Timer();
    timer.start();
    newState.timer = timer.toJSON();
  },

  [END_PERIOD]: (newState, /*action*/) => {
    const timer = new Timer(newState.timer);
    timer.stop();
    newState.timer = timer.toJSON();
  },

  [TOGGLE_CLOCK]: (newState, /*action*/) => {
    const timer = new Timer(newState.timer);

    if (timer.isRunning) {
      timer.stop();
    } else {
      timer.start();
    }
    newState.timer = timer.toJSON();
  },
});
