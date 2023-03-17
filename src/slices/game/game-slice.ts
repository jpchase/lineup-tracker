import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Game, GameDetail, Games, GameStatus } from '../../models/game.js';
import { RootState, ThunkPromise, ThunkResult } from '../../store.js';
import { selectCurrentUserId } from '../auth/auth-slice.js';
import { gameCompleted, gameSetupCompleted, selectLiveGameById } from '../live/live-slice.js';
import { GamePayload } from './game-action-types.js';
import { loadGame, loadGameRoster, loadGames, persistNewGame, updateExistingGame } from './game-storage.js';
import { copyRoster, gamePlayerAddedHandler, gamePlayerAddedPrepare, rosterCopiedHandler, rosterCopyFailedHandler, rosterCopyPendingHandler } from './roster-logic.js';
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

export const getGame = createAsyncThunk<
  // Return type of the payload creator.
  GameDetail,
  // The gameId is the first argument to the payload creator.
  string,
  {
    // Optional fields for defining thunkApi field types
    state: RootState,
    // The game id is added to the meta for the pending action.
    pendingMeta: { gameId: string }
  }
>(
  'game/getGame',
  async (gameId, thunkAPI) => {
    // Gets the retrieved game. The game must exist as the copy can only be triggered when viewing
    // a loaded game.
    const state = thunkAPI.getState();
    const existingGame = selectGameById(state, gameId);
    if (existingGame?.hasDetail) {
      return existingGame;
    }

    // TODO: Use Promise.all?
    const game = await loadGame(gameId);
    const gameRoster = await loadGameRoster(gameId);

    const gameDetail: GameDetail = {
      ...game,
      roster: gameRoster
    };
    return gameDetail;
  },
  {
    condition: (gameId) => {
      if (!gameId) {
        return false;
      }
      return true;
    },
    getPendingMeta: (base) => {
      return { gameId: base.arg };
    }
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
export const saveGame = (newGame: Game): ThunkPromise<void> => async (dispatch, getState) => {
  if (!newGame.status) {
    newGame.status = GameStatus.New;
  }
  await persistNewGame(newGame, getState());
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

export interface GameState {
  //TODO: Make this GameDetail's to avoid casting?
  games: Games;
  detailLoading: boolean;
  detailFailure: boolean;
  rosterLoading: boolean;
  rosterFailure: boolean;
  error?: string;
}

export const GAME_INITIAL_STATE: GameState = {
  games: {},
  detailLoading: false,
  detailFailure: false,
  rosterLoading: false,
  rosterFailure: false,
  error: ''
};

const gameSlice = createSlice({
  name: 'game',
  initialState: GAME_INITIAL_STATE,
  reducers: {
    addGame: (state, action: PayloadAction<Game>) => {
      const game = action.payload;
      state.games[game.id] = game;
    },
    gamePlayerAdded: {
      reducer: gamePlayerAddedHandler,
      prepare: gamePlayerAddedPrepare
    },
  },
  extraReducers: (builder) => {
    builder.addCase(getGames.fulfilled, (state, action) => {
      state.games = action.payload;
    });
    // Get game actions
    builder.addCase(getGame.pending, (state: GameState,
      _action: ReturnType<typeof getGame.pending>) => {
      state.detailFailure = false;
      state.detailLoading = true;
    });
    builder.addCase(getGame.fulfilled, (state: GameState,
      action: PayloadAction<GameDetail>) => {
      state.detailFailure = false;
      state.detailLoading = false;

      if (state.games[action.payload.id]) {
        // Game has already been retrieved.
        return;
      }
      const gameDetail: GameDetail = {
        ...action.payload
      };
      gameDetail.hasDetail = true;
      if (!gameDetail.status) {
        gameDetail.status = GameStatus.New;
      }

      state.games[action.payload.id] = gameDetail;
    });
    builder.addCase(getGame.rejected, (state: GameState,
      action: ReturnType<typeof copyRoster.rejected>) => {
      state.error = action.error.message || action.error.name;
      state.detailFailure = true;
      state.detailLoading = false;
    });
    // Copy roster actions
    builder.addCase(copyRoster.pending, rosterCopyPendingHandler);
    builder.addCase(copyRoster.fulfilled, rosterCopiedHandler);
    builder.addCase(copyRoster.rejected, rosterCopyFailedHandler);
    // Game setup actions
    builder.addCase(gameSetupCompleted, (state, action: PayloadAction<GamePayload>) => {
      state.games[action.payload.gameId].status = GameStatus.Start;
    }).addCase(gameCompleted, (state, action: PayloadAction<GamePayload>) => {
      const game = findGame(state, action.payload.gameId);
      if (action.payload.gameId !== game.id) {
        return;
      }
      game.status = GameStatus.Done;
    });
  },
});

const { actions, reducer } = gameSlice;

export const gameReducer = reducer;

export const { addGame, gamePlayerAdded } = actions;

export const selectGameById = (state: RootState, gameId: string) => {
  return maybeFindGame(state.game, gameId);
}

export const selectGameRosterLoading = (state: RootState) => {
  return state.game?.rosterLoading;
}

export function findGame(state?: GameState, gameId?: string): GameDetail {
  const game = maybeFindGame(state, gameId);
  if (!game) {
    throw new Error(`Game not found: ${gameId}`);
  }
  return game;
}

function maybeFindGame(state?: GameState, gameId?: string) {
  if (!state || !gameId || !(gameId in state.games)) {
    return;
  }
  return state.games[gameId] as GameDetail;
}
