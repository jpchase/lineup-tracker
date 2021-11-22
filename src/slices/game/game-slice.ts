/**
@license
*/

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Game, Games, GameStatus } from '../../models/game.js';
import { ActionCreator, AnyAction } from 'redux';
import { ThunkAction } from 'redux-thunk';
import { currentUserIdSelector } from '../../reducers/auth.js';
import { loadGames, persistNewGame } from './game-storage.js';
import { RootState } from '../../store.js';

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

    dispatch(actions.getGames(games));

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

export interface GamesState {
  games: Games;
  error?: string;
}

const INITIAL_STATE: GamesState = {
  games: {},
  error: ''
};

const gameSlice = createSlice({
  name: 'game',
  initialState: INITIAL_STATE,
  reducers: {
    addGame: (newState, action: PayloadAction<Game>) => {
      const game = action.payload;
      newState.games[game.id] = game;
    },

    getGames: (newState, action: PayloadAction<Games>) => {
      newState.games = action.payload;
    },
  }
});

const { actions, reducer } = gameSlice;

export const games = reducer;
export const { addGame } = actions;
