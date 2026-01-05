/** @format */

import { Reducer, createNextState } from '@reduxjs/toolkit';
import { PersistConfig } from 'redux-persist';
import { SliceConfigurator, buildSliceConfigurator } from '../slice-configurator.js';
import { EVENTS_INITIAL_STATE, eventsReducer, setupEventsListeners } from './events-slice.js';
import { LIVE_GAME_INITIAL_STATE, LiveState, liveSlice } from './live-slice.js';
import { shift } from './shift-slice.js';

const LIVE_INITIAL_STATE: LiveState = {
  ...LIVE_GAME_INITIAL_STATE,
  // TODO: Figure out to address circular dependency
  ...EVENTS_INITIAL_STATE,
  // events: undefined,
};

export const live: Reducer<LiveState> = function reduce(state, action) {
  // Use immer so that a new object is returned only when something actually changes.
  // This is important to avoid triggering unnecessary rendering cycles.
  // - The |state| might be undefined on app initialization. Immer will *not*
  //   create a draft for undefined, which causes an error for Object.assign().
  //   As a workaround, pass the |LIVE_INITIAL_STATE|, even though it seems redundant with
  //   the inner reducers.
  return createNextState(state || LIVE_INITIAL_STATE, (draft) => {
    Object.assign(draft, liveSlice.reducer(draft, action));
    // eslint-disable-next-line no-param-reassign
    draft!.shift = shift(draft?.shift, action);
    Object.assign(draft, eventsReducer(draft, action));
  }) as LiveState;
};

export function getLiveSliceConfigurator(): SliceConfigurator {
  const persistConfig: Partial<PersistConfig<LiveState>> = {
    whitelist: ['events', 'games', 'shift'],
  };
  return buildSliceConfigurator(
    {
      name: liveSlice.name,
      reducerPath: liveSlice.reducerPath,
      reducer: live,
      setupListeners: setupEventsListeners,
    },
    persistConfig,
  );
}
