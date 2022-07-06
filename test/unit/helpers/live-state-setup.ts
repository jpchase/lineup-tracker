import { TimerData } from '@app/models/clock.js';
import { LiveClock, LiveGame, LivePlayer, PeriodStatus } from '@app/models/live.js';
import { LiveGameState, LiveState } from '@app/slices/live/live-slice.js';
import { ShiftState } from '@app/slices/live/shift-slice.js';
import { buildRunningTimer, buildStoppedTimer } from './test-clock-data.js';
import { buildPlayerTrackerMap } from './test-shift-data.js';

const LIVE_INITIAL_STATE: LiveGameState = {
  gameId: '',
  games: undefined,
  selectedStarterPlayer: undefined,
  selectedStarterPosition: undefined,
  proposedStarter: undefined,
  selectedOffPlayer: undefined,
  selectedOnPlayer: undefined,
  proposedSub: undefined,
};

const CLOCK_INITIAL_STATE: LiveClock = {
  timer: undefined,
  currentPeriod: 0,
  periodStatus: PeriodStatus.Pending,
  totalPeriods: 2,
  periodLength: 45
};

export const SHIFT_INITIAL_STATE: ShiftState = {
  trackerMap: undefined,
};

export const INITIAL_OVERALL_STATE = buildInitialLiveState();

export function buildInitialLiveState(): LiveState {
  return {
    hydrated: false,
    ...LIVE_INITIAL_STATE,
    shift: {
      ...SHIFT_INITIAL_STATE
    }
  };
}

export function buildLiveStateWithCurrentGame(game: LiveGame, rest?: Partial<LiveState>): LiveState {
  const state: LiveState = {
    ...buildInitialLiveState(),
    ...rest,
  };
  if (game) {
    state.gameId = game.id;
    if (!state.games) {
      state.games = {};
    }
    state.games![game.id] = game;
  }
  return state;
}

export function buildClock(timer?: TimerData, rest?: Partial<LiveClock>): LiveClock {
  return {
    ...CLOCK_INITIAL_STATE,
    ...rest,
    timer,
  }
}

export function buildClockWithTimer(isRunning?: boolean): LiveClock {
  return buildClock(isRunning ? buildRunningTimer() : buildStoppedTimer());
}

export function buildShiftWithTrackers(existingPlayers?: LivePlayer[],
  keepExistingStatus?: boolean): ShiftState {
  if (existingPlayers) {
    existingPlayers = existingPlayers.filter(player => !player.isSwap);
  }
  const trackerMap = buildPlayerTrackerMap(existingPlayers, keepExistingStatus);
  return {
    ...SHIFT_INITIAL_STATE,
    trackerMap: trackerMap.toJSON()
  };
}

export function getGame(state: LiveState, gameId: string) {
  if (!state.games) {
    return;
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
