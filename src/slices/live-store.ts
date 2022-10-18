import { PersistConfig, persistReducer, persistStore } from 'redux-persist';
import { debug } from '../common/debug.js';
import { IdbPersistStorage } from '../middleware/idb-persist-storage.js';
import { RootStore, SliceStoreConfigurator, store as globalStore } from '../store.js';
import { live, LiveState } from './live/live-slice.js';

const debugStore = debug('live-store');

const REDUCER_KEY = 'live';
let initialized = false;

export function getLiveStore(storeInstance?: RootStore, hydrate: boolean = true): RootStore {
  debugStore(`getLiveStore called: storeInstance is set ${storeInstance ? true : false}`);
  const store = storeInstance || globalStore;
  if (!initialized || !store.hasReducer(REDUCER_KEY)) {
    debugStore(`getLiveStore: ${initialized ? 'live state missing, add reducer' : 'first call, do initialization'}`);
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
      whitelist: ['games', 'shift'],
      debug: true
    }

    reducer = persistReducer(persistConfig, live);
  } else {
    reducer = live;
  }

  debugStore(`initReducer: add the ${hydrate ? 'persist-wrapped' : 'live'} reducer`);

  store.addReducers({
    [REDUCER_KEY]: reducer
  });
  return hydrate ? persistStore(store) : undefined;
}

export function getLiveStoreConfigurator(hydrate: boolean): SliceStoreConfigurator {
  return (storeInstance?: RootStore) => {
    return getLiveStore(storeInstance, hydrate);
  };
}
