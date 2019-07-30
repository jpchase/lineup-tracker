/**
@license
*/

import { Reducer } from 'redux';
import { Position } from '../models/formation';
import {
  GameDetail, GameStatus,
  LivePlayer,
  SetupStatus, SetupSteps, SetupTask
} from '../models/game';
import { Player, Roster } from '../models/player';
import {
  GET_GAME_REQUEST,
  GET_GAME_SUCCESS,
  GET_GAME_FAIL,
  CAPTAINS_DONE,
  ROSTER_DONE,
  STARTERS_DONE,
  SET_FORMATION,
  START_GAME,
  SELECT_PLAYER,
  SELECT_POSITION
} from '../actions/game';
import { RootAction } from '../store';

export interface GameState {
  gameId: string;
  game?: GameDetail;
  selectedPosition?: Position;
  selectedPlayer?: string;
  proposedStarter?: LivePlayer;
  detailLoading: boolean;
  detailFailure: boolean;
  error?: string;
}

const INITIAL_STATE: GameState = {
  gameId: '',
  game: undefined,
  selectedPosition: undefined,
  selectedPlayer: undefined,
  proposedStarter: undefined,
  detailLoading: false,
  detailFailure: false,
  error: ''
};

const game: Reducer<GameState, RootAction> = (state = INITIAL_STATE, action) => {
  const newState: GameState = {
    ...state,
  };
  // console.log(`game.ts - reducer: ${JSON.stringify(action)}, state = ${JSON.stringify(state)}`);
  switch (action.type) {
    case GET_GAME_REQUEST:
      newState.gameId = action.gameId;
      newState.detailFailure = false;
      newState.detailLoading = true;
      return newState;

    case GET_GAME_SUCCESS:
      const gameDetail: GameDetail = action.game;
      // Copy team roster, if required.
      let hasGameRoster = (Object.keys(gameDetail.roster).length > 0);
      if (action.teamRoster && !hasGameRoster) {
        const teamRoster = action.teamRoster!;
        const roster: Roster = Object.keys(teamRoster).reduce((obj, key) => {
          const teamPlayer: Player = teamRoster[key];
          const player: Player = { ...teamPlayer};
          obj[player.id] = player;
          return obj;
        }, {} as Roster);
        gameDetail.roster = roster;
        hasGameRoster = true;
      }
      gameDetail.hasDetail = hasGameRoster;
      if (!gameDetail.status) {
        gameDetail.status = GameStatus.New;
      }

      if (gameDetail.status === GameStatus.New) {
        if (!gameDetail.setupTasks) {
          gameDetail.setupTasks = buildTasks(gameDetail);
        }
      }
      newState.game = gameDetail;
      // TODO: Ensure games state has latest game detail
      // newState.games[action.game.id] = action.game;
      newState.detailFailure = false;
      newState.detailLoading = false;
      return newState;

    case GET_GAME_FAIL:
      newState.error = action.error;
      newState.detailFailure = true;
      newState.detailLoading = false;
      return newState;

    case CAPTAINS_DONE:
    case ROSTER_DONE:
    case STARTERS_DONE:
      const setupStepToMarkDone = getStepForAction(action.type);
      const incompleteGame: GameDetail = newState.game!;
      const gameWithStepDone: GameDetail = {
        ...incompleteGame
      };

      gameWithStepDone.setupTasks = buildTasks(gameWithStepDone,
                                incompleteGame.setupTasks, setupStepToMarkDone);

      newState.game = gameWithStepDone;
      return newState;

    case SET_FORMATION:
      const existingGame: GameDetail = newState.game!;
      const gameWithFormation: GameDetail = {
        ...existingGame,
        formation: { type: action.formationType }
      };

      gameWithFormation.setupTasks = buildTasks(gameWithFormation, existingGame.setupTasks);

      newState.game = gameWithFormation;
      return newState;

    case START_GAME:
      const gameToBeStarted: GameDetail = newState.game!;
      const startedGame: GameDetail = {
        ...gameToBeStarted
      };
      startedGame.status = GameStatus.Start;
      delete startedGame.setupTasks;

      newState.game = startedGame;
      return newState;

    case SELECT_PLAYER:
      newState.selectedPlayer = action.playerId;

      prepareStarterIfPossible(newState);

      return newState;

    case SELECT_POSITION:
      newState.selectedPosition = action.position;

      prepareStarterIfPossible(newState);

      return newState;

    default:
      return state;
  }
};

export default game;

function getStepForAction(actionType: string) : SetupSteps | undefined {
  switch (actionType) {
    case CAPTAINS_DONE:
      return SetupSteps.Captains;
    case ROSTER_DONE:
      return SetupSteps.Roster;
    case STARTERS_DONE:
      return SetupSteps.Starters;
    default:
      return undefined;
  }
}

function buildTasks(game: GameDetail, oldTasks?: SetupTask[], completedStep?: SetupSteps) : SetupTask[] {
  const tasks: SetupTask[] = [];

  // Formation
  //  - Complete status is based on the formation property being set.
  const formationComplete = !!game.formation;
  tasks.push({
    step: SetupSteps.Formation,
    status: formationComplete ? SetupStatus.Complete : SetupStatus.Active
  });

  // Other steps are manually set to complete, so can be handled generically.
  const steps = [ SetupSteps.Roster, SetupSteps.Captains, SetupSteps.Starters ];

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

  return tasks;
}

function prepareStarterIfPossible(newState: GameState) {
  if (!newState.selectedPosition || !newState.selectedPlayer) {
    // Need both a position and player selected to setup a starter
    return;
  }

  const player = newState.game!.roster[newState.selectedPlayer];

  newState.proposedStarter = {
    ...player,
    currentPosition: {
      ...newState.selectedPosition
    }
  }
}
