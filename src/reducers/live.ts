/**
@license
*/

import { LiveActionSelectStarter } from '@app/actions/live';
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
  selectedOffPlayer?: string;
  selectedOnPlayer?: string;
  proposedSub?: LivePlayer;
}

const INITIAL_STATE: LiveState = {
  gameId: '',
  liveGame: undefined,
  selectedStarterPlayer: undefined,
  selectedStarterPosition: undefined,
  proposedStarter: undefined,
  selectedOffPlayer: undefined,
  selectedOnPlayer: undefined,
  proposedSub: undefined,
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

  [SELECT_STARTER]: (newState, action: LiveActionSelectStarter) => {
    const selectedPlayer = findPlayer(newState, action.playerId);
    if (selectedPlayer) {
      selectedPlayer.selected = !!action.selected;
    }

    // Handles de-selection.
    if (!action.selected) {
      if (newState.selectedStarterPlayer === action.playerId) {
        newState.selectedStarterPlayer = undefined;
      }
      return;
    }
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
        player.selected = false;
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
    const selectedPlayer = findPlayer(newState, newState.selectedStarterPlayer!);
    if (selectedPlayer && selectedPlayer.selected) {
      selectedPlayer.selected = false;
    }
    clearProposedStarter(newState);
  },

  [SELECT_PLAYER]: (newState, action) => {
    const selectedPlayer = findPlayer(newState, action.playerId);
    if (!selectedPlayer) {
      return;
    }

    // Always sets the selected flag to true/false as appropriate.
    selectedPlayer.selected = !!action.selected;

    // Only On and Off statuses need further handling.
    if (selectedPlayer.status !== PlayerStatus.On &&
        selectedPlayer.status !== PlayerStatus.Off) {
      return;
    }

    const status = selectedPlayer.status;
    if (action.selected) {
      setCurrentSelected(newState, status, action.playerId);
      prepareSubIfPossible(newState);
    } else {
      // De-selection.
      if (getCurrentSelected(newState, status) === action.playerId) {
        setCurrentSelected(newState, status, undefined);
      }
    }
  },

});

function prepareStarterIfPossible(newState: LiveState) {
  if (!newState.selectedStarterPlayer || !newState.selectedStarterPosition) {
    // Need both a position and player selected to setup a starter
    return;
  }

  const player = findPlayer(newState, newState.selectedStarterPlayer);
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

function prepareSubIfPossible(newState: LiveState) {
  if (!newState.selectedOffPlayer || !newState.selectedOnPlayer) {
    // Need both an On and Off player selected to set up a sub
    return;
  }

  const offPlayer = findPlayer(newState, newState.selectedOffPlayer);
  if (!offPlayer) {
    return;
  }
  const onPlayer = findPlayer(newState, newState.selectedOnPlayer);
  if (!onPlayer) {
    return;
  }

  newState.proposedSub = {
    ...offPlayer,
    currentPosition: {
      ...onPlayer.currentPosition!
    },
    replaces: onPlayer.id
  }
}

function findPlayer(newState: LiveState, playerId: string) {
  return newState.liveGame!.players!.find(player => player.id === playerId);
}

function getCurrentSelected(newState: LiveState, status: PlayerStatus) {
  switch (status) {
    case PlayerStatus.Off:
      return newState.selectedOffPlayer;
    case PlayerStatus.On:
      return newState.selectedOnPlayer;
  }
  throw new Error(`Unsupported status: ${status}`);
}

function setCurrentSelected(newState: LiveState, status: PlayerStatus, value: string | undefined) {
  switch (status) {
    case PlayerStatus.Off:
      newState.selectedOffPlayer = value;
      break;
    case PlayerStatus.On:
      newState.selectedOnPlayer = value;
      break;
    default:
      throw new Error(`Unsupported status: ${status}`);
  }
}