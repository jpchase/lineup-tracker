import { PayloadAction } from '@reduxjs/toolkit';
import { Timer } from '../../models/clock.js';
import { GameStatus } from '../../models/game.js';
import { LiveGame, LiveGameBuilder, PeriodStatus, SetupSteps } from '../../models/live.js';
import { ConfigurePeriodsPayload, EndPeriodPayload, LiveGamePayload, StartPeriodPayload } from './live-action-types.js';
import { LiveState } from './live-slice.js';
import { completeSetupStepForAction } from './setup-reducer-logic.js';

// Allow 5 minutes after period end before it becomes overdue.
const PERIOD_OVERDUE_BUFFER_MINUTES = 5;

//TODO: move to setup logic file
export const configurePeriodsHandler = (_state: LiveState, game: LiveGame, action: PayloadAction<ConfigurePeriodsPayload>) => {
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

  if (game.status === GameStatus.New) {
    completeSetupStepForAction(game, SetupSteps.Periods);
  }
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

export const startPeriodHandler = (_state: LiveState, game: LiveGame, action: PayloadAction<StartPeriodPayload>) => {
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

export const endPeriodHandler = (_state: LiveState, game: LiveGame, action: PayloadAction<EndPeriodPayload>) => {
  if (game.status !== GameStatus.Live) {
    return;
  }
  if (game.clock?.periodStatus !== PeriodStatus.Running &&
    game.clock?.periodStatus !== PeriodStatus.Overdue) {
    return;
  }
  const retroactiveStopTime = (game.clock.periodStatus === PeriodStatus.Overdue)
    ? action.payload.retroactiveStopTime : undefined;

  const state = getInitializedClock(game);
  const timer = new Timer(state.timer);
  timer.stop(retroactiveStopTime);
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

export const endPeriodPrepare = (gameId: string, retroactiveStopTime?: number) => {
  return {
    payload: {
      gameId,
      retroactiveStopTime
    }
  };
}

export const toggleHandler = (_state: LiveState, game: LiveGame, _action: PayloadAction<LiveGamePayload>) => {
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

export const markPeriodOverdueHandler = (_state: LiveState, game: LiveGame, _action: PayloadAction<LiveGamePayload>) => {
  if (!isPeriodOverdue(game)) {
    return;
  }
  const clock = getInitializedClock(game);

  // TODO: The change doesn't seem to stick when looking at the UI
  clock.periodStatus = PeriodStatus.Overdue;
}

export const isPeriodOverdue = (game?: LiveGame): boolean => {
  if (game?.status !== GameStatus.Live || (game.clock?.periodStatus !== PeriodStatus.Running)) {
    return false;
  }

  // Compute the max time for the period, and compare to elapsed.
  const timer = new Timer(game.clock.timer);
  const maxLength = game.clock.periodLength + PERIOD_OVERDUE_BUFFER_MINUTES;
  if (timer.getElapsed().getTotalSeconds() >= (maxLength * 60)) {
    return true;
  }
  return false;
}

function getInitializedClock(game: LiveGame) {
  if (!game.clock) {
    game.clock = LiveGameBuilder.createClock();
  }
  return game.clock;
}
