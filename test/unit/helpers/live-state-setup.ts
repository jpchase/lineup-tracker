/** @format */

import { TimerData } from '@app/models/clock.js';
import { FormationType } from '@app/models/formation.js';
import {
  AllSetupSteps,
  GameEventCollection,
  LiveClock,
  LiveGame,
  LivePlayer,
  PeriodStatus,
  SetupStatus,
  SetupSteps,
  SetupTask,
} from '@app/models/live.js';
import { EVENTS_INITIAL_STATE, EventState } from '@app/slices/live/events-slice.js';
import { LIVE_GAME_INITIAL_STATE, LiveState } from '@app/slices/live/live-slice.js';
import { SHIFT_INITIAL_STATE, ShiftState } from '@app/slices/live/shift-slice.js';
import { buildRunningTimer, buildStoppedTimer } from './test-clock-data.js';
import * as testlive from './test-live-game-data.js';
import { buildPlayerTrackerMap } from './test-shift-data.js';

const CLOCK_INITIAL_STATE: LiveClock = {
  timer: undefined,
  currentPeriod: 0,
  periodStartTime: undefined,
  periodStatus: PeriodStatus.Pending,
  totalPeriods: 2,
  periodLength: 45,
};

export function buildInitialLiveState(): LiveState {
  return {
    ...LIVE_GAME_INITIAL_STATE,
    shift: {
      ...SHIFT_INITIAL_STATE,
    },
    ...EVENTS_INITIAL_STATE,
    // Set to a new object, otherwise multiple tests will share the instance
    // on the constant.
    games: {},
  };
}

export function buildLiveStateWithCurrentGame(
  game: LiveGame,
  rest?: Partial<LiveState>
): LiveState {
  const state: LiveState = {
    ...buildInitialLiveState(),
    ...rest,
  };
  if (game) {
    if (!state.games) {
      state.games = {};
    }
    state.games![game.id] = game;
  }
  return state;
}

export function buildLiveGameWithSetupTasksAndPlayers(
  lastCompletedStep: SetupSteps = -1 as SetupSteps
): LiveGame {
  const game = testlive.getLiveGameWithPlayers();
  buildSetupTasks(game, lastCompletedStep);
  return game;
}

export function buildLiveGameWithSetupTasks(
  lastCompletedStep: SetupSteps = -1 as SetupSteps
): LiveGame {
  const game = buildLiveGameWithSetupTasksAndPlayers(lastCompletedStep);
  game.players = [];
  return game;
}

export function buildSetupTasks(game: LiveGame, lastCompletedStep: SetupSteps) {
  const steps = AllSetupSteps;

  game.setupTasks = steps.map<SetupTask>((value, index) => {
    let status = SetupStatus.Pending;
    if (index <= Math.min(lastCompletedStep, steps.length - 1)) {
      status = SetupStatus.Complete;
    } else if (index < steps.length && index === lastCompletedStep + 1) {
      // Set the current step after the last completed to active.
      status = SetupStatus.Active;
    }
    return {
      step: value,
      status,
    };
  });

  // If the current step is after Formation, the game formation must be
  // initialized to a valid value.
  if (lastCompletedStep >= SetupSteps.Formation) {
    game.formation = { type: FormationType.F4_3_3 };
  }
}

export function buildClock(
  timer?: TimerData,
  rest?: Partial<LiveClock>,
  stoppageTimer?: TimerData
): LiveClock {
  return {
    ...CLOCK_INITIAL_STATE,
    ...rest,
    timer,
    stoppageTimer,
  };
}

export function buildClockWithTimer(isRunning?: boolean): LiveClock {
  return buildClock(isRunning ? buildRunningTimer() : buildStoppedTimer());
}

export function buildShiftWithTrackersFromGame(
  game: LiveGame,
  keepExistingStatus?: boolean
): ShiftState {
  return buildShiftWithTrackers(game.id, game.players, keepExistingStatus);
}

export function buildEventState(
  gameEvents: GameEventCollection,
  eventsSelectedIds?: string[]
): EventState {
  return {
    ...EVENTS_INITIAL_STATE,
    events: { [gameEvents.id]: gameEvents.toJSON() },
    eventsSelectedIds,
  };
}

export function buildShiftWithTrackers(
  gameId: string,
  existingPlayers?: LivePlayer[],
  keepExistingStatus?: boolean
): ShiftState {
  let players;
  if (existingPlayers) {
    players = existingPlayers.filter((player) => !player.isSwap);
  }
  const trackerMap = buildPlayerTrackerMap(gameId, players, keepExistingStatus);
  return {
    ...SHIFT_INITIAL_STATE,
    trackerMaps: { [trackerMap.id]: trackerMap.toJSON() },
  };
}

export function getTrackerMap(state: ShiftState, gameId: string) {
  if (!state.trackerMaps) {
    return undefined;
  }
  return state.trackerMaps[gameId];
}

export function getGame(state: LiveState, gameId: string) {
  if (!state.games) {
    return undefined;
  }
  return state.games[gameId];
}

export function selectPlayers(game: LiveGame, playerIds: string[], selected: boolean) {
  for (const player of game.players!) {
    if (playerIds.includes(player.id)) {
      player.selected = selected;
    }
  }
}
