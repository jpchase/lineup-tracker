/**
@license
*/

import { PayloadAction } from '@reduxjs/toolkit';
import { Timer } from '../../models/clock.js';
import { GameStatus } from '../../models/game.js';
import { LiveGame, LiveGameBuilder, PeriodStatus } from '../../models/live.js';
import { ConfigurePeriodsPayload, StartPeriodPayload } from './live-action-types.js';

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
  game.status = GameStatus.Live;

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

export const endPeriodHandler = (game: LiveGame) => {
  if (game.status !== GameStatus.Live) {
    return;
  }
  if (game.clock && (game.clock.periodStatus !== PeriodStatus.Running)) {
    return;
  }
  const state = getInitializedClock(game);
  const timer = new Timer(state.timer);
  timer.stop();
  state.timer = timer.toJSON();
  if (state.currentPeriod === state.totalPeriods) {
    // Ending the last period of the game.
    game.status = GameStatus.Done;
    state.periodStatus = PeriodStatus.Done;
  } else {
    game.status = GameStatus.Break;
    state.periodStatus = PeriodStatus.Pending;
  }
}

export const toggleHandler = (game: LiveGame) => {
  if (!game.clock) {
    return;
  }
  const state = getInitializedClock(game);
  const timer = new Timer(state.timer);

  if (timer.isRunning) {
    timer.stop();
  } else {
    timer.start();
  }
  state.timer = timer.toJSON();
}

function getInitializedClock(game: LiveGame) {
  if (!game.clock) {
    game.clock = LiveGameBuilder.createClock();
  }
  return game.clock;
}
