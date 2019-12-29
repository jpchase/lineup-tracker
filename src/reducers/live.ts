/**
@license
*/

import { Reducer } from 'redux';
import { LiveGame, LivePlayer } from '../models/game';
import { LiveGameBuilder } from '../models/live';
import { GET_GAME_SUCCESS, ROSTER_DONE, SET_FORMATION } from '../slices/game-types';
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

export const live: Reducer<LiveState, RootAction> = createReducer(INITIAL_STATE, {
  [GET_GAME_SUCCESS]: (newState, action) => {
    if (newState.liveGame && newState.liveGame.id === action.game.id) {
      // Game has already been initialized.
      return;
    }

    const game: LiveGame = LiveGameBuilder.create(action.game);

    newState.liveGame = game;
  },

  [ROSTER_DONE]: (newState, action) => {
    // Setup live players from roster
    const roster = action.roster;
    const players: LivePlayer[] = Object.keys(roster).map((playerId) => {
      const player = roster[playerId];
      return { ...player } as LivePlayer;
    });

    newState.liveGame!.players = players;
  },

  [SET_FORMATION]: (newState, action) => {
    const game = newState.liveGame!;
    game.formation = { type: action.formationType };
  },

  [SELECT_PLAYER]: (newState, action) => {
    newState.selectedPlayer = action.playerId;
  },

});
