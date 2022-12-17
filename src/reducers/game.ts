import { Reducer } from 'redux';
import {
  ADD_GAME_PLAYER
} from '../slices/game-types';
import { GameState } from '../slices/game/game-slice.js';
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
  [ADD_GAME_PLAYER]: (newState, action) => {
    newState.game!.roster[action.player.id] = action.player;
  },

});
