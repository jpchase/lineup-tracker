/** @format */

import { PayloadAction, createSlice } from '@reduxjs/toolkit';
import { CurrentTimeProvider } from '../../models/clock.js';
import { EventCollection, EventCollectionData } from '../../models/events.js';
import { GameEvent, GameEventType } from '../../models/live.js';
import { LiveGamePayload } from './live-action-types.js';
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
        buildActionHandler((_state, action) => {
          const eventTime = new CurrentTimeProvider().getCurrentTime();
          const subEvents = [];
          for (const sub of action.payload.subs) {
            if (action.payload.selectedOnly && !sub.selected) {
              continue;
            }
            // Record two events:
            //  1) Sub in: for the player coming in.
            //  2) Sub out: for the player going out.
            // TODO: add a "event group id" to link all events that happened together?
            //       or just rely on having the same timestamp?
            subEvents.push(
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
            subEvents.push(buildGameEvent(GameEventType.SubOut, {}, sub.replaces, eventTime));
          }
          return subEvents;
        })
      );
  },
});

const { reducer } = eventSlice;

export const eventsReducer = reducer;

type EventActionHandler<P extends LiveGamePayload> = (
  state: EventState,
  action: PayloadAction<P>
) => GameEvent | GameEvent[] | undefined;

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
  const eventsToBeAdded = handler(state, action);
  if (!eventsToBeAdded) {
    return;
  }
  const gameEvents = getOrCreateGameEvents(state, action.payload.gameId);
  if (Array.isArray(eventsToBeAdded)) {
    for (const event of eventsToBeAdded) {
      gameEvents.addEvent(event);
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
