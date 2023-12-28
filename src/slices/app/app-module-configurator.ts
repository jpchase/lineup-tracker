/** @format */

import { PersistConfig, persistReducer, persistStore } from 'redux-persist';
import { debug } from '../../common/debug.js';
import { IdbPersistStorage } from '../../middleware/idb-persist-storage.js';
import type { RootStore, SliceStoreConfigurator } from '../../store.js';
import { rootReducer } from '../index.js';
import { APP_SLICE_NAME, AppState, appReducer, appSlice } from './app-slice.js';

const debugStore = debug('app-module');

let initialized = false;

export function configureAppStore(storeInstance: RootStore, hydrate: boolean): RootStore {
  debugStore(`configureAppStore called: storeInstance is set ${!!storeInstance}`);
  if (!storeInstance) {
    throw new Error(`configureAppStore: storeInstance must be provided`);
  }
  if (!initialized) {
    debugStore(
      `configureAppStore: ${
        initialized
          ? `state missing for [${APP_SLICE_NAME}], add reducer`
          : 'first call, do initialization'
      }`
    );
    let reducer;
    if (hydrate) {
      const persistConfig: PersistConfig<AppState> = {
        key: APP_SLICE_NAME,
        storage: new IdbPersistStorage(),
        whitelist: ['teamId', 'teamName'],
        debug: true,
      };
      reducer = persistReducer(persistConfig, appReducer);
    } else {
      reducer = appReducer;
    }

    debugStore(`configureAppStore: add the ${hydrate ? 'persist-wrapped' : 'app'} reducer`);
    rootReducer.inject({
      reducerPath: appSlice.name,
      reducer: reducer as typeof appSlice.reducer,
    });
    if (hydrate) {
      persistStore(storeInstance);
    }
    initialized = true;
  }
  return storeInstance;
}

export function getAppStoreConfigurator(hydrate: boolean): SliceStoreConfigurator {
  return (storeInstance?: RootStore) => {
    if (!storeInstance) {
      throw new Error(`storeInstance must be provided`);
    }
    return configureAppStore(storeInstance, hydrate);
  };
}
