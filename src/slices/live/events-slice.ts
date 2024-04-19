/** @format */

import { PayloadAction, createSlice } from '@reduxjs/toolkit';
import { CurrentTimeProvider } from '../../models/clock.js';
import { EventCollection, EventCollectionData } from '../../models/events.js';
import {
  GameEvent,
  GameEventCollection,
  GameEventCollectionData,
  GameEventGroup,
  GameEventType,
  PeriodEndEvent,
  PeriodStartEvent,
  PositionSwapEvent,
  SetupEvent,
  SubInEvent,
  SubOutEvent,
  isGamePlayerEvent,
} from '../../models/live.js';
import { RootState } from '../../store.js';
import {
  EventSelectedPayload,
  EventsUpdatedPayload,
  LiveGamePayload,
  extractIdFromSwapPlayerId,
} from './live-action-types.js';
import { actions } from './live-slice.js';

const { applyPendingSubs, gameSetupCompleted, startPeriod, endPeriod } = actions;

export interface EventsMap {
  [index: string]: EventCollectionData<GameEvent>;
}

export interface EventState {
  events?: EventsMap;
  eventsSelectedIds?: string[];
}

export const EVENTS_INITIAL_STATE: EventState = {
  events: undefined,
  eventsSelectedIds: undefined,
};

export const selectGameEvents = (state: RootState, gameId: string) => {
  if (!state.live || !gameId) {
    return undefined;
  }
  return getGameEventData(state.live, gameId);
};

export const selectEventsSelected = (state: RootState) => {
  return state.live?.eventsSelectedIds?.slice();
};

type EventOrGroup = GameEvent | GameEventGroup;

const eventSlice = createSlice({
  name: 'events',
  initialState: EVENTS_INITIAL_STATE,
  reducers: {
    eventSelected: {
      reducer: (state: EventState, action: PayloadAction<EventSelectedPayload>) => {
        const eventId = action.payload.eventId;

        const gameEvents = getOrCreateGameEvents(state, action.payload.gameId);
        const selectedEvent = gameEvents.get(eventId);
        if (!selectedEvent) {
          return;
        }

        if (!state.eventsSelectedIds) {
          state.eventsSelectedIds = [];
        }

        if (action.payload.selected) {
          if (state.eventsSelectedIds.includes(eventId)) {
            // Already selected
            return;
          }
          state.eventsSelectedIds.push(eventId);
        } else {
          const index = state.eventsSelectedIds.indexOf(eventId);
          if (index >= 0) {
            state.eventsSelectedIds.splice(index, 1);
          }
        }
      },
      prepare: (gameId: string, eventId: string, selected: boolean) => {
        return {
          payload: {
            gameId,
            eventId,
            selected: !!selected,
          },
        };
      },
    },
    eventsUpdated: {
      reducer: (state: EventState, action: PayloadAction<EventsUpdatedPayload>) => {
        const gameEvents = getOrCreateGameEvents(state, action.payload.gameId);

        let updatedEventTime: number;
        if (action.payload.useExistingTime) {
          const existingEvent = gameEvents.get(action.payload.existingEventId!);
          if (!existingEvent) {
            // TODO: Error?
            return;
          }
          updatedEventTime = existingEvent.timestamp!;
        } else {
          if (!action.payload.customTime) {
            // TODO: Error?
            return;
          }
          updatedEventTime = action.payload.customTime;
        }

        for (const eventId of action.payload.updatedEventIds) {
          const selectedEvent = gameEvents.get(eventId);
          if (!selectedEvent) {
            continue;
          }
          selectedEvent.timestamp = updatedEventTime;
        }

        // Committing an update just clears all selected events, for simplicity.
        // The provided list of event IDs should always be the same as the currently
        // selected.
        state.eventsSelectedIds = [];
        setGameEvents(state, gameEvents);
      },
      prepare: (
        gameId: string,
        updatedEventIds: string[],
        useExistingTime: boolean,
        existingEventId?: string,
        customTime?: number
      ) => {
        return {
          payload: {
            gameId,
            updatedEventIds,
            useExistingTime,
            existingEventId,
            customTime,
          },
        };
      },
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(
        gameSetupCompleted,
        buildActionHandler((action) => {
          const game = action.payload.liveGame;
          if (!game.players?.length) {
            return undefined;
          }
          return buildGameEvent<SetupEvent>(GameEventType.Setup, {
            clock: {
              periodLength: game.clock?.periodLength!,
              totalPeriods: game.clock?.totalPeriods!,
            },
          });
        })
      )
      .addCase(
        startPeriod,
        buildActionHandler((action) => {
          if (!action.payload.gameAllowsStart) {
            return undefined;
          }
          const startTime = action.payload.startTime!;
          return buildGameEvent<PeriodStartEvent>(
            GameEventType.PeriodStart,
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
        endPeriod,
        buildActionHandler((action) => {
          if (!action.payload.gameAllowsEnd) {
            return undefined;
          }
          const endTime = action.payload.stopTime!;
          return buildGameEvent<PeriodEndEvent>(
            GameEventType.PeriodEnd,
            {
              clock: {
                currentPeriod: action.payload.currentPeriod!,
                endTime,
              },
            },
            undefined,
            /* timestamp= */ endTime
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
                buildGameEvent<PositionSwapEvent>(
                  GameEventType.Swap,
                  {
                    position: sub.nextPosition?.id!,
                    previousPosition: sub.currentPosition?.id!,
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
              buildGameEvent<SubInEvent>(
                GameEventType.SubIn,
                {
                  position: sub.currentPosition?.id!,
                  replaced: sub.replaces!,
                },
                sub.id,
                eventTime
              )
            );
            subGroup.groupedEvents.push(
              buildGameEvent<SubOutEvent>(GameEventType.SubOut, {}, sub.replaces, eventTime)
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
export const { eventSelected, eventsUpdated } = eventSlice.actions;

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

function getGameEventData(state: EventState, gameId: string): GameEventCollectionData | undefined {
  if (!state.events || !(gameId in state.events)) {
    return undefined;
  }
  return state.events[gameId];
}

function getOrCreateGameEvents(state: EventState, gameId: string): GameEventCollection {
  return EventCollection.create<GameEvent>(getGameEventData(state, gameId) ?? { id: gameId });
}

function setGameEvents(state: EventState, gameEvents: GameEventCollection) {
  if (!state.events) {
    state.events = {};
  }
  state.events[gameEvents.id] = gameEvents.toJSON();
}

function buildGameEvent<Event extends GameEvent, EventData = Event['data']>(
  type: GameEventType,
  data: EventData,
  playerId?: string,
  timestamp?: number
): Event {
  const event = {
    type,
    data,
    timestamp,
  } as Event;
  if (isGamePlayerEvent(event)) {
    if (!playerId) {
      throw new Error(`Event type ${type} must provide valid 'playerId'`);
    }
    event.playerId = playerId;
  }
  return event;
}
