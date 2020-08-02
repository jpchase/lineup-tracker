import { store as globalStore, RootStore, RootState, RootAction, SliceStoreConfigurator } from '../store';
import { Store } from 'redux';
import { idb } from '../storage/idb-wrapper';
import { Games } from '../models/game';
import { hydrateGame } from '../actions/game';
import { game, currentGameSelector } from '../reducers/game';

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
    console.log('getGameStore: first call, do initialization');
    // Lazy load the reducer
    store.addReducers({
      game
    });

    if (hydrate) {
      console.log('getGameStore: setup hydration');
      hydrateGameState(store);

      store.subscribe(() => {
        console.log('getGameStore: in store.subscribe()');
        persistGameState(store);
      });
    }
    initialized = true;
  }
  return store;
}

export function getGameStoreConfigurator(hydrate: boolean): SliceStoreConfigurator {
  return (storeInstance?: RootStore) => {
    return getGameStore(storeInstance, hydrate);
  };
}

export function hydrateGameState(storeInstance: Store<RootState, RootAction>) {
  console.log('hydrateGameState: start');
  idb.get(KEY_CACHED_GAMES).then((value) => {
    if (!value) {
      console.log('hydrateGameState: nothing in idb');
      return;
    }
    cachedGames = value as CachedGames;
    if (!cachedGames.games) {
      cachedGames.games = {};
    }
    console.log('hydrateGameState: hydrate action about to send');
    storeInstance.dispatch(hydrateGame(cachedGames.games, cachedGames.currentGameId));
    console.log('hydrateGameState: hydrate action done');
  });
}

export function persistGameState(storeInstance: Store<RootState, RootAction>) {
  console.log('persistGameState: start');
  const state = storeInstance.getState();

  // Check if current game has changed
  const currentGame = currentGameSelector(state);
  if (!currentGame) {
    console.log('persistGameState: current game missing');
    return;
  }

  // Checks if the game is already cached, by reference comparison.
  // As state is immutable, different references imply updates.
  const cachedGame = cachedGames.games[currentGame.id];
  if (cachedGame && cachedGame === currentGame) {
    console.log(`persistGameState: current game already cached: ${currentGame.id}`);
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
    console.log(`persistGameState: idb updated for: ${currentGame.id}`);
    cachedGames = newCache;
  });
}

export function resetCache() {
  cachedGames = { games: {} };
}