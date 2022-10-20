import { debug } from '../common/debug.js';
import { game } from '../reducers/game.js';
import { RootStore, SliceStoreConfigurator, store as globalStore } from '../store.js';

const debugStore = debug('game-store');

const REDUCER_KEY = 'game';
let initialized = false;

export function getGameStore(storeInstance?: RootStore): RootStore {
  const store = storeInstance || globalStore;
  if (!initialized || !store.hasReducer(REDUCER_KEY)) {
    debugStore(`getGameStore: ${initialized ? 'game state missing, add reducer' : 'first call, do initialization'}`);
    // Lazy load the reducer
    store.addReducers({
      [REDUCER_KEY]: game
    });
    initialized = true;
  }
  return store;
}

export function getGameStoreConfigurator(_hydrate: boolean): SliceStoreConfigurator {
  return (storeInstance?: RootStore) => {
    return getGameStore(storeInstance);
  };
}
