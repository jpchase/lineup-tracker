/**
@license
*/

import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Game, Games, GameStatus } from '../../models/game.js';
import { ActionCreator, AnyAction } from 'redux';
import { ThunkAction } from 'redux-thunk';
import { currentUserIdSelector } from '../../reducers/auth.js';
import { loadGames, persistNewGame } from './game-storage.js';
import { RootState } from '../../store.js';

type ThunkResult = ThunkAction<void, RootState, undefined, AnyAction>;

export const getGames = createAsyncThunk<
  // Return type of the payload creator
  Games,
  // First argument to the payload creator
  string,
  {
    // Optional fields for defining thunkApi field types
    // dispatch: AppDispatch
    state: RootState
  }
>(
  'game/getGames',
  async (teamId, thunkAPI) => {
    const currentUserId = currentUserIdSelector(thunkAPI.getState());

    return loadGames(teamId, currentUserId);
  },
  {
    condition: (teamId) => {
      if (!teamId) {
        return false;
      }
      return true;
    },
  }
);

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
  },
  extraReducers: (builder) => {
    builder.addCase(getGames.fulfilled, (state, action) => {
      state.games = action.payload;
    })
  },
});

const { actions, reducer } = gameSlice;

export const games = reducer;
export const { addGame } = actions;
