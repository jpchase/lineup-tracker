import { store as globalStore, RootStore, RootState, SliceStoreConfigurator } from '../store.js';
import { Store } from 'redux';
import { idb } from '../storage/idb-wrapper';
import { Games } from '../models/game';
import { hydrateGame } from '../actions/game';
import { game, currentGameSelector } from '../reducers/game';
import { debug } from '../common/debug';

const debugStore = debug('game-store');

const KEY_CACHED_GAMES = 'CACHED_GAMES';
interface CachedGames {
  currentGameId?: string;
  games: Games;
}
let initialized = false;
let cachedGames: CachedGames = { games: {} };

export function getGameStore(storeInstance?: RootStore, hydrate: boolean = true): RootStore {
  const store = storeInstance || globalStore;
  if (!initialized) {
    debugStore('getGameStore: first call, do initialization');
    // Lazy load the reducer
    store.addReducers({
      game
    });

    if (hydrate) {
      debugStore('getGameStore: setup hydration');
      hydrateGameState(store);

      store.subscribe(() => {
        debugStore('getGameStore: in store.subscribe()');
        persistGameState(store);
      });
    }
    initialized = true;
  } else if (!store.hasReducer('game')) {
    debugStore('getGameStore: game state missing, add reducer');
    // Lazy load the reducer
    store.addReducers({
      game
    });
  }
  return store;
}

export function getGameStoreConfigurator(hydrate: boolean): SliceStoreConfigurator {
  return (storeInstance?: RootStore) => {
    return getGameStore(storeInstance, hydrate);
  };
}

export function hydrateGameState(storeInstance: Store<RootState>) {
  debugStore('hydrateGameState: start');
  idb.get(KEY_CACHED_GAMES).then((value) => {
    if (!value) {
      debugStore('hydrateGameState: nothing in idb');
      return;
    }
    cachedGames = value as CachedGames;
    if (!cachedGames.games) {
      cachedGames.games = {};
    }
    debugStore('hydrateGameState: hydrate action about to send');
    storeInstance.dispatch(hydrateGame(cachedGames.games, cachedGames.currentGameId));
    debugStore('hydrateGameState: hydrate action done');
  });
}

export function persistGameState(storeInstance: Store<RootState>) {
  debugStore('persistGameState: start');
  const state = storeInstance.getState();

  // Check if current game has changed
  const currentGame = currentGameSelector(state);
  if (!currentGame) {
    debugStore('persistGameState: current game missing');
    return;
  }

  // Checks if the game is already cached, by reference comparison.
  // As state is immutable, different references imply updates.
  const cachedGame = cachedGames.games[currentGame.id];
  if (cachedGame && cachedGame === currentGame) {
    debugStore(`persistGameState: current game already cached: ${currentGame.id}`);
    return;
  }
  // Store games in idb
  const newCache: CachedGames = {
    ...cachedGames,
    games: { ...cachedGames.games }
  };
  newCache.games[currentGame.id] = currentGame;
  newCache.currentGameId = currentGame.id;
  idb.set(KEY_CACHED_GAMES, newCache).then(() => {
    debugStore(`persistGameState: idb updated for: ${currentGame.id}`);
    cachedGames = newCache;
  });
}

export function resetCache() {
  cachedGames = { games: {} };
}
