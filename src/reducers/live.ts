/**
@license
*/

import { Reducer } from 'redux';
import { LiveGame, LiveGameBuilder } from '../models/game';
import { GET_GAME_SUCCESS, SET_FORMATION } from '../slices/game-types';
import { SELECT_PLAYER } from '../slices/live-types';
import { RootAction } from '../store';
import { createReducer } from './createReducer';

export interface LiveState {
  gameId: string;
  liveGame?: LiveGame;
  selectedPlayer?: string;
}

const INITIAL_STATE: LiveState = {
  gameId: '',
  liveGame: undefined,
};

export const liveGame: Reducer<LiveState, RootAction> = createReducer(INITIAL_STATE, {
  [GET_GAME_SUCCESS]: (newState, action) => {

    if (newState.liveGame && newState.liveGame.id === action.game.id) {
      // Game has already been initialized.
      return;
    }

    const game: LiveGame = LiveGameBuilder.create(action.game);

    newState.liveGame = game;
  },

  [SET_FORMATION]: (newState, action) => {
    const game = newState.liveGame!;
    game.formation = { type: action.formationType };
  },

  [SELECT_PLAYER]: (newState, action) => {
    newState.selectedPlayer = action.playerId;
  },

});
