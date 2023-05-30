/** @format */

import { createSlice } from '@reduxjs/toolkit';
import { EventCollection, EventCollectionData } from '../../models/events.js';
import { GameEvent, GameEventType, LivePlayer } from '../../models/live.js';
import { gameSetupCompleted } from './live-slice.js';

export interface EventsMap {
  [index: string]: EventCollectionData;
}

export interface EventState {
  events?: EventsMap;
}

export const EVENT_INITIAL_STATE: EventState = {
  events: undefined,
};

const eventSlice = createSlice({
  name: 'events',
  initialState: EVENT_INITIAL_STATE,
  reducers: {},

  extraReducers: (builder) => {
    builder.addCase(gameSetupCompleted, (state, action) => {
      if (!action.payload.gameId || !action.payload.liveGame?.players?.length) {
        return;
      }
      const gameEvents = getOrCreateGameEvents(state, action.payload.gameId);
      gameEvents.addEvent(buildGameEvent(GameEventType.Setup, {}));
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

function buildGameEvent(type: GameEventType, data: any, player?: LivePlayer): GameEvent {
  const event: GameEvent = {
    type,
    data,
  };
  if (player) {
    event.player = player;
  }
  return event;
}
