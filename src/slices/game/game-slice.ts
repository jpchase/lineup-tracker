/**
@license
*/

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Game, Games } from '../../models/game.js';

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
export const { addGame, getGames } = actions;
