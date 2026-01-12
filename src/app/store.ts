/** @format */

import { AnyAction, configureStore, createDynamicMiddleware, ThunkAction } from '@reduxjs/toolkit';
import { getAppSliceConfigurator } from '../slices/app/index.js';
import { rootReducer, type RootState } from '../slices/reducer.js';
import { buildSliceConfigStoreEnhancer, SliceConfig } from '../slices/slice-configurator.js';
import { listenerMiddleware } from './action-listeners.js';

export { RootState } from '../slices/reducer.js';

const dynamicMiddlewareInstance = createDynamicMiddleware();
export const { addMiddleware } = dynamicMiddlewareInstance;

export function setupStore(preloadedState?: RootState, hydrate = true) {
  const sliceConfig: SliceConfig = { disableHydration: !hydrate };

  const store = configureStore({
    reducer: rootReducer,
    preloadedState,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(
        listenerMiddleware.middleware,
        dynamicMiddlewareInstance.middleware,
      ),
    enhancers: (getDefaultEnhancers) =>
      getDefaultEnhancers().concat(buildSliceConfigStoreEnhancer(sliceConfig)),
  });

  // Initially loaded reducers.
  //  - The app slice is not lazy-loaded, but it's configuration depends on whether
  //    hydration is enabled.
  const appConfigurator = getAppSliceConfigurator();
  appConfigurator(store);

  return store;
}

export const store = setupStore();

export type AppStore = typeof store;
export type AppDispatch = typeof store.dispatch;
export type ThunkResult = ThunkAction<void, RootState, undefined, AnyAction>;
export type ThunkPromise<R> = ThunkAction<Promise<R>, RootState, undefined, AnyAction>;
