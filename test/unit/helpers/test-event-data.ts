/** @format */

import {
  GameEventGroup,
  GameEventType,
  PeriodEndEvent,
  PeriodStartEvent,
  PositionSwapEvent,
  SetupEvent,
  SubInEvent,
  SubOutEvent,
} from '@app/models/live.js';
import { SubData } from './test-live-game-data.js';

export function buildGameSetupEvent(
  startTime: number,
  totalPeriods = 2,
  periodLength = 45,
): SetupEvent {
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
    id: `starteventid-${currentPeriod}`,
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

export function buildPeriodEndEvent(endTime: number, currentPeriod = 1): PeriodEndEvent {
  return {
    id: `endeventid-${currentPeriod}`,
    type: GameEventType.PeriodEnd,
    timestamp: endTime,
    data: {
      clock: {
        currentPeriod,
        endTime,
      },
    },
  };
}

export function buildSubEvents(eventTime: number, sub: SubData): GameEventGroup {
  const subGroup: GameEventGroup = {
    groupedEvents: [],
  };
  const inEvent: SubInEvent = {
    id: `subeventid-${sub.nextId}`,
    // groupId: makeEventGroupId(groupIndex),
    type: GameEventType.SubIn,
    timestamp: eventTime,
    playerId: sub.nextId,
    data: {
      replaced: sub.replacedId!,
      position: sub.finalPosition?.id!,
    },
  };
  const outEvent: SubOutEvent = {
    id: `subeventid-${sub.replacedId}`,
    // groupId: makeEventGroupId(groupIndex),
    type: GameEventType.SubOut,
    timestamp: eventTime,
    playerId: sub.replacedId!,
    data: {},
  };
  subGroup.groupedEvents.push(inEvent);
  subGroup.groupedEvents.push(outEvent);
  return subGroup;
}

export function buildSwapEvent(eventTime: number, swap: SubData): PositionSwapEvent {
  return {
    id: `swapeventid-${swap.nextId}`,
    type: GameEventType.Swap,
    timestamp: eventTime,
    playerId: swap.nextId,
    data: {
      position: swap.finalPosition?.id!,
      previousPosition: swap.initialPosition?.id!,
    },
  };
}
