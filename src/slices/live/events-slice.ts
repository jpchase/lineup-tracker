/** @format */

import { PayloadAction, createSlice } from '@reduxjs/toolkit';
import { CurrentTimeProvider } from '../../models/clock.js';
import { EventCollection, EventCollectionData } from '../../models/events.js';
import { GameEvent, GameEventGroup, GameEventType } from '../../models/live.js';
import { LiveGamePayload, extractIdFromSwapPlayerId } from './live-action-types.js';
import { actions } from './live-slice.js';

const { applyPendingSubs, gameSetupCompleted, startPeriod } = actions;

export interface EventsMap {
  [index: string]: EventCollectionData;
}

export interface EventState {
  events?: EventsMap;
}

export const EVENTS_INITIAL_STATE: EventState = {
  events: undefined,
};

type EventOrGroup = GameEvent | GameEventGroup;

const eventSlice = createSlice({
  name: 'events',
  initialState: EVENTS_INITIAL_STATE,
  reducers: {},

  extraReducers: (builder) => {
    builder
      .addCase(
        gameSetupCompleted,
        buildActionHandler((action) => {
          if (!action.payload.liveGame?.players?.length) {
            return undefined;
          }
          return buildGameEvent(GameEventType.Setup, {});
        })
      )
      .addCase(
        startPeriod,
        buildActionHandler((action) => {
          if (!action.payload.gameAllowsStart) {
            return undefined;
          }
          const startTime = action.payload.startTime!;
          return buildGameEvent(
            GameEventType.StartPeriod,
            {
              clock: {
                currentPeriod: action.payload.currentPeriod!,
                startTime,
              },
            },
            undefined,
            /* timestamp= */ startTime
          );
        })
      )
      .addCase(
        applyPendingSubs,
        buildActionHandler((action) => {
          const eventTime = new CurrentTimeProvider().getCurrentTime();
          const subEvents: EventOrGroup[] = [];
          for (const sub of action.payload.subs) {
            if (action.payload.selectedOnly && !sub.selected) {
              continue;
            }
            if (sub.isSwap) {
              subEvents.push(
                buildGameEvent(
                  GameEventType.Swap,
                  {
                    position: sub.nextPosition?.id,
                  },
                  extractIdFromSwapPlayerId(sub.id),
                  eventTime
                )
              );
              continue;
            }
            // Record two events for a regular substitution:
            //  1) Sub in: for the player coming in.
            //  2) Sub out: for the player going out.
            // TODO: add a "event group id" to link all events that happened together?
            //       or just rely on having the same timestamp?
            const subGroup: GameEventGroup = {
              groupedEvents: [],
            };
            subGroup.groupedEvents.push(
              buildGameEvent(
                GameEventType.SubIn,
                {
                  position: sub.currentPosition?.id,
                  replaced: sub.replaces,
                },
                sub.id,
                eventTime
              )
            );
            subGroup.groupedEvents.push(
              buildGameEvent(GameEventType.SubOut, {}, sub.replaces, eventTime)
            );
            subEvents.push(subGroup);
          }
          return subEvents;
        })
      );
  },
});

const { reducer } = eventSlice;

export const eventsReducer = reducer;

type EventActionHandler<P extends LiveGamePayload> = (
  action: PayloadAction<P>
) => GameEvent | EventOrGroup[] | undefined;

function buildActionHandler<P extends LiveGamePayload>(handler: EventActionHandler<P>) {
  return (state: EventState, action: PayloadAction<P>) => {
    return invokeActionHandler(state, action, handler);
  };
}

function invokeActionHandler<P extends LiveGamePayload>(
  state: EventState,
  action: PayloadAction<P>,
  handler: EventActionHandler<P>
) {
  if (!action.payload.gameId) {
    return;
  }
  const eventsToBeAdded = handler(action);
  if (!eventsToBeAdded) {
    return;
  }
  const gameEvents = getOrCreateGameEvents(state, action.payload.gameId);
  if (Array.isArray(eventsToBeAdded)) {
    for (const eventOrGroup of eventsToBeAdded) {
      if ('groupedEvents' in eventOrGroup) {
        gameEvents.addEventGroup(eventOrGroup.groupedEvents);
      } else {
        gameEvents.addEvent(eventOrGroup);
      }
    }
  } else {
    gameEvents.addEvent(eventsToBeAdded);
  }
  setGameEvents(state, gameEvents);
}

function getGameEvents(state: EventState, gameId: string): EventCollection | undefined {
  if (!state.events || !(gameId in state.events)) {
    return undefined;
  }
  const data = state.events[gameId];
  if (!data) {
    return undefined;
  }
  return EventCollection.create(data);
}

function getOrCreateGameEvents(state: EventState, gameId: string): EventCollection {
  return getGameEvents(state, gameId) ?? EventCollection.create({ id: gameId });
}

function setGameEvents(state: EventState, gameEvents: EventCollection) {
  if (!state.events) {
    state.events = {};
  }
  state.events[gameEvents.id] = gameEvents.toJSON();
}

function buildGameEvent(
  type: GameEventType,
  data: Record<string, unknown>,
  playerId?: string,
  timestamp?: number
): GameEvent {
  const event: GameEvent = {
    type,
    data,
    timestamp,
  };
  if (playerId) {
    event.playerId = playerId;
  }
  return event;
}
