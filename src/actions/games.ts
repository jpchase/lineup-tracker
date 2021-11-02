/**
@license
*/

import { Action, ActionCreator } from 'redux';
import { ThunkAction } from 'redux-thunk';
import { Game, Games, GameStatus } from '../models/game';
import { currentUserIdSelector } from '../reducers/auth.js';
import { loadGames, persistNewGame } from '../slices/game/game-storage.js';
import { RootState } from '../store.js';

export const ADD_GAME = 'ADD_GAME';
export const GET_GAMES = 'GET_GAMES';

export interface GamesActionAddGame extends Action<'ADD_GAME'> { game: Game };
export interface GamesActionGetGames extends Action<'GET_GAMES'> { games: Games };
export type GamesAction = GamesActionAddGame | GamesActionGetGames;

type ThunkResult = ThunkAction<void, RootState, undefined, GamesAction>;

export const getGames: ActionCreator<ThunkResult> = (teamId: string) => (dispatch, getState) => {
  if (!teamId) {
    return;
  }
  // Show the user's games, when signed in. Otherwise, only show public data.
  // TODO: Extract into helper function somewhere?
  const currentUserId = currentUserIdSelector(getState());

  loadGames(teamId, currentUserId).then((games) => {
    console.log(`getGames - ActionCreator: ${JSON.stringify(games)}`);

    dispatch({
      type: GET_GAMES,
      games
    });

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

export const addGame: ActionCreator<GamesActionAddGame> = (game: Game) => {
  return {
    type: ADD_GAME,
    game
  };
};
