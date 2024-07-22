/** @format */

import { CurrentTimeProvider } from '@app/models/clock.js';
import { EventCollection } from '@app/models/events.js';
import {
  GameEvent,
  GameEventCollection,
  GameEventGroup,
  GameEventType,
  LiveGame,
  PeriodEndEvent,
  PeriodStartEvent,
  PositionSwapEvent,
  SetupEvent,
  SubInEvent,
  SubOutEvent,
  getPlayer,
} from '@app/models/live.js';
import * as testlive from './test-live-game-data.js';
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

export function buildGameEvents(
  game: LiveGame,
  timeProvider: CurrentTimeProvider,
): GameEventCollection {
  const events = EventCollection.create<GameEvent>(
    {
      id: game.id,
    },
    timeProvider,
  );
  events.addEvent(buildGameSetupEvent(timeProvider.getCurrentTime()));
  events.addEvent(buildPeriodStartEvent(timeProvider.getCurrentTime()));

  // First sub
  const replacedPlayer1 = getPlayer(game, 'P4');
  const sub1: testlive.SubData = {
    nextId: 'P11',
    replacedId: replacedPlayer1?.id,
    finalPosition: { ...replacedPlayer1?.currentPosition! },
  };
  events.addEventGroup(buildSubEvents(timeProvider.getCurrentTime(), sub1).groupedEvents);

  // Second sub, with swap.
  //  - Swap player moves to the position of the player being replaced.
  //  - Sub player takes position left by swap player.
  const replacedPlayer2 = getPlayer(game, 'P5');
  const swapPlayer = getPlayer(game, 'P8');
  const sub2: testlive.SubData = {
    nextId: 'P12',
    replacedId: replacedPlayer2?.id,
    positionOverride: { ...swapPlayer?.currentPosition! },
    finalPosition: { ...swapPlayer?.currentPosition! },
  };
  const swap: testlive.SubData = {
    nextId: swapPlayer?.id!,
    initialPosition: { ...swapPlayer?.currentPosition! },
    finalPosition: { ...replacedPlayer2?.currentPosition! },
  };

  const sub2Time = timeProvider.getCurrentTime();
  events.addEventGroup(buildSubEvents(sub2Time, sub2).groupedEvents);
  events.addEvent(buildSwapEvent(sub2Time, swap));

  events.addEvent(buildPeriodEndEvent(timeProvider.getCurrentTime()));

  return events;
}
