import { store, RootStore, RootState, RootAction } from '../store';
import { Store } from 'redux';
import { set } from 'idb-keyval';
import { Game, Games } from '../models/game';
import { game, currentGameSelector } from '../reducers/game';

const KEY_GAME_PREFIX = 'GAME_';
let initialized = false;
const cachedGames: Games = {};

export function getGameStore(): RootStore {
  console.log('getGameStore called');
  if (!initialized) {
    console.log('getGameStore: first call, do initialization');
    // Lazy load the reducer
    store.addReducers({
      game
    });

    store.subscribe(() => {
      console.log('getGameStore: in store.subscribe()');
      persistGameState(store);
    });
    initialized = true;
  }
  return store;
}

function getGameKey(game: Game): string {
  return `${KEY_GAME_PREFIX}${game.id}`;
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
  const cachedGame = cachedGames[currentGame.id];
  if (cachedGame && cachedGame === currentGame) {
    console.log(`persistGameState: current game already cached: ${currentGame.id}`);
    return;
  }
  // Store game in idb, ie. key = `GAME_${currentGame.id}`
  set(getGameKey(currentGame), currentGame).then(() => {
    console.log(`persistGameState: idb updated for: ${currentGame.id}`);
    cachedGames[currentGame.id] = currentGame;
  });
}