/** @format */

import { PersistConfig, persistReducer, persistStore } from 'redux-persist';
import { debug } from '../../common/debug.js';
import { IdbPersistStorage } from '../../middleware/idb-persist-storage.js';
import { RootStore, SliceStoreConfigurator } from '../../store.js';
import { rootReducer } from '../reducer.js';
import { live } from './composed-reducer.js';
import { LiveState } from './live-slice.js';

const debugStore = debug('live-module');

const REDUCER_KEY = 'live';
let initialized = false;

export function getLiveStore(storeInstance: RootStore, hydrate: boolean = true): RootStore {
  debugStore(`getLiveStore called: storeInstance is set ${!!storeInstance}`);
  if (!storeInstance) {
    throw new Error(`configureAppStore: storeInstance must be provided`);
  }
  if (!initialized) {
    debugStore(
      `getLiveStore: ${
        initialized ? 'live state missing, add reducer' : 'first call, do initialization'
      }`
    );
    // Lazy load the reducer
    initReducer(storeInstance, hydrate);
    initialized = true;
  }
  return storeInstance;
}

function initReducer(store: RootStore, hydrate: boolean) {
  let reducer;
  if (hydrate) {
    const persistConfig: PersistConfig<LiveState> = {
      key: REDUCER_KEY,
      storage: new IdbPersistStorage(),
      whitelist: ['events', 'games', 'shift'],
      debug: true,
    };

    reducer = persistReducer(persistConfig, live);
  } else {
    reducer = live;
  }

  debugStore(`initReducer: add the ${hydrate ? 'persist-wrapped' : 'live'} reducer`);

  rootReducer.inject({
    reducerPath: REDUCER_KEY,
    reducer: reducer as typeof live,
  });
  return hydrate ? persistStore(store) : undefined;
}

export function getLiveStoreConfigurator(hydrate: boolean): SliceStoreConfigurator {
  return (storeInstance?: RootStore) => {
    if (!storeInstance) {
      throw new Error(`storeInstance must be provided`);
    }
    return getLiveStore(storeInstance, hydrate);
  };
}
