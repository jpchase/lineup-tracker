/** @format */

import { AnyAction, configureStore, Store, ThunkAction, ThunkDispatch } from '@reduxjs/toolkit';
import { listenerMiddleware } from './app/action-listeners.js';
import { middleware as dynamicMiddlewares } from './middleware/dynamic-middlewares.js';
import { configureAppStore } from './slices/app/app-module-configurator.js';
import type { APP_SLICE_NAME, AppState } from './slices/app/app-slice.js';
import type { AuthState } from './slices/auth/auth-slice.js';
import type { GameState } from './slices/game/game-slice.js';
import { rootReducer } from './slices/index.js';
import type { LiveState } from './slices/live/index.js';
import type { TeamState } from './slices/team/team-slice.js';

// Overall state extends static states and partials lazy states.
export interface RootState {
  [APP_SLICE_NAME]?: AppState;
  auth?: AuthState;
  game?: GameState;
  live?: LiveState;
  team?: TeamState;
}

export type RootStore = Store<RootState> & {
  dispatch: ThunkDispatch<RootState, undefined, AnyAction>;
};

export interface SliceStoreConfigurator {
  (storeInstance?: RootStore, ...rest: any[]): RootStore;
}

export function setupStore(preloadedState?: RootState, hydrate: boolean = true) {
  // Initializes the Redux store with a lazyReducerEnhancer, to allow adding reducers
  // after the store is created.
  //  - Type magic is a workaround for https://github.com/reduxjs/redux-toolkit/issues/2241
  const baseStore = configureStore({
    reducer: rootReducer,
    preloadedState,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(listenerMiddleware.middleware, dynamicMiddlewares),
  });
  type BaseStore = typeof baseStore;

  const store: RootStore = baseStore as BaseStore;

  // Initially loaded reducers.
  configureAppStore(store, hydrate);

  return store;
}

export const store: RootStore = setupStore();

export type AppDispatch = typeof store.dispatch;
export type ThunkResult = ThunkAction<void, RootState, undefined, AnyAction>;
export type ThunkPromise<R> = ThunkAction<Promise<R>, RootState, undefined, AnyAction>;
