import { AnyAction, PayloadAction } from '@reduxjs/toolkit';
import { FormationType, Position } from '../../models/formation.js';
import { GameStatus, SetupStatus, SetupSteps, SetupTask } from '../../models/game.js';
import { getPlayer, LiveGame, LiveGameBuilder, LivePlayer } from '../../models/live.js';
import { PlayerStatus, Roster } from '../../models/player.js';
import {
  FormationSelectedPayload,
  GameSetupCompletedPayload,
  LiveGamePayload,
  RosterCompletedPayload,
  SelectPlayerPayload, StartersInvalidPayload
} from './live-action-types.js';
import { LiveState } from './live-slice.js';

export const rosterCompletedHandler = (_state: LiveState, game: LiveGame, action: PayloadAction<RosterCompletedPayload>) => {
  // Setup live players from roster
  const roster = action.payload.roster;
  const players: LivePlayer[] = Object.keys(roster).map((playerId) => {
    const player = roster[playerId];
    return { ...player } as LivePlayer;
  });

  game.players = players;

  completeSetupStepForAction(game, SetupSteps.Roster);
}

export const rosterCompletedPrepare = (gameId: string, roster: Roster) => {
  return {
    payload: {
      gameId,
      roster,
    }
  };
}

export const formationSelectedHandler = (_state: LiveState, game: LiveGame, action: PayloadAction<FormationSelectedPayload>) => {
  if (!action.payload.formationType) {
    return;
  }
  game.formation = { type: action.payload.formationType };

  completeSetupStepForAction(game, SetupSteps.Formation);
}

export const formationSelectedPrepare = (gameId: string, formationType: FormationType) => {
  return {
    payload: {
      gameId,
      formationType
    }
  };
}

export const selectStarterHandler = (state: LiveState, game: LiveGame, action: PayloadAction<SelectPlayerPayload>) => {
  const playerId = action.payload.playerId;
  const selectedPlayer = getPlayer(game, playerId);
  if (selectedPlayer) {
    selectedPlayer.selected = !!action.payload.selected;
  }

  // Handles de-selection.
  if (!action.payload.selected) {
    if (state.selectedStarterPlayer === playerId) {
      state.selectedStarterPlayer = undefined;
    }
    return;
  }
  state.selectedStarterPlayer = playerId;

  prepareStarterIfPossible(state, game);
}

export const selectStarterPrepare = (playerId: string, selected: boolean) => {
  return {
    payload: {
      playerId,
      selected: !!selected
    }
  };
}

export const selectStarterPositionHandler = (state: LiveState, game: LiveGame, action: PayloadAction<{ position: Position }>) => {
  state.selectedStarterPosition = action.payload.position;

  prepareStarterIfPossible(state, game);
}

export const selectStarterPositionPrepare = (position: Position) => {
  return {
    payload: {
      position
    }
  };
}

export const applyStarterHandler = (state: LiveState, game: LiveGame, _action: AnyAction) => {
  if (!state.proposedStarter) {
    return;
  }
  const starter = state.proposedStarter;
  const positionId = starter.currentPosition!.id;

  game.players!.forEach(player => {
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

  clearProposedStarter(state);
}

export const cancelStarterHandler = (state: LiveState, game: LiveGame, _action: AnyAction) => {
  if (!state.proposedStarter) {
    return;
  }
  const selectedPlayer = getPlayer(game, state.selectedStarterPlayer!);
  if (selectedPlayer && selectedPlayer.selected) {
    selectedPlayer.selected = false;
  }
  clearProposedStarter(state);
}

export const startersCompletedHandler = (state: LiveState, game: LiveGame, _action: PayloadAction<LiveGamePayload>) => {
  completeSetupStepForAction(game, SetupSteps.Starters);
  state.invalidStarters = undefined;
}

export const invalidStartersHandler = (state: LiveState, _game: LiveGame, action: PayloadAction<StartersInvalidPayload>) => {
  if (!action.payload.invalidStarters?.length) {
    state.invalidStarters = undefined;
    return;
  }
  state.invalidStarters = action.payload.invalidStarters;
};

export const invalidStartersPrepare = (gameId: string, invalidStarters: string[]) => {
  return {
    payload: {
      gameId,
      invalidStarters,
    }
  };
}

export const captainsCompletedHandler = (_state: LiveState, game: LiveGame, _action: PayloadAction<LiveGamePayload>) => {
  completeSetupStepForAction(game, SetupSteps.Captains);
}

export const setupCompletedHandler = (_state: LiveState, game: LiveGame, _action: PayloadAction<GameSetupCompletedPayload>) => {
  if (game.status !== GameStatus.New) {
    return;
  }
  game.status = GameStatus.Start;
  if (!game.clock) {
    game.clock = LiveGameBuilder.createClock();
  }
  delete game.setupTasks;
}

function completeSetupStepForAction(game: LiveGame, setupStepToComplete: SetupSteps) {
  updateTasks(game, game.setupTasks, setupStepToComplete);
}

function updateTasks(game: LiveGame, oldTasks?: SetupTask[], completedStep?: SetupSteps) {
  const tasks: SetupTask[] = [];

  // Formation
  //  - Complete status is based on the formation property being set.
  const formationComplete = !!game.formation;
  tasks.push({
    step: SetupSteps.Formation,
    status: formationComplete ? SetupStatus.Complete : SetupStatus.Active
  });

  // Other steps are manually set to complete, so can be handled generically.
  const steps = [SetupSteps.Roster, SetupSteps.Captains, SetupSteps.Starters];

  let previousStepComplete = formationComplete;
  steps.forEach((stepValue: SetupSteps) => {
    // Set the step complete status from the explicit parameter or old tasks, if available.
    // Otherwise, step status is later set based on whether the preceding step is complete.
    let stepComplete = false;
    if (stepValue === completedStep) {
      stepComplete = true;
    } else if (oldTasks) {
      stepComplete = (oldTasks[stepValue].status === SetupStatus.Complete);
    }

    tasks.push({
      step: stepValue,
      status: stepComplete ? SetupStatus.Complete :
        (previousStepComplete ?
          SetupStatus.Active : SetupStatus.Pending)
    });

    // Finally, save the complete status for the next step.
    previousStepComplete = stepComplete;
  });

  game.setupTasks = tasks;
}

function prepareStarterIfPossible(state: LiveState, game: LiveGame) {
  if (!state.selectedStarterPlayer || !state.selectedStarterPosition) {
    // Need both a position and player selected to setup a starter
    return;
  }
  const player = getPlayer(game, state.selectedStarterPlayer);
  if (!player) {
    return;
  }

  state.proposedStarter = {
    ...player,
    currentPosition: {
      ...state.selectedStarterPosition
    }
  }
}

function clearProposedStarter(state: LiveState) {
  delete state.selectedStarterPlayer;
  delete state.selectedStarterPosition;
  delete state.proposedStarter;
}
