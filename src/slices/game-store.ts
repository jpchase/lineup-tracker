/** @format */

import { debug } from '../common/debug.js';
import { RootStore, SliceStoreConfigurator } from '../store.js';
import { gameReducer } from './game/game-slice.js';
import { rootReducer } from './index.js';

const debugStore = debug('game-store');

const REDUCER_KEY = 'game';
let initialized = false;

export function getGameStore(storeInstance: RootStore): RootStore {
  if (!storeInstance) {
    throw new Error(`getGameStore: storeInstance must be provided`);
  }
  if (!initialized) {
    debugStore(
      `getGameStore: ${
        initialized ? 'game state missing, add reducer' : 'first call, do initialization'
      }`
    );
    // Lazy load the reducer
    rootReducer.inject({
      reducerPath: REDUCER_KEY,
      reducer: gameReducer,
    });
    initialized = true;
  }
  return storeInstance;
}

export function getGameStoreConfigurator(_hydrate: boolean): SliceStoreConfigurator {
  return (storeInstance?: RootStore) => {
    if (!storeInstance) {
      throw new Error(`storeInstance must be provided`);
    }
    return getGameStore(storeInstance);
  };
}
