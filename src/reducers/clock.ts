/**
@license
*/

import { Reducer } from 'redux';
import { END_PERIOD, START_PERIOD, TOGGLE_CLOCK } from '../slices/live-types';
import { RootAction, RootState } from '../store';
import { createReducer } from './createReducer';
import { TimerData, Timer } from '../models/clock';

export interface ClockState {
  timer?: TimerData;
}

const INITIAL_STATE: ClockState = {
  timer: undefined,
};

export const proposedSubSelector = (state: RootState) => state.live && state.live!.proposedSub;

export const clock: Reducer<ClockState, RootAction> = createReducer(INITIAL_STATE, {
  [START_PERIOD]: (newState, /*action*/) => {
    const timer = new Timer();
    timer.start();
    newState.timer = timer.toJSON();
  },

  [END_PERIOD]: (newState, /*action*/) => {
    const timer = new Timer(newState.timer);
    timer.stop();
    newState.timer = timer.toJSON();
  },

  [TOGGLE_CLOCK]: (newState, /*action*/) => {
    const timer = new Timer(newState.timer);

    if (timer.isRunning) {
      timer.stop();
    } else {
      timer.start();
    }
    newState.timer = timer.toJSON();
  },
/*
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

  [CONFIRM_SUB]: (newState) => {
    const sub = newState.proposedSub!;

    newState.liveGame!.players!.forEach(player => {
      if (player.id === sub.id) {
        player.selected = false;
        player.status = PlayerStatus.Next;
        player.currentPosition = sub.currentPosition;
        player.replaces = sub.replaces;
        return;
      }
      if (player.id === sub.replaces) {
        player.selected = false;
      }
    });

    clearProposedSub(newState);
  },

  [CANCEL_SUB]: (newState) => {
    const cancelIds = [newState.selectedOffPlayer!, newState.selectedOnPlayer!];
    for (const playerId of cancelIds) {
      const selectedPlayer = findPlayer(newState, playerId);
      if (selectedPlayer && selectedPlayer.selected) {
        selectedPlayer.selected = false;
      }
    }
    clearProposedSub(newState);
  },

  [APPLY_NEXT]: (newState, action) => {
    const nextPlayers = findPlayersByStatus(newState, PlayerStatus.Next, action.selectedOnly);
    nextPlayers.forEach(player => {
      const replacedPlayer = findPlayer(newState, player.replaces!);
      if (!(replacedPlayer && replacedPlayer.status === PlayerStatus.On)) {
        return;
      }

      player.status = PlayerStatus.On;
      player.replaces = undefined;
      player.selected = false;

      replacedPlayer.status = PlayerStatus.Off;
      replacedPlayer.currentPosition = undefined;
      replacedPlayer.selected = false;
    });
  },

  [DISCARD_NEXT]: (newState, action) => {
    const nextPlayers = findPlayersByStatus(newState, PlayerStatus.Next, action.selectedOnly);
    nextPlayers.forEach(player => {
      player.status = PlayerStatus.Off;
      player.replaces = undefined;
      player.currentPosition = undefined;
      player.selected = false;
    });
  },
*/
});
