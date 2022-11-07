import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Game, Games, GameStatus } from '../../models/game.js';
import type { GameState } from '../../reducers/game.js';
import { RootState, ThunkResult } from '../../store.js';
import { selectCurrentUserId } from '../auth/auth-slice.js';
import { gameCompleted, gameSetupCompleted, selectLiveGameById } from '../live/live-slice.js';
import { loadGames, persistNewGame, updateExistingGame } from './game-storage.js';
export { GameState } from '../../reducers/game.js';
export { addNewGamePlayer, copyRoster } from './roster-logic.js';

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
    const currentUserId = selectCurrentUserId(thunkAPI.getState());

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

export const addNewGame = (newGame: Game): ThunkResult => (dispatch, getState) => {
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
export const saveGame = (newGame: Game): ThunkResult => (dispatch, getState) => {
  if (!newGame.status) {
    newGame.status = GameStatus.New;
  }
  persistNewGame(newGame, getState());
  dispatch(addGame(newGame));
};

export const gameSetupCompletedCreator = (gameId: string): ThunkResult => (dispatch, getState) => {
  // TODO: Figure out how save game to Firestore, *after* status is updated by reducer,
  //       so don't have to duplicate logic.
  const game = selectLiveGameById(getState(), gameId);
  if (!game) {
    return;
  }
  updateExistingGame(gameId, {
    status: GameStatus.Start
  });
  dispatch(gameSetupCompleted(gameId, game));
};

export const gameCompletedCreator = (gameId: string): ThunkResult => (dispatch) => {
  // TODO: Figure out how save game to Firestore, *after* status is updated by reducer,
  //       so don't have to duplicate logic.
  updateExistingGame(gameId, {
    status: GameStatus.Done
  });
  dispatch(gameCompleted(gameId));
};

const INITIAL_STATE: GameState = {
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
    }).addCase(gameCompleted, (state, action: PayloadAction<{ gameId: string }>) => {
      const game = state.game!;
      if (action.payload.gameId !== game.id) {
        return;
      }
      game.status = GameStatus.Done;
    });
  },
});

const { actions, reducer } = gameSlice;

export const gamesReducer = reducer;
export const gameReducer = reducer;
export const { addGame } = actions;

export const selectCurrentGameId = (state: RootState) => state.game?.gameId;
export const selectCurrentGame = (state: RootState) => state.game?.game;
