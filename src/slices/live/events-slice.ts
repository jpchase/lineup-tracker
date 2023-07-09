/** @format */

import { PayloadAction, createSlice } from '@reduxjs/toolkit';
import { CurrentTimeProvider } from '../../models/clock.js';
import { EventCollection, EventCollectionData } from '../../models/events.js';
import { GameEvent, GameEventType, LivePlayer } from '../../models/live.js';
import { LiveGamePayload } from './live-action-types.js';
import { actions } from './live-slice.js';

const { gameSetupCompleted, startPeriod } = actions;

export interface EventsMap {
  [index: string]: EventCollectionData;
}

export interface EventState {
  events?: EventsMap;
}

export const EVENTS_INITIAL_STATE: EventState = {
  events: undefined,
};

const eventSlice = createSlice({
  name: 'events',
  initialState: EVENTS_INITIAL_STATE,
  reducers: {},

  extraReducers: (builder) => {
    builder
      .addCase(
        gameSetupCompleted,
        buildActionHandler((_state, action) => {
          if (!action.payload.liveGame?.players?.length) {
            return undefined;
          }
          return buildGameEvent(GameEventType.Setup, {});
        })
      )
      .addCase(
        startPeriod,
        buildActionHandler((_state, action) => {
          if (!action.payload.gameAllowsStart) {
            return undefined;
          }
          // TODO: Use shared start time, provided in payload
          const startTime = new CurrentTimeProvider().getCurrentTime();
          return buildGameEvent(
            GameEventType.StartPeriod,
            {
              clock: {
                // TODO: Use currentPeriod from payload
                currentPeriod: 1,
                startTime,
              },
            },
            undefined,
            /* timestamp= */ startTime
          );
        })
      );
  },
});

const { reducer } = eventSlice;

export const eventsReducer = reducer;

type EventActionHandler<P extends LiveGamePayload> = (
  state: EventState,
  action: PayloadAction<P>
) => GameEvent | undefined;

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
  const eventToBeAdded = handler(state, action);
  if (!eventToBeAdded) {
    return;
  }
  const gameEvents = getOrCreateGameEvents(state, action.payload.gameId);
  gameEvents.addEvent(eventToBeAdded);
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
  data: any,
  player?: LivePlayer,
  timestamp?: number
): GameEvent {
  const event: GameEvent = {
    type,
    data,
    timestamp,
  };
  if (player) {
    event.player = player;
  }
  return event;
}
