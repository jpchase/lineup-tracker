/** @format */

import { AnyAction, configureStore, Store, ThunkAction, ThunkDispatch } from '@reduxjs/toolkit';
import { listenerMiddleware } from './app/action-listeners.js';
import { middleware as dynamicMiddlewares } from './middleware/dynamic-middlewares.js';
import { configureAppStore } from './slices/app/app-module-configurator.js';
import { rootReducer, type RootState } from './slices/index.js';

export { RootState } from './slices/index.js';

export type RootStore = Store<RootState> & {
  dispatch: ThunkDispatch<RootState, undefined, AnyAction>;
};

export interface SliceStoreConfigurator {
  (storeInstance: RootStore, ...rest: any[]): RootStore;
}

export function setupStore(preloadedState?: RootState, hydrate: boolean = true) {
  const store: RootStore = configureStore({
    reducer: rootReducer,
    preloadedState,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(listenerMiddleware.middleware, dynamicMiddlewares),
  });

  // Initially loaded reducers.
  configureAppStore(store, hydrate);

  return store;
}

export const store = setupStore();

export type AppDispatch = typeof store.dispatch;
export type ThunkResult = ThunkAction<void, RootState, undefined, AnyAction>;
export type ThunkPromise<R> = ThunkAction<Promise<R>, RootState, undefined, AnyAction>;
