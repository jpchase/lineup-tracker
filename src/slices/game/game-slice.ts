import { Action, ActionCreator, createAsyncThunk, createSlice, PayloadAction, Reducer } from '@reduxjs/toolkit';
import { Game, GameDetail, Games, GameStatus } from '../../models/game.js';
import { Roster } from '../../models/player.js';
import { oldReducer } from '../../reducers/game.js';
import {
  GET_GAME_FAIL, GET_GAME_REQUEST,
  GET_GAME_SUCCESS
} from '../../slices/game-types.js';
import { RootState, ThunkPromise, ThunkResult } from '../../store.js';
import { selectCurrentUserId } from '../auth/auth-slice.js';
import { gameCompleted, gameSetupCompleted, selectLiveGameById } from '../live/live-slice.js';
import { loadGame, loadGameRoster, loadGames, persistNewGame, updateExistingGame } from './game-storage.js';
import { copyRoster, rosterCopiedHandler, rosterCopyFailedHandler, rosterCopyPendingHandler } from './roster-logic.js';
export { addNewGamePlayer, copyRoster } from './roster-logic.js';

interface GameActionGetGameRequest extends Action<typeof GET_GAME_REQUEST> { gameId: string };
export interface GameActionGetGameSuccess extends Action<typeof GET_GAME_SUCCESS> { game: GameDetail };
interface GameActionGetGameFail extends Action<typeof GET_GAME_FAIL> { error: string };

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

export const getGame = (gameId: string): ThunkPromise<void> => (dispatch, getState) => {
  if (!gameId) {
    return Promise.reject();
  }
  dispatch(getGameRequest(gameId));

  // TODO: Check for game cached in IDB (similar to getTeams action)
  // Checks if the game has already been retrieved.
  const state = getState();
  let existingGame: Game | undefined;
  if (state.game && state.game.game && state.game.game.id === gameId) {
    existingGame = state.game.game!;
  } else {
    existingGame = state.game?.games[gameId];
  }
  if (existingGame && existingGame.hasDetail) {
    dispatch(getGameSuccess(existingGame));
    // let the calling code know there's nothing to wait for.
    return Promise.resolve();
  }

  let game: Game;
  return loadGame(gameId)
    .then((result) => {
      game = result;
      return loadGameRoster(gameId);
    })
    .then((gameRoster: Roster) => {
      const gameDetail: GameDetail = {
        ...game,
        roster: gameRoster
      };
      dispatch(getGameSuccess(gameDetail));
    })
    .catch((error: any) => {
      dispatch(getGameFail(error.toString()));
    });
}

const getGameRequest: ActionCreator<GameActionGetGameRequest> = (gameId: string) => {
  return {
    type: GET_GAME_REQUEST,
    gameId
  };
};

const getGameSuccess: ActionCreator<GameActionGetGameSuccess> = (game: GameDetail) => {
  return {
    type: GET_GAME_SUCCESS,
    game
  };
};

const getGameFail: ActionCreator<GameActionGetGameFail> = (error: string) => {
  return {
    type: GET_GAME_FAIL,
    error
  };
};

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

export interface GameState {
  gameId: string;
  game?: GameDetail;
  games: Games;
  detailLoading: boolean;
  detailFailure: boolean;
  rosterLoading: boolean;
  rosterFailure: boolean;
  error?: string;
}

export const GAME_INITIAL_STATE: GameState = {
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
  initialState: GAME_INITIAL_STATE,
  reducers: {
    addGame: (state, action: PayloadAction<Game>) => {
      const game = action.payload;
      state.games[game.id] = game;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(getGames.fulfilled, (state, action) => {
      state.games = action.payload;
    });
    // Copy roster actions
    builder.addCase(copyRoster.pending, rosterCopyPendingHandler);
    builder.addCase(copyRoster.fulfilled, rosterCopiedHandler);
    builder.addCase(copyRoster.rejected, rosterCopyFailedHandler);
    // Game setup actions
    builder.addCase(gameSetupCompleted, (state, action: PayloadAction<{ gameId: string }>) => {
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

export const gameReducer: Reducer<GameState> = function (state, action) {
  return oldReducer(reducer(state, action), action);
}

export const { addGame } = actions;

export const selectCurrentGameId = (state: RootState) => state.game?.gameId;
export const selectCurrentGame = (state: RootState) => state.game?.game;
