import { Store } from 'redux';
import { PersistConfig, persistReducer, persistStore } from 'redux-persist';
import { hydrateLive } from '../actions/live.js';
import { debug } from '../common/debug';
import { IdbPersistStorage } from '../middleware/idb-persist-storage.js';
import { LiveGame, LiveGames } from '../models/live.js';
import { idb } from '../storage/idb-wrapper';
import { RootState, RootStore, SliceStoreConfigurator, store as globalStore } from '../store.js';
import { live, LiveState, selectCurrentLiveGame, selectCurrentShift } from './live/live-slice.js';
import { ShiftState } from './live/shift-slice.js';

const debugStore = debug('live-store');

const REDUCER_KEY = 'live';
const KEY_CACHED_LIVE = 'CACHED_LIVE';
interface CachedLive {
  currentGameId?: string;
  game?: LiveGame;
  shift?: ShiftState;
}
let initialized = false;
let cachedState: CachedLive = {};

export function getLiveStore(storeInstance?: RootStore, hydrate: boolean = true): RootStore {
  debugStore(`getLiveStore called: storeInstance is set ${storeInstance ? true : false}`);
  const store = storeInstance || globalStore;
  if (!initialized) {
    debugStore('getLiveStore: first call, do initialization');
    // Lazy load the reducer
    initReducer(store);

    if (hydrate) {
      debugStore('getLiveStore: setup hydration');
      hydrateState(store);

      store.subscribe(() => {
        debugStore('getLiveStore: in store.subscribe()');
        persistState(store);
      });
    }
    initialized = true;
  } else if (!store.hasReducer(REDUCER_KEY)) {
    debugStore('getLiveStore: live state missing, add reducer');
    // Lazy load the reducer
    initReducer(store);
  }
  return store;
}

function initReducer(store: RootStore) {
  const persistConfig: PersistConfig<LiveState> = {
    key: REDUCER_KEY,
    storage: new IdbPersistStorage(),
    whitelist: ['games', 'shift'],
    debug: true
  }

  const liveReducer = persistReducer(persistConfig, live);

  debugStore('initReducer: add the persist-wrapped reducer');
  store.addReducers({
    [REDUCER_KEY]: liveReducer
  });
  return persistStore(store);
}

export function getLiveStoreConfigurator(hydrate: boolean): SliceStoreConfigurator {
  return (storeInstance?: RootStore) => {
    return getLiveStore(storeInstance, hydrate);
  };
}

export function hydrateState(storeInstance: Store<RootState>) {
  debugStore('hydrateState: start');
  idb.get(KEY_CACHED_LIVE).then((value) => {
    if (!value) {
      debugStore('hydrateState: nothing in idb');
      return;
    }
    cachedState = value as CachedLive;
    debugStore(`hydrateState: hydrate action about to send:\n${JSON.stringify(cachedState)}`);
    const games: LiveGames = {};
    if (cachedState.game) {
      games[cachedState.game.id] = cachedState.game;
    }
    storeInstance.dispatch(hydrateLive(games, cachedState.currentGameId, cachedState.shift));
    debugStore('hydrateState: hydrate action done');
  });
}

export function persistState(storeInstance: Store<RootState>) {
  debugStore('persistState: start');
  const state = storeInstance.getState();

  const currentGame = selectCurrentLiveGame(state);
  if (!currentGame) {
    debugStore('persistState: current game missing');
    return;
  }

  const currentShift = selectCurrentShift(state);

  // Checks if the state is already cached, by reference comparison.
  // As state is immutable, different references imply updates.
  if (cachedState.game === currentGame &&
    cachedState.shift == currentShift) {
    debugStore(`persistState: current state already cached: ${currentGame.id}`);
    return;
  }
  // Store games in idb
  const newCache: CachedLive = {
    ...cachedState,
    currentGameId: currentGame.id,
    game: currentGame,
    shift: currentShift
  };
  idb.set(KEY_CACHED_LIVE, newCache).then(() => {
    debugStore(`persistState: idb updated for: ${currentGame.id}`);
    cachedState = newCache;
  });
}

export function resetCache() {
  cachedState = {};
}
