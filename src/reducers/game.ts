/**
@license
*/

import { GameActionGetGameSuccess, GameActionHydrate } from '@app/actions/game';
import { Reducer } from 'redux';
import {
  GameDetail, Games, GameStatus,
} from '../models/game';
import { Player, Roster } from '../models/player';
import {
  ADD_GAME_PLAYER,
  COPY_ROSTER_FAIL,
  COPY_ROSTER_REQUEST,
  COPY_ROSTER_SUCCESS,
  GAME_HYDRATE,
  GET_GAME_FAIL,
  GET_GAME_REQUEST,
  GET_GAME_SUCCESS,
  START_GAME
} from '../slices/game-types';
import { gamesReducer } from '../slices/game/game-slice.js';
import { RootState } from '../store.js';
import { createReducer } from './createReducer'; // 'redux-starter-kit';

export interface GameState {
  hydrated: boolean;
  gameId: string;
  game?: GameDetail;
  games: Games;
  detailLoading: boolean;
  detailFailure: boolean;
  rosterLoading: boolean;
  rosterFailure: boolean;
  error?: string;
}

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

export const currentGameIdSelector = (state: RootState) => state.game && state.game.gameId;
export const currentGameSelector = (state: RootState) => state.game && state.game.game;

export const game: Reducer<GameState> = function (state, action) {
  return oldReducer(gamesReducer(state, action), action);
}

const oldReducer: Reducer<GameState> = createReducer(INITIAL_STATE, {
  [GAME_HYDRATE]: (newState, action: GameActionHydrate) => {
    if (newState.hydrated) {
      return;
    }
    newState.hydrated = true;
    if (!action.gameId) {
      return;
    }
    const cachedGame = action.games[action.gameId];
    if (!cachedGame || !cachedGame.hasDetail) {
      return;
    }
    newState.gameId = cachedGame.id;
    newState.game = cachedGame as GameDetail;
  },

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

  [COPY_ROSTER_REQUEST]: (newState, action) => {
    newState.gameId = action.gameId;
    newState.rosterFailure = false;
    newState.rosterLoading = true;
  },

  [COPY_ROSTER_SUCCESS]: (newState, action) => {
    // Set new roster, if required.
    if (action.gameRoster && (Object.keys(newState.game!.roster).length === 0)) {
      const gameRoster = action.gameRoster!;
      const roster: Roster = {};
      Object.keys(gameRoster).forEach((key) => {
        const teamPlayer: Player = gameRoster[key];
        const player: Player = { ...teamPlayer };
        roster[player.id] = player;
      });
      newState.game!.roster = roster;
      // TODO: Ensure games state has latest game detail
      // newState.games[action.game.id] = gameWithRoster;

    }

    newState.rosterFailure = false;
    newState.rosterLoading = false;
  },

  [COPY_ROSTER_FAIL]: (newState, action) => {
    newState.error = action.error;
    newState.rosterFailure = true;
    newState.rosterLoading = false;
  },

  [ADD_GAME_PLAYER]: (newState, action) => {
    newState.game!.roster[action.player.id] = action.player;
  },

  [START_GAME]: (newState) => {
    const game = newState.game!;
    game.status = GameStatus.Start;
    if (game.liveDetail) {
      delete game.liveDetail.setupTasks;
    }
  },

});
