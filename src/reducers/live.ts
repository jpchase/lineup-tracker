/**
@license
*/

import { Reducer } from 'redux';
import { LiveActionHydrate } from '../actions/live';
import { Position } from '../models/formation';
import { LiveGame, LivePlayer } from '../models/game';
import { getPlayer, LiveGameBuilder } from '../models/live';
import { PlayerStatus } from '../models/player';
import { GET_GAME_SUCCESS, ROSTER_DONE, SET_FORMATION } from '../slices/game-types';
import { APPLY_NEXT, APPLY_STARTER, CANCEL_STARTER, CANCEL_SUB, CONFIRM_SUB, DISCARD_NEXT, LIVE_HYDRATE, SELECT_PLAYER, SELECT_STARTER, SELECT_STARTER_POSITION } from '../slices/live-types';
import { RootState } from '../store.js';
import { clock, ClockState } from './clock';
import { createReducer } from './createReducer';

export interface LiveGameState {
  gameId: string;
  liveGame?: LiveGame;
  selectedStarterPlayer?: string;
  selectedStarterPosition?: Position;
  proposedStarter?: LivePlayer;
  selectedOffPlayer?: string;
  selectedOnPlayer?: string;
  proposedSub?: LivePlayer;
}

export interface LiveState extends LiveGameState {
  hydrated?: boolean;
  clock?: ClockState;
}

const INITIAL_STATE: LiveGameState = {
  gameId: '',
  liveGame: undefined,
  selectedStarterPlayer: undefined,
  selectedStarterPosition: undefined,
  proposedStarter: undefined,
  selectedOffPlayer: undefined,
  selectedOnPlayer: undefined,
  proposedSub: undefined,
};

export const liveGameSelector = (state: RootState) => state.live && state.live!.liveGame;
export const proposedSubSelector = (state: RootState) => state.live && state.live!.proposedSub;
export const clockSelector = (state: RootState) => state.live && state.live!.clock;

export const live: Reducer<LiveState> = function (state, action) {
  const partialState = liveGame(state, action);
  const newState: LiveState = {
    ...partialState,
    clock: clock(state ? state.clock : undefined, action)
  }
  return hydrateReducer(newState, action);
}

const hydrateReducer: Reducer<LiveState> = createReducer({} as LiveState, {
  [LIVE_HYDRATE]: (newState, action: LiveActionHydrate) => {
    if (newState.hydrated) {
      return;
    }
    newState.hydrated = true;
    if (!action.gameId) {
      return;
    }
    if (!action.game) {
      return;
    }
    newState.gameId = action.game.id;
    newState.liveGame = action.game;
    if (action.clock) {
      newState.clock = action.clock;
    }
  },
});

const liveGame: Reducer<LiveGameState> = createReducer(INITIAL_STATE, {
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

function clearProposedSub(newState: LiveState) {
  delete newState.selectedOffPlayer;
  delete newState.selectedOnPlayer;
  delete newState.proposedSub;
}

function findPlayer(newState: LiveState, playerId: string) {
  return getPlayer(newState.liveGame!, playerId);
}

function findPlayersByStatus(newState: LiveState, status: PlayerStatus, selectedOnly?: boolean) {
  let matches: LivePlayer[] = [];
  newState.liveGame!.players!.forEach(player => {
    if (player.status !== status) {
      return;
    }
    if (selectedOnly && !player.selected) {
      return;
    }

    matches.push(player);
  });
  return matches;
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
