/** @format */

import { createSlice } from '@reduxjs/toolkit';
import { CurrentTimeProvider } from '../../models/clock.js';
import { EventCollection, EventCollectionData } from '../../models/events.js';
import { GameEvent, GameEventType, LivePlayer } from '../../models/live.js';
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
      .addCase(gameSetupCompleted, (state, action) => {
        if (!action.payload.gameId || !action.payload.liveGame?.players?.length) {
          return;
        }
        const gameEvents = getOrCreateGameEvents(state, action.payload.gameId);
        gameEvents.addEvent(buildGameEvent(GameEventType.Setup, {}));
        setGameEvents(state, gameEvents);
      })
      .addCase(startPeriod, (state, action) => {
        if (!action.payload.gameId || !action.payload.gameAllowsStart) {
          return;
        }
        const gameEvents = getOrCreateGameEvents(state, action.payload.gameId);
        // TODO: Use shared start time, provided in payload
        const startTime = new CurrentTimeProvider().getCurrentTime();
        gameEvents.addEvent(
          buildGameEvent(
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
          )
        );
        setGameEvents(state, gameEvents);
      });
  },
});

const { reducer } = eventSlice;

export const eventsReducer = reducer;

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
