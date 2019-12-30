/**
@license
*/

import { Reducer } from 'redux';
import { Position } from '../models/formation';
import { LiveGame, LivePlayer } from '../models/game';
import { LiveGameBuilder } from '../models/live';
import { PlayerStatus } from '../models/player';
import { GET_GAME_SUCCESS, ROSTER_DONE, SET_FORMATION } from '../slices/game-types';
import { APPLY_STARTER, CANCEL_STARTER, SELECT_PLAYER, SELECT_STARTER, SELECT_STARTER_POSITION } from '../slices/live-types';
import { RootAction } from '../store';
import { createReducer } from './createReducer';

export interface LiveState {
  gameId: string;
  liveGame?: LiveGame;
  selectedStarterPlayer?: string;
  selectedStarterPosition?: Position;
  proposedStarter?: LivePlayer;
  selectedPlayer?: string;
}

const INITIAL_STATE: LiveState = {
  gameId: '',
  liveGame: undefined,
  selectedStarterPlayer: undefined,
  selectedStarterPosition: undefined,
  proposedStarter: undefined,
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

  [SELECT_STARTER]: (newState, action) => {
    newState.selectedStarterPlayer = action.playerId;

    prepareStarterIfPossible(newState);
  },

  [SELECT_STARTER_POSITION]: (newState, action) => {
    newState.selectedStarterPosition = action.position;

    prepareStarterIfPossible(newState);
  },

  [APPLY_STARTER]: (newState) => {
    const starter = newState.proposedStarter!;
    const positionId = starter.currentPosition!.id;

    newState.liveGame!.players!.forEach(player => {
      if (player.id === starter.id) {
        player.status = PlayerStatus.On;
        player.currentPosition = starter.currentPosition;
        return;
      }

      // Checks for an existing starter in the position.
      if (player.status === PlayerStatus.On && player.currentPosition!.id === positionId) {
        // Replace the starter, moving the player to off.
        player.status = PlayerStatus.Off;
        player.currentPosition = undefined;
      }
    });

    clearProposedStarter(newState);
  },

  [CANCEL_STARTER]: (newState) => {
    clearProposedStarter(newState);
  },

  [SELECT_PLAYER]: (newState, action) => {
    newState.selectedPlayer = action.playerId;
  },

});

function prepareStarterIfPossible(newState: LiveState) {
  if (!newState.selectedStarterPlayer || !newState.selectedStarterPosition) {
    // Need both a position and player selected to setup a starter
    return;
  }

  const player = newState.liveGame!.players!.find(p => p.id === newState.selectedStarterPlayer);
  if (!player) {
    return;
  }

  newState.proposedStarter = {
    ...player,
    currentPosition: {
      ...newState.selectedStarterPosition
    }
  }
}

function clearProposedStarter(newState: LiveState) {
  delete newState.selectedStarterPlayer;
  delete newState.selectedStarterPosition;
  delete newState.proposedStarter;
}
