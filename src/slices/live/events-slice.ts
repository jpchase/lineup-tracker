/** @format */

import { PayloadAction, Unsubscribe, createSlice } from '@reduxjs/toolkit';
import { AppStartListening } from '../../app/action-listeners.js';
import { RootState } from '../../app/store.js';
import { CurrentTimeProvider } from '../../models/clock.js';
import { EventCollection, EventCollectionData } from '../../models/events.js';
import {
  ClockToggleEvent,
  GameEvent,
  GameEventCollection,
  GameEventCollectionData,
  GameEventGroup,
  GameEventType,
  PeriodEndEvent,
  PeriodStartEvent,
  PositionSwapEvent,
  SetupEvent,
  SetupEventData,
  SubInEvent,
  SubOutEvent,
  isGamePlayerEvent,
} from '../../models/live.js';
import { PlayerStatus } from '../../models/player.js';
import { logger } from '../../util/logger.js';
import {
  EventSelectedPayload,
  EventUpdateRequestedPayload,
  LiveGamePayload,
  eventsUpdated,
  extractIdFromSwapPlayerId,
} from './live-action-types.js';
import { actions } from './live-slice.js';

const { applyPendingSubs, gameSetupCompleted, startPeriod, endPeriod, toggleClock } = actions;

const debugEvents = logger('events');

export type EventsMap = Record<string, EventCollectionData<GameEvent>>;

export interface EventState {
  events?: EventsMap;
  eventsSelectedIds?: string[];
}

export const EVENTS_INITIAL_STATE: EventState = {
  events: undefined,
  eventsSelectedIds: undefined,
};

const selectEventState = (state: RootState): EventState | undefined => {
  return state.live;
};

export const selectGameEvents = (state: RootState, gameId: string) => {
  const eventState = selectEventState(state);
  if (!eventState || !gameId) {
    return undefined;
  }
  return getGameEventData(eventState, gameId);
};

export const selectEventsSelected = (state: RootState) => {
  return state.live?.eventsSelectedIds?.slice();
};

type EventOrGroup = GameEvent | GameEventGroup;
type SetupEventStarters = SetupEventData['starters'];

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
    eventUpdateRequested: {
      reducer: (state: EventState, action: PayloadAction<EventUpdateRequestedPayload>) => {
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
            debugEvents(`game events does not have ${eventId}`);
            continue;
          }
          selectedEvent.timestamp = updatedEventTime;
          if (selectedEvent.type === GameEventType.PeriodStart) {
            selectedEvent.data.clock.startTime = updatedEventTime;
          } else if (selectedEvent.type === GameEventType.PeriodEnd) {
            selectedEvent.data.clock.endTime = updatedEventTime;
          } else if (selectedEvent.type === GameEventType.ClockToggle) {
            selectedEvent.data.clock.toggleTime = updatedEventTime;
          }
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
        customTime?: number,
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
            starters: game.players.reduce((result, player) => {
              if (player.status === PlayerStatus.On) {
                result.push({ id: player.id, position: player.currentPosition?.id! });
              }
              return result;
            }, [] as SetupEventStarters),
          });
        }),
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
            /* timestamp= */ startTime,
          );
        }),
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
            /* timestamp= */ endTime,
          );
        }),
      )
      .addCase(
        toggleClock,
        buildActionHandler((action) => {
          if (!action.payload.gameAllowsToggle) {
            return undefined;
          }
          const toggleTime = action.payload.toggleTime!;
          return buildGameEvent<ClockToggleEvent>(
            GameEventType.ClockToggle,
            {
              clock: {
                currentPeriod: action.payload.currentPeriod!,
                toggleTime,
                isRunning: action.payload.isRunning!,
              },
            },
            undefined,
            /*timestamp =*/ toggleTime,
          );
        }),
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
                  eventTime,
                ),
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
                eventTime,
              ),
            );
            subGroup.groupedEvents.push(
              buildGameEvent<SubOutEvent>(GameEventType.SubOut, {}, sub.replaces, eventTime),
            );
            subEvents.push(subGroup);
          }
          return subEvents;
        }),
      );
  },
});

const { reducer } = eventSlice;

export const eventsReducer = reducer;
export const { eventSelected, eventUpdateRequested } = eventSlice.actions;

type EventActionHandler<P extends LiveGamePayload> = (
  action: PayloadAction<P>,
) => GameEvent | EventOrGroup[] | undefined;

export function setupEventsListeners(startListening: AppStartListening): Unsubscribe {
  debugEvents('setupEventListeners - start');
  const subscriptions = [
    startListening({
      actionCreator: eventUpdateRequested,
      effect: async (action, listenerApi) => {
        debugEvents(`EL: action = ${JSON.stringify(action)}`);
        const gameEvents = getOrCreateGameEvents(
          selectEventState(listenerApi.getState())!,
          action.payload.gameId,
        );

        // Get the latest version of each of the updated events
        const events: GameEvent[] = [];
        for (const eventId of action.payload.updatedEventIds) {
          events.push(gameEvents.get(eventId)!);
        }

        await listenerApi.dispatch(eventsUpdated(action.payload.gameId, events));
        debugEvents(`EL: action dispatched`);
      },
    }),
  ];

  return () => {
    subscriptions.forEach((unsubscribe) => unsubscribe());
  };
}

function buildActionHandler<P extends LiveGamePayload>(handler: EventActionHandler<P>) {
  return (state: EventState, action: PayloadAction<P>) => {
    return invokeActionHandler(state, action, handler);
  };
}

function invokeActionHandler<P extends LiveGamePayload>(
  state: EventState,
  action: PayloadAction<P>,
  handler: EventActionHandler<P>,
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
  timestamp?: number,
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
