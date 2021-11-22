/**
@license
*/

import { ActionCreator, AnyAction } from 'redux';
import { ThunkAction } from 'redux-thunk';
import { Game, GameStatus } from '../models/game.js';
import { currentUserIdSelector } from '../reducers/auth.js';
import { addGame, getGames as getGamesCreator } from '../slices/game/game-slice.js';
import { loadGames, persistNewGame } from '../slices/game/game-storage.js';
import { RootState } from '../store.js';
export { addGame } from '../slices/game/game-slice.js';

type ThunkResult = ThunkAction<void, RootState, undefined, AnyAction>;

export const getGames: ActionCreator<ThunkResult> = (teamId: string) => (dispatch, getState) => {
  if (!teamId) {
    return;
  }
  // Show the user's games, when signed in. Otherwise, only show public data.
  // TODO: Extract into helper function somewhere?
  const currentUserId = currentUserIdSelector(getState());

  loadGames(teamId, currentUserId).then((games) => {
    console.log(`getGames - ActionCreator: ${JSON.stringify(games)}`);

    dispatch(getGamesCreator(games));

  }).catch((error: any) => {
    // TODO: Dispatch error?
    console.log(`Loading of games from storage failed: ${error}`);
  });
};

export const addNewGame: ActionCreator<ThunkResult> = (newGame: Game) => (dispatch, getState) => {
  if (!newGame) {
    return;
  }
  const state = getState();
  // Verify that the game name is unique.
  const gameState = state.games!;
  if (gameState.games) {
    const hasMatch = Object.keys(gameState.games).some((key) => {
      const game = gameState.games[key];
      return (game.name.localeCompare(newGame.name, undefined, { sensitivity: 'base' }) == 0);
    });
    if (hasMatch) {
      return;
    }
  }
  dispatch(saveGame(newGame));
};

// Saves the new game in local storage, before adding to the store
export const saveGame: ActionCreator<ThunkResult> = (newGame: Game) => (dispatch, getState) => {
  if (!newGame.status) {
    newGame.status = GameStatus.New;
  }
  persistNewGame(newGame, getState());
  dispatch(addGame(newGame));
};
