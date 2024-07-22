/** @format */

import { Reducer, StoreEnhancer, Unsubscribe, nanoid } from '@reduxjs/toolkit';
import { PersistConfig, persistReducer, persistStore } from 'redux-persist';
import { AppStartListening, startAppListening } from '../app/action-listeners.js';
import { debug } from '../common/debug.js';
import { rootReducer } from '../slices/reducer.js';
import { AppStore } from '../store.js';
import { IdbPersistStorage } from './idb-persist-storage.js';

export interface SliceConfig {
  // Turn off hydration, which is enabled by default (if supported by the slice).
  //  - Primarily used for testing.
  disableHydration?: boolean;
}

export interface SliceConfigStore {
  sliceConfig: SliceConfig;
}

export interface SliceConfigurator {
  (storeInstance: AppStore /*, config?: SliceConfig*/): void;
}

export interface SliceSetupListeners {
  (startListening: AppStartListening): Unsubscribe;
}

export interface SliceConfigurator2 {
  name: string;
  configure(storeInstance: AppStore, config?: SliceConfig): void;
}

interface SliceLike<State> {
  name: string;
  reducerPath: string;
  reducer: Reducer<State>;
  setupListeners?: SliceSetupListeners;
}

function reducerPathExists(store: AppStore, reducerPath: string) {
  return Object.keys(store.getState()).includes(reducerPath);
}

export function buildSliceConfigurator<State>(
  slice: SliceLike<State>,
  persistConfig?: Partial<PersistConfig<State>>,
): SliceConfigurator {
  const debugConfig = debug(`config[${slice.name}]`);

  function initReducer(store: AppStore, hydrate: boolean) {
    let reducer;
    const persisted = hydrate && persistConfig;
    if (persisted) {
      const fullConfig: PersistConfig<State> = {
        ...persistConfig,
        key: slice.reducerPath,
        storage: new IdbPersistStorage(),
        debug: true,
      };

      reducer = persistReducer(fullConfig, slice.reducer);
    } else {
      reducer = slice.reducer;
    }

    debugConfig(`initReducer: add the ${persisted ? 'persist-wrapped' : 'slice'} reducer`);

    rootReducer.inject({
      reducerPath: slice.reducerPath,
      reducer: reducer as typeof slice.reducer,
    });
    const result = persisted ? persistStore(store) : undefined;
    // Force initialization of the slice state, if necessary.
    //  - The `inject()` call does *not* dispatch an action, which would initialize.
    //  - If persisted, the `persistStore()` call does dispatch an action.
    //  - Check for existence of the slice state, regardless. This is to be robust
    //    against changes in the `persistStore()` implementation.
    const stateExists = reducerPathExists(store, slice.reducerPath);
    debugConfig(`store contains the reducer path [${slice.reducerPath}]: ${stateExists}`);
    if (!stateExists) {
      // Dispatch a fake action to cause initialization. Use a random action type
      // to prevent special handling of the the fake action.
      store.dispatch({ type: nanoid() });
    }
    return result;
  }

  return (store: AppStore /*, config?: SliceConfig*/) => {
    if (!store) {
      throw new Error(`storeInstance must be provided`);
    }
    const stateExists = reducerPathExists(store, slice.reducerPath);
    debugConfig(
      `started: state exists = ${stateExists}, config = ${JSON.stringify(store?.sliceConfig)}`,
    );
    if (!stateExists) {
      debugConfig(`state missing for [${slice.reducerPath}], add reducer`);
      // Lazy load the reducer.
      const hydrate = !store.sliceConfig.disableHydration;
      initReducer(store, hydrate);

      if (slice.setupListeners) {
        debugConfig(`setup listeners`);
        /*const listeners =*/ slice.setupListeners(startAppListening);
        // TODO: wrap listeners in an unsubcribe function, that actually gets used
      }
    }
    debugConfig('ended');
  };
}

export function buildSliceConfigStoreEnhancer(
  config: SliceConfig,
): StoreEnhancer<SliceConfigStore> {
  return (nextCreator) => {
    return (origReducer, preloadedState) => {
      const nextStore = nextCreator(origReducer, preloadedState);
      return {
        ...nextStore,
        sliceConfig: { ...config },
      };
    };
  };
}
