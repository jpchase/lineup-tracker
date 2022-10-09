import { AnyAction, PayloadAction } from '@reduxjs/toolkit';
import { FormationType } from '../../models/formation.js';
import { GameStatus, SetupStatus, SetupSteps, SetupTask } from '../../models/game.js';
import { LiveGame, LiveGameBuilder, LivePlayer } from '../../models/live.js';
import { Roster } from '../../models/player.js';
import { GameSetupCompletedPayload, StartersInvalidPayload } from './live-action-types.js';
import { LiveState } from './live-slice.js';

export const rosterCompletedHandler = (_state: LiveState, game: LiveGame, action: PayloadAction<Roster>) => {
  // Setup live players from roster
  const roster = action.payload;
  const players: LivePlayer[] = Object.keys(roster).map((playerId) => {
    const player = roster[playerId];
    return { ...player } as LivePlayer;
  });

  game.players = players;

  completeSetupStepForAction(game, SetupSteps.Roster);
}

export const formationSelectedHandler = (_state: LiveState, game: LiveGame, action: PayloadAction<{ formationType: FormationType }>) => {
  if (!action.payload.formationType) {
    return;
  }
  game.formation = { type: action.payload.formationType };

  completeSetupStepForAction(game, SetupSteps.Formation);
}

export const formationSelectedPrepare = (formationType: FormationType) => {
  return {
    payload: {
      formationType
    }
  };
}

export const startersCompletedHandler = (state: LiveState, game: LiveGame, _action: AnyAction) => {
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

export const captainsCompletedHandler = (_state: LiveState, game: LiveGame, _action: AnyAction) => {
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
