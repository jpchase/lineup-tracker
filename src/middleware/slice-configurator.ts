/** @format */

import { Slice } from '@reduxjs/toolkit';
import { PersistConfig, persistReducer, persistStore } from 'redux-persist';
import { debug } from '../common/debug.js';
import { rootReducer } from '../slices/index.js';
import { RootStore } from '../store.js';
import { IdbPersistStorage } from './idb-persist-storage.js';

export interface SliceConfig {
  // Turn off hydration, which is enabled by default (if supported by the slice).
  //  - Primarily used for testing.
  disableHydration: boolean;
}

export interface SliceConfigurator {
  (storeInstance: RootStore, config?: SliceConfig): void;
}

export interface SliceConfigurator2 {
  name: string;
  configure(storeInstance: RootStore, config?: SliceConfig): void;
}

export function buildSliceConfigurator<State>(
  slice: Slice<State>,
  persistConfig?: Partial<PersistConfig<State>>
): SliceConfigurator {
  const debugConfig = debug(`config[${slice.name}]`);
  // TODO: Does the "initialized" flag need to be per store instance?
  // This would only be a problem in tests where there are multiple instances created?
  let initialized = false;

  function initReducer(store: RootStore, hydrate: boolean) {
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
    return persisted ? persistStore(store) : undefined;
  }

  return (storeInstance: RootStore, config?: SliceConfig) => {
    debugConfig(
      `started: storeInstance is set ${!!storeInstance}, config = ${JSON.stringify(config)}`
    );
    if (!storeInstance) {
      throw new Error(`storeInstance must be provided`);
    }
    if (!initialized) {
      debugConfig('first call, do initialization');
      // Lazy load the reducer
      initReducer(storeInstance, !config?.disableHydration);
      initialized = true;
    }
    debugConfig('ended');
  };
}
