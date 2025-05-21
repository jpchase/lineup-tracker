/** @format */

import { PayloadAction } from '@reduxjs/toolkit';
import { CurrentTimeProvider, Duration, Timer } from '../../models/clock.js';
import { GameStatus } from '../../models/game.js';
import {
  GameEventType,
  LiveGame,
  LiveGameBuilder,
  PeriodStatus,
  SetupSteps,
} from '../../models/live.js';
import {
  ConfigurePeriodsPayload,
  EndPeriodPayload,
  EventsUpdatedPayload,
  OverduePeriodPayload,
  StartPeriodPayload,
  ToggleClockPayload,
} from './live-action-types.js';
import { LiveState } from './live-slice.js';
import { completeSetupStepForAction } from './setup-reducer-logic.js';

// Allow 5 minutes after period end before it becomes overdue.
const PERIOD_OVERDUE_BUFFER_MINUTES = 5;

//TODO: move to setup logic file
export const configurePeriodsHandler = (
  _state: LiveState,
  game: LiveGame,
  action: PayloadAction<ConfigurePeriodsPayload>,
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
  periodLength: number,
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
  action: PayloadAction<StartPeriodPayload>,
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
  // Store the start "date" for the game, to have a persistent value, even
  // if the events are later edited (including the start time).
  //  - The date includes the hour of the start time, but not the minutes/seconds.
  //  - The intent is to have the start date be reliable, even with time zones
  //    or games that span midnight.
  //  - Only need to store the value when starting the game for the first time.
  if (period.currentPeriod === 1) {
    const startDate = new Date(clock.timer.startTime!);
    startDate.setMinutes(0);
    startDate.setSeconds(0);
    startDate.setMilliseconds(0);
    clock.gameStartDate = startDate.getTime();
  }
};

export const startPeriodPrepare = (
  gameId: string,
  gameAllowsStart: boolean,
  currentPeriod?: number,
  startTime?: number,
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
  action: PayloadAction<EndPeriodPayload>,
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
  stopTime?: number,
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

export const toggleClockHandler = (
  _state: LiveState,
  game: LiveGame,
  action: PayloadAction<ToggleClockPayload>,
) => {
  if (!action.payload.gameAllowsToggle) {
    return;
  }
  const toggle = gameCanToggleClock(game);
  if (!toggle.allowsToggle) {
    return;
  }

  const { clock, timer, stoppageTimer } = getInitializedClock(game);

  let updatedRunning = false;
  timer.provider.freeze();
  if (timer.isRunning) {
    timer.stop();
    stoppageTimer.start();
    updatedRunning = false;
  } else {
    timer.start();
    stoppageTimer.stop();
    updatedRunning = true;
  }
  timer.provider.unfreeze();
  if (toggle.isRunning !== updatedRunning) {
    throw new Error(
      `Inconsistent state for toggle clock: predicted = ${toggle.isRunning}, updated = ${updatedRunning}, for ${JSON.stringify(game.clock?.timer)}`,
    );
  }
  clock.timer = timer.toJSON();
  clock.stoppageTimer = stoppageTimer.toJSON();
};

export const toggleClockPrepare = (
  gameId: string,
  gameAllowsToggle: boolean,
  currentPeriod?: number,
  toggleTime?: number,
  isRunning?: boolean,
) => {
  return {
    payload: {
      gameId,
      gameAllowsToggle,
      currentPeriod,
      toggleTime,
      isRunning,
    },
  };
};

export const markPeriodOverdueHandler = (
  _state: LiveState,
  game: LiveGame,
  action: PayloadAction<OverduePeriodPayload>,
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

export const eventsUpdatedHandler = (
  _state: LiveState,
  game: LiveGame,
  action: PayloadAction<EventsUpdatedPayload>,
) => {
  if (game.status === GameStatus.Done) {
    // No updates when game is already completed.
    return;
  }
  const { clock, timer } = getInitializedClock(game);

  for (const updatedEvent of action.payload.events) {
    switch (updatedEvent.type) {
      case GameEventType.PeriodStart: {
        if (clock.currentPeriod !== updatedEvent.data.clock.currentPeriod) {
          // Only process updates for the current period.
          break;
        }
        const updatedStartTime = updatedEvent.data.clock.startTime;
        const updatedTimer = timer.toJSON();
        if (timer.isRunning && timer.duration.getTotalSeconds() === 0) {
          // Timer is running, and has not been stopped. This means the timer
          // start time is the same as the period start time.
          // Update only the start time.
          updatedTimer.startTime = updatedStartTime;
        } else {
          // The timer is either:
          // 1) Not running, so it has duration, but no start time.
          // 2) Running and was previously stopped, so it has duration, but it's
          //    start time is sometime after the period start time.
          // Update only the duration, by the delta between the old and new period
          // start times.
          //  - If the time was updated to be earlier, the duration should become longer.
          //  - Thus, the delta should be positive - added to the existing duration.
          const timeDifferenceSeconds = (clock.periodStartTime! - updatedStartTime) / 1000;
          const updatedDuration = Duration.add(
            timer.duration,
            Duration.create(timeDifferenceSeconds),
          );
          updatedTimer.duration = updatedDuration.toJSON();
        }

        clock.timer = updatedTimer;
        clock.periodStartTime = updatedStartTime;
        break;
      }
      // case GameEventType.PeriodEnd:
      //   trackerMap.stopShiftTimers(event.data.clock.endTime);
      //   break;

      // case GameEventType.SubIn:
      //   trackerMap.substitutePlayer(event.playerId, event.data.replaced, event.timestamp);
      //   break;

      // case GameEventType.Setup:
      // case GameEventType.SubOut:
      // case GameEventType.Swap:
      default:
      // No-op
    }
  }
  // clock.timer = timer.toJSON();
};

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
  extraMinutes?: number,
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
      Duration.create(-periodTimer.duration.getTotalSeconds()),
    );

    stopTime = Duration.addToDate(periodStartTime, correctedDuration);
  } else {
    stopTime = new CurrentTimeProvider().getCurrentTime();
  }

  return { allowsEnd, currentPeriod, stopTime };
}

export function gameCanToggleClock(game: LiveGame): {
  allowsToggle: boolean;
  currentPeriod?: number;
  toggleTime?: number;
  isRunning?: boolean;
} {
  let allowsToggle = false;
  const period = gameCanEndPeriod(game);
  if (period.allowsEnd && game.clock?.timer) {
    allowsToggle = true;
  }
  if (!allowsToggle) {
    return { allowsToggle };
  }

  // Toggle the current timer state, to provide what the updated state will be.
  const isRunning = !game.clock?.timer?.isRunning;

  return {
    allowsToggle,
    currentPeriod: period.currentPeriod!,
    toggleTime: new CurrentTimeProvider().getCurrentTime(),
    isRunning,
  };
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
