/** @format */

import { GameEvent, GameEventType } from '@app/models/live.js';

export function buildGameSetupEvent(
  startTime: number,
  totalPeriods = 2,
  periodLength = 45
): GameEvent {
  return {
    id: 'setupeventid',
    type: GameEventType.Setup,
    timestamp: startTime,
    data: {
      clock: {
        totalPeriods,
        periodLength,
      },
    },
  };
}

export function buildPeriodStartEvent(startTime: number, currentPeriod = 1): GameEvent {
  return {
    id: 'starteventid',
    type: GameEventType.PeriodStart,
    timestamp: startTime,
    data: {
      clock: {
        currentPeriod,
        startTime,
      },
    },
  };
}
