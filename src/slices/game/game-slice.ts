/**
@license
*/

import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ActionCreator, AnyAction } from 'redux';
import { ThunkAction } from 'redux-thunk';
import { Game, Games, GameStatus } from '../../models/game.js';
import { currentUserIdSelector } from '../../reducers/auth.js';
import type { GameState } from '../../reducers/game.js';
import { RootState } from '../../store.js';
import { gameSetupCompleted } from '../live/live-slice.js';
import { loadGames, persistNewGame, updateExistingGame } from './game-storage.js';
export { GameState } from '../../reducers/game.js';

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
  const gameState = state.game!;
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

export const gameSetupCompletedCreator: ActionCreator<ThunkResult> = (gameId: string) => (dispatch) => {
  // TODO: Figure out how save game to Firestore, *after* status is updated by reducer,
  //       so don't have to duplicate logic.
  updateExistingGame(gameId, {
    status: GameStatus.Start
  });
  dispatch(gameSetupCompleted(gameId));
};

const INITIAL_STATE: GameState = {
  hydrated: false,
  gameId: '',
  game: undefined,
  games: {},
  detailLoading: false,
  detailFailure: false,
  rosterLoading: false,
  rosterFailure: false,
  error: ''
};

const gameSlice = createSlice({
  name: 'game',
  initialState: INITIAL_STATE,
  reducers: {
    addGame: (state, action: PayloadAction<Game>) => {
      const game = action.payload;
      state.games[game.id] = game;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(getGames.fulfilled, (state, action) => {
      state.games = action.payload;
    }).addCase(gameSetupCompleted, (state, action: PayloadAction<{ gameId: string }>) => {
      const game = state.game!;
      if (action.payload.gameId !== game.id) {
        return;
      }
      game.status = GameStatus.Start;
    });
  },
});

const { actions, reducer } = gameSlice;

export const gamesReducer = reducer;
export const gameReducer = reducer;
export const { addGame } = actions;

export const selectCurrentGameId = (state: RootState) => state.game?.gameId;
export const selectCurrentGame = (state: RootState) => state.game?.game;
