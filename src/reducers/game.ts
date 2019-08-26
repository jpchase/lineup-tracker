/**
@license
*/

import { Reducer } from 'redux';
import { Position } from '../models/formation';
import {
  GameDetail, GameStatus,
  LiveGame, LivePlayer,
  SetupStatus, SetupSteps, SetupTask
} from '../models/game';
import { Player, PlayerStatus, Roster } from '../models/player';
import {
  APPLY_STARTER,
  CANCEL_STARTER,
  GET_GAME_REQUEST,
  GET_GAME_SUCCESS,
  GET_GAME_FAIL,
  CAPTAINS_DONE,
  COPY_ROSTER_REQUEST,
  COPY_ROSTER_SUCCESS,
  COPY_ROSTER_FAIL,
  ADD_PLAYER,
  ROSTER_DONE,
  STARTERS_DONE,
  SET_FORMATION,
  START_GAME,
  SELECT_PLAYER,
  SELECT_POSITION
} from '../actions/game-types';
import { RootAction, RootState } from '../store';

export interface GameState {
  gameId: string;
  game?: GameDetail;
  selectedPosition?: Position;
  selectedPlayer?: string;
  proposedStarter?: LivePlayer;
  detailLoading: boolean;
  detailFailure: boolean;
  rosterLoading: boolean;
  rosterFailure: boolean;
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
  rosterLoading: false,
  rosterFailure: false,
  error: ''
};

export const currentGameIdSelector = (state: RootState) => state.game && state.game.gameId;

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
      gameDetail.hasDetail = true;
      if (!gameDetail.status) {
        gameDetail.status = GameStatus.New;
      }

      if (gameDetail.status === GameStatus.New) {
        if (!gameDetail.liveDetail) {
          gameDetail.liveDetail = {
            id: gameDetail.id
          }
          updateTasks(gameDetail);
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

    case COPY_ROSTER_REQUEST:
      newState.gameId = action.gameId;
      newState.rosterFailure = false;
      newState.rosterLoading = true;
      return newState;

    case COPY_ROSTER_SUCCESS:
      // Set new roster, if required.
      if (action.gameRoster && (Object.keys(newState.game!.roster).length === 0)) {
        const gameRoster = action.gameRoster!;
        const roster: Roster = {};
        Object.keys(gameRoster).forEach((key) => {
          const teamPlayer: Player = gameRoster[key];
          const player: Player = { ...teamPlayer};
          roster[player.id] = player;
        });
        const gameWithRoster: GameDetail = {
          ...newState.game!,
          hasDetail: true,
          roster: roster
        };
        newState.game = gameWithRoster;
        // TODO: Ensure games state has latest game detail
        // newState.games[action.game.id] = gameWithRoster;

      }

      newState.rosterFailure = false;
      newState.rosterLoading = false;
      return newState;

    case COPY_ROSTER_FAIL:
      newState.error = action.error;
      newState.rosterFailure = true;
      newState.rosterLoading = false;
      return newState;

    case ADD_PLAYER:
      const gameWithPlayer: GameDetail = {
        ...newState.game!
      };

      gameWithPlayer.roster = { ...gameWithPlayer.roster };
      gameWithPlayer.roster[action.player.id] = action.player;

      newState.game = gameWithPlayer;
      return newState;

    case ROSTER_DONE:
      completeSetupStepForAction(newState, ROSTER_DONE);

      // Setup live players from roster
      const roster = newState.game!.roster;
      const players: LivePlayer[] = Object.keys(roster).map((playerId) => {
        const player = roster[playerId];
        return { ...player } as LivePlayer;
      });

      newState.game!.liveDetail!.players = players;
      return newState;

    case CAPTAINS_DONE:
    case STARTERS_DONE:
      completeSetupStepForAction(newState, action.type);
      return newState;

    case SET_FORMATION:
      const existingGame: GameDetail = newState.game!;
      const gameWithFormation: GameDetail = {
        ...existingGame,
        formation: { type: action.formationType }
      };

      updateTasks(gameWithFormation, existingGame.liveDetail!.setupTasks);

      newState.game = gameWithFormation;
      return newState;

    case START_GAME:
      const gameToBeStarted: GameDetail = newState.game!;
      const startedGame: GameDetail = {
        ...gameToBeStarted
      };
      startedGame.status = GameStatus.Start;
      if (startedGame.liveDetail) {
        startedGame.liveDetail = {
          ...startedGame.liveDetail
        };
        delete startedGame.liveDetail.setupTasks;
      }

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

    case APPLY_STARTER:
      const starter = newState.proposedStarter!;
      const positionId = starter.currentPosition!.id;

      const detail = newState.game!.liveDetail!;
      const updatedPlayers = detail.players!.map(player => {
        if (player.id === starter.id) {
          return {
            ...player,
            status: PlayerStatus.On,
            currentPosition: { ...starter.currentPosition } as Position
          }
        }

        // Checks for an existing starter in the position.
        if (player.status === PlayerStatus.On && player.currentPosition!.id === positionId) {
          // Replace the starter, moving the player to off.
          return {
            ...player,
            status: PlayerStatus.Off,
            currentPosition: undefined
          }
        }

        return player;
      });
      newState.game = {
        ...newState.game!,
        liveDetail: {
          ...newState.game!.liveDetail,
          players: updatedPlayers
        } as LiveGame
      }

      clearProposedStarter(newState);

      return newState;

    case CANCEL_STARTER:
      clearProposedStarter(newState);

      return newState;

    default:
      return state;
  }
};

export default game;

function completeSetupStepForAction(newState: GameState, actionType: string) {
  const setupStepToMarkDone = getStepForAction(actionType);
  const incompleteGame: GameDetail = newState.game!;
  const updatedGame: GameDetail = {
    ...incompleteGame
  };

  updateTasks(updatedGame, incompleteGame.liveDetail!.setupTasks, setupStepToMarkDone);

  newState.game = updatedGame;
}

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

function updateTasks(game: GameDetail, oldTasks?: SetupTask[], completedStep?: SetupSteps) {
  if (!game.liveDetail) {
    // It's a bug to call this without liveDetail initialized. Just log, rather
    // than throw an error or something.
    console.log(`The liveDetail property should be initialized for game: ${JSON.stringify(game)}`);
    return;
  }

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

  game.liveDetail = {
    ...game.liveDetail,
    setupTasks: tasks
  };
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

function clearProposedStarter(newState: GameState) {
  delete newState.selectedPlayer;
  delete newState.selectedPosition;
  delete newState.proposedStarter;
}
