import { Store } from 'redux';
import { hydrateLive } from '../actions/live.js';
import { LiveGame } from '../models/game.js';
import { idb } from '../storage/idb-wrapper';
import { RootState, RootStore, SliceStoreConfigurator, store as globalStore } from '../store.js';
import { ClockState } from './live/clock-slice.js';
import { clockSelector, live, selectCurrentLiveGame, selectCurrentShift } from './live/live-slice.js';
import { ShiftState } from './live/shift-slice.js';

const KEY_CACHED_LIVE = 'CACHED_LIVE';
interface CachedLive {
  currentGameId?: string;
  game?: LiveGame;
  clock?: ClockState;
  shift?: ShiftState;
}
let initialized = false;
let cachedState: CachedLive = {};

export function getLiveStore(storeInstance?: RootStore, hydrate: boolean = true): RootStore {
  console.log(`getLiveStore called: storeInstance is set ${storeInstance ? true : false}`);
  const store = storeInstance || globalStore;
  if (!initialized) {
    console.log('getLiveStore: first call, do initialization');
    // Lazy load the reducer
    store.addReducers({
      live
    });

    if (hydrate) {
      console.log('getLiveStore: setup hydration');
      hydrateState(store);

      store.subscribe(() => {
        console.log('getLiveStore: in store.subscribe()');
        persistState(store);
      });
    }
    initialized = true;
  }
  return store;
}

export function getLiveStoreConfigurator(hydrate: boolean): SliceStoreConfigurator {
  return (storeInstance?: RootStore) => {
    return getLiveStore(storeInstance, hydrate);
  };
}

export function hydrateState(storeInstance: Store<RootState>) {
  console.log('hydrateState: start');
  idb.get(KEY_CACHED_LIVE).then((value) => {
    if (!value) {
      console.log('hydrateState: nothing in idb');
      return;
    }
    cachedState = value as CachedLive;
    console.log('hydrateState: hydrate action about to send');
    storeInstance.dispatch(hydrateLive(cachedState.game, cachedState.currentGameId, cachedState.clock, cachedState.shift));
    console.log('hydrateState: hydrate action done');
  });
}

export function persistState(storeInstance: Store<RootState>) {
  console.log('persistState: start');
  const state = storeInstance.getState();

  const currentGame = selectCurrentLiveGame(state);
  if (!currentGame) {
    console.log('persistState: current game missing');
    return;
  }

  const currentClock = clockSelector(state);
  const currentShift = selectCurrentShift(state);

  // Checks if the state is already cached, by reference comparison.
  // As state is immutable, different references imply updates.
  if (cachedState.game === currentGame && cachedState.clock === currentClock &&
    cachedState.shift == currentShift) {
    console.log(`persistState: current state already cached: ${currentGame.id}`);
    return;
  }
  // Store games in idb
  const newCache: CachedLive = {
    ...cachedState,
    currentGameId: currentGame.id,
    game: currentGame,
    clock: currentClock,
    shift: currentShift
  };
  idb.set(KEY_CACHED_LIVE, newCache).then(() => {
    console.log(`persistState: idb updated for: ${currentGame.id}`);
    cachedState = newCache;
  });
}

export function resetCache() {
  cachedState = {};
}
