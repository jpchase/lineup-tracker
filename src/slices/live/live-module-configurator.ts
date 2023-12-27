/** @format */

import { PersistConfig, persistReducer, persistStore } from 'redux-persist';
import { debug } from '../../common/debug.js';
import { IdbPersistStorage } from '../../middleware/idb-persist-storage.js';
import {
  OptionalReducer,
  RootStore,
  SliceStoreConfigurator,
  store as globalStore,
} from '../../store.js';
import { live } from './composed-reducer.js';
import { LiveState } from './live-slice.js';

const debugStore = debug('live-module');

const REDUCER_KEY = 'live';
let initialized = false;

export function getLiveStore(storeInstance?: RootStore, hydrate: boolean = true): RootStore {
  debugStore(`getLiveStore called: storeInstance is set ${!!storeInstance}`);
  const store = storeInstance || globalStore;
  if (!initialized || !store.hasReducer(REDUCER_KEY)) {
    debugStore(
      `getLiveStore: ${
        initialized ? 'live state missing, add reducer' : 'first call, do initialization'
      }`
    );
    // Lazy load the reducer
    initReducer(store, hydrate);
    initialized = true;
  }
  return store;
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

  store.addReducers({
    [REDUCER_KEY]: reducer as OptionalReducer<typeof live>,
  });
  return hydrate ? persistStore(store) : undefined;
}

export function getLiveStoreConfigurator(hydrate: boolean): SliceStoreConfigurator {
  return (storeInstance?: RootStore) => {
    return getLiveStore(storeInstance, hydrate);
  };
}
