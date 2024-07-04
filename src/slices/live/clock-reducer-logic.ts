/** @format */

import { PayloadAction } from '@reduxjs/toolkit';
import { CurrentTimeProvider, Duration, Timer } from '../../models/clock.js';
import { GameStatus } from '../../models/game.js';
import { LiveGame, LiveGameBuilder, PeriodStatus, SetupSteps } from '../../models/live.js';
import {
  ConfigurePeriodsPayload,
  EndPeriodPayload,
  LiveGamePayload,
  OverduePeriodPayload,
  StartPeriodPayload,
} from './live-action-types.js';
import { LiveState } from './live-slice.js';
import { completeSetupStepForAction } from './setup-reducer-logic.js';

// Allow 5 minutes after period end before it becomes overdue.
const PERIOD_OVERDUE_BUFFER_MINUTES = 5;

//TODO: move to setup logic file
export const configurePeriodsHandler = (
  _state: LiveState,
  game: LiveGame,
  action: PayloadAction<ConfigurePeriodsPayload>
) => {
  const periods = action.payload.totalPeriods || 0;
  const length = action.payload.periodLength || 0;
  if (periods < 1 || length < 10) {
    return;
  }
  // The periods cannot be configured once started.
  if (
    game.clock &&
    (game.clock.currentPeriod > 0 || game.clock.periodStatus !== PeriodStatus.Pending)
  ) {
    return;
  }
  const { clock } = getInitializedClock(game);
  clock.totalPeriods = periods;
  clock.periodLength = length;

  if (game.status === GameStatus.New) {
    completeSetupStepForAction(game, SetupSteps.Periods);
  }
};

export const configurePeriodsPrepare = (
  gameId: string,
  totalPeriods: number,
  periodLength: number
) => {
  return {
    payload: {
      gameId,
      totalPeriods,
      periodLength,
    },
  };
};

export const startPeriodHandler = (
  _state: LiveState,
  game: LiveGame,
  action: PayloadAction<StartPeriodPayload>
) => {
  if (!action.payload.gameAllowsStart) {
    return;
  }
  const period = gameCanStartPeriod(game);
  if (!period.allowsStart) {
    return;
  }
  game.status = GameStatus.Live;

  const { clock, timer } = getInitializedClock(game);

  timer.start();
  clock.timer = timer.toJSON();
  clock.currentPeriod = period.currentPeriod!;
  clock.periodStartTime = clock.timer.startTime;
  clock.periodStatus = PeriodStatus.Running;
};

export const startPeriodPrepare = (
  gameId: string,
  gameAllowsStart: boolean,
  currentPeriod?: number,
  startTime?: number
) => {
  return {
    payload: {
      gameId,
      gameAllowsStart,
      currentPeriod,
      startTime,
    },
  };
};

export const endPeriodHandler = (
  _state: LiveState,
  game: LiveGame,
  action: PayloadAction<EndPeriodPayload>
) => {
  if (!action.payload.gameAllowsEnd) {
    return;
  }
  const period = gameCanEndPeriod(game);
  if (!period.allowsEnd) {
    return;
  }

  const { clock, timer, stoppageTimer } = getInitializedClock(game);

  // At most one of the timers will be running. Can call stop on both since
  // it will be ignored if already stopped.
  timer.provider.freeze();
  timer.stop(action.payload.stopTime);
  stoppageTimer.stop(action.payload.stopTime);
  timer.provider.unfreeze();

  clock.timer = timer.toJSON();
  clock.stoppageTimer = stoppageTimer.toJSON();
  if (clock.currentPeriod === clock.totalPeriods) {
    // Ending the last period of the game.
    game.status = GameStatus.Done;
    clock.periodStatus = PeriodStatus.Done;
  } else {
    game.status = GameStatus.Break;
    clock.periodStatus = PeriodStatus.Pending;
  }
};

export const endPeriodPrepare = (
  gameId: string,
  gameAllowsEnd: boolean,
  currentPeriod?: number,
  stopTime?: number
) => {
  return {
    payload: {
      gameId,
      gameAllowsEnd,
      currentPeriod,
      stopTime,
    },
  };
};

export const toggleHandler = (
  _state: LiveState,
  game: LiveGame,
  _action: PayloadAction<LiveGamePayload>
) => {
  if (!game.clock) {
    return;
  }
  const { clock, timer, stoppageTimer } = getInitializedClock(game);

  timer.provider.freeze();
  if (timer.isRunning) {
    timer.stop();
    stoppageTimer.start();
  } else {
    timer.start();
    stoppageTimer.stop();
  }
  timer.provider.unfreeze();
  clock.timer = timer.toJSON();
  clock.stoppageTimer = stoppageTimer.toJSON();
};

export const markPeriodOverdueHandler = (
  _state: LiveState,
  game: LiveGame,
  action: PayloadAction<OverduePeriodPayload>
) => {
  if (!isPeriodOverdue(game, action.payload.ignoreTimeForTesting)) {
    return;
  }
  const { clock } = getInitializedClock(game);

  // TODO: The change doesn't seem to stick when looking at the UI
  clock.periodStatus = PeriodStatus.Overdue;
};

export const markPeriodOverduePrepare = (gameId: string, ignoreTimeForTesting?: boolean) => {
  return {
    payload: {
      gameId,
      ignoreTimeForTesting,
    },
  };
};

export function isPeriodOverdue(game?: LiveGame, ignoreTimeForTesting?: boolean): boolean {
  if (game?.status !== GameStatus.Live || game.clock?.periodStatus !== PeriodStatus.Running) {
    return false;
  }

  // TODO: Only respect this flag in debug/dev builds
  if (ignoreTimeForTesting) {
    return true;
  }
  // Compute the max time for the period, and compare to elapsed.
  const timer = new Timer(game.clock.timer);
  const maxLength = game.clock.periodLength + PERIOD_OVERDUE_BUFFER_MINUTES;
  if (timer.getElapsed().getTotalSeconds() >= maxLength * 60) {
    return true;
  }
  return false;
}

export function gameCanStartPeriod(game: LiveGame): {
  allowsStart: boolean;
  currentPeriod?: number;
  startTime?: number;
} {
  let allowsStart = false;
  if (game.status === GameStatus.Start || game.status === GameStatus.Break) {
    if (game.clock) {
      allowsStart = game.clock.currentPeriod < game.clock.totalPeriods;
      // game.clock.periodStatus !== PeriodStatus.Running
    } else {
      // Clock is not initialized, which means the game has yet to be started.
      allowsStart = true;
    }
  }
  if (!allowsStart) {
    return { allowsStart };
  }

  const clock = game.clock ?? LiveGameBuilder.createClock();

  let currentPeriod;
  if (!clock.currentPeriod || clock.currentPeriod < 1) {
    currentPeriod = 1;
  } else {
    currentPeriod = clock.currentPeriod + 1;
  }
  return { allowsStart, currentPeriod, startTime: new CurrentTimeProvider().getCurrentTime() };
}

export function gameCanEndPeriod(
  game: LiveGame,
  extraMinutes?: number
): {
  allowsEnd: boolean;
  currentPeriod?: number;
  stopTime?: number;
} {
  let allowsEnd = false;
  if (game.status === GameStatus.Live) {
    if (game.clock) {
      allowsEnd =
        game.clock.periodStatus === PeriodStatus.Running ||
        game.clock.periodStatus === PeriodStatus.Overdue;
    } else {
      // Clock is not initialized, which means the game has yet to be started.
      allowsEnd = false;
    }
  }
  if (!allowsEnd) {
    return { allowsEnd };
  }

  const currentPeriod = game.clock!.currentPeriod;

  let stopTime: number | undefined;
  if (
    (extraMinutes || extraMinutes === 0) &&
    game.clock?.periodStatus === PeriodStatus.Overdue &&
    game.clock.timer?.isRunning
  ) {
    // Compute an overridden stop time as:
    //   Period start time + period length + extra minutes + stoppage time (if any).
    const periodTimer = new Timer(game.clock.timer);
    const periodStartTime = periodTimer.startTime!;

    const actualLength = game.clock.periodLength + extraMinutes;
    // The timer start time is when it was last started, *not* the actual start time of
    // the period. If the timer was ever started, need to back up the time to be added
    // by the saved duration.
    // TODO: Add subtract method to Duration class?
    const correctedDuration = Duration.add(
      Duration.create(actualLength * 60),
      Duration.create(-periodTimer.duration.getTotalSeconds())
    );

    stopTime = Duration.addToDate(periodStartTime, correctedDuration);
  } else {
    stopTime = new CurrentTimeProvider().getCurrentTime();
  }

  return { allowsEnd, currentPeriod, stopTime };
}

function getInitializedClock(game: LiveGame) {
  if (!game.clock) {
    game.clock = LiveGameBuilder.createClock();
  }
  const timeProvider = new CurrentTimeProvider();
  const timer = new Timer(game.clock.timer, timeProvider);
  const stoppageTimer = new Timer(game.clock.stoppageTimer, timeProvider);
  return { clock: game.clock, timer, stoppageTimer };
}
