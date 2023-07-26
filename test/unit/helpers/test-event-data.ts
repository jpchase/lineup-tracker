/** @format */

import { GameEvent, GameEventGroup, GameEventType, PeriodStartEvent } from '@app/models/live.js';
import { SubData } from './test-live-game-data.js';

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

export function buildPeriodStartEvent(startTime: number, currentPeriod = 1): PeriodStartEvent {
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

export function buildSubEvents(eventTime: number, sub: SubData): GameEventGroup {
  const subGroup: GameEventGroup = {
    groupedEvents: [],
  };
  subGroup.groupedEvents.push({
    id: `subeventid-${sub.nextId}`,
    // groupId: makeEventGroupId(groupIndex),
    type: GameEventType.SubIn,
    timestamp: eventTime,
    playerId: sub.nextId,
    data: {
      replaced: sub.replacedId,
      position: sub.finalPosition?.id,
    },
  });
  // eventIndex += 1;
  subGroup.groupedEvents.push({
    id: `subeventid-${sub.replacedId}`,
    // groupId: makeEventGroupId(groupIndex),
    type: GameEventType.SubOut,
    timestamp: eventTime,
    playerId: sub.replacedId,
    data: {},
  });
  return subGroup;
}
