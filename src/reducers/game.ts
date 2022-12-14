import { GameActionGetGameSuccess } from '@app/actions/game';
import { GameState } from '@app/slices/game/game-slice.js';
import { Reducer } from 'redux';
import {
  GameDetail, GameStatus
} from '../models/game';
import {
  ADD_GAME_PLAYER,
  GET_GAME_FAIL,
  GET_GAME_REQUEST,
  GET_GAME_SUCCESS
} from '../slices/game-types';
import { RootState } from '../store.js';
import { createReducer } from './createReducer'; // 'redux-starter-kit';

// This is duplicated from the slice file to avoid circular imports.
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

export const currentGameIdSelector = (state: RootState) => state.game && state.game.gameId;
export const currentGameSelector = (state: RootState) => state.game && state.game.game;

export const oldReducer: Reducer<GameState> = createReducer(INITIAL_STATE, {
  [GET_GAME_REQUEST]: (newState, action) => {
    newState.gameId = action.gameId;
    newState.detailFailure = false;
    newState.detailLoading = true;
  },

  [GET_GAME_SUCCESS]: (newState, action: GameActionGetGameSuccess) => {
    newState.detailFailure = false;
    newState.detailLoading = false;

    if (newState.game && newState.game.id === action.game.id) {
      // Game has already been retrieved.
      return;
    }
    const gameDetail: GameDetail = {
      ...action.game
    };
    gameDetail.hasDetail = true;
    if (!gameDetail.status) {
      gameDetail.status = GameStatus.New;
    }

    newState.game = gameDetail;
    // TODO: Ensure games state has latest game detail
    // newState.games[action.game.id] = action.game;
  },

  [GET_GAME_FAIL]: (newState, action) => {
    newState.error = action.error;
    newState.detailFailure = true;
    newState.detailLoading = false;
  },

  [ADD_GAME_PLAYER]: (newState, action) => {
    newState.game!.roster[action.player.id] = action.player;
  },

});
