/**
@license
*/

import { GameActionGetGameSuccess, GameActionHydrate } from '@app/actions/game';
import { Reducer } from 'redux';
import {
  GameDetail, GameStatus,
  LivePlayer,
  SetupStatus, SetupSteps, SetupTask
} from '../models/game';
import { Player, Roster } from '../models/player';
import {
  ADD_PLAYER,
  CAPTAINS_DONE,
  COPY_ROSTER_FAIL,
  COPY_ROSTER_REQUEST,
  COPY_ROSTER_SUCCESS,
  GAME_HYDRATE,
  GET_GAME_FAIL,
  GET_GAME_REQUEST,
  GET_GAME_SUCCESS,
  ROSTER_DONE,
  SET_FORMATION,
  STARTERS_DONE,
  START_GAME
} from '../slices/game-types';
import { RootAction, RootState } from '../store';
import { createReducer } from './createReducer'; // 'redux-starter-kit';

export interface GameState {
  hydrated: boolean;
  gameId: string;
  game?: GameDetail;
  detailLoading: boolean;
  detailFailure: boolean;
  rosterLoading: boolean;
  rosterFailure: boolean;
  error?: string;
}

const INITIAL_STATE: GameState = {
  hydrated: false,
  gameId: '',
  game: undefined,
  detailLoading: false,
  detailFailure: false,
  rosterLoading: false,
  rosterFailure: false,
  error: ''
};

export const currentGameIdSelector = (state: RootState) => state.game && state.game.gameId;
export const currentGameSelector = (state: RootState) => state.game && state.game.game;

export const game: Reducer<GameState, RootAction> = createReducer(INITIAL_STATE, {
  [GAME_HYDRATE]: (newState, action: GameActionHydrate) => {
    if (newState.hydrated) {
      return;
    }
    newState.hydrated = true;
    if (!action.gameId) {
      return;
    }
    const cachedGame = action.games[action.gameId];
    if (!cachedGame || !cachedGame.hasDetail) {
      return;
    }
    newState.gameId = cachedGame.id;
    newState.game = cachedGame as GameDetail;
  },

  [GET_GAME_REQUEST]: (newState, action) => {
    newState.gameId = action.gameId;
    newState.detailFailure = false;
    newState.detailLoading = true;
  },

  [GET_GAME_SUCCESS]: (newState, action: GameActionGetGameSuccess) => {
    newState.detailFailure = false;
    newState.detailLoading = false;

    if (newState.game && newState.game.id === action.game.id) {
      // Game has already been retrieved.
      return;
    }
    const gameDetail: GameDetail = {
      ...action.game
    };
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
  },

  [GET_GAME_FAIL]: (newState, action) => {
    newState.error = action.error;
    newState.detailFailure = true;
    newState.detailLoading = false;
  },

  [COPY_ROSTER_REQUEST]: (newState, action) => {
    newState.gameId = action.gameId;
    newState.rosterFailure = false;
    newState.rosterLoading = true;
  },

  [COPY_ROSTER_SUCCESS]: (newState, action) => {
    // Set new roster, if required.
    if (action.gameRoster && (Object.keys(newState.game!.roster).length === 0)) {
      const gameRoster = action.gameRoster!;
      const roster: Roster = {};
      Object.keys(gameRoster).forEach((key) => {
        const teamPlayer: Player = gameRoster[key];
        const player: Player = { ...teamPlayer };
        roster[player.id] = player;
      });
      newState.game!.roster = roster;
      // TODO: Ensure games state has latest game detail
      // newState.games[action.game.id] = gameWithRoster;

    }

    newState.rosterFailure = false;
    newState.rosterLoading = false;
  },

  [COPY_ROSTER_FAIL]: (newState, action) => {
    newState.error = action.error;
    newState.rosterFailure = true;
    newState.rosterLoading = false;
  },

  [ADD_PLAYER]: (newState, action) => {
    newState.game!.roster[action.player.id] = action.player;
  },

  [ROSTER_DONE]: (newState, action) => {
    completeSetupStepForAction(newState, action.type);

// TODO: Should this move to the live reducer?
    // Setup live players from roster
    const roster = newState.game!.roster;
    const players: LivePlayer[] = Object.keys(roster).map((playerId) => {
      const player = roster[playerId];
      return { ...player } as LivePlayer;
    });

    newState.game!.liveDetail!.players = players;
  },

  [CAPTAINS_DONE]: (newState, action) => {
    completeSetupStepForAction(newState, action.type);
  },

  [STARTERS_DONE]: (newState, action) => {
    completeSetupStepForAction(newState, action.type);
  },

  [SET_FORMATION]: (newState, action) => {
    const game = newState.game!;
    game.formation = { type: action.formationType };
    updateTasks(game, game.liveDetail!.setupTasks);
  },

  [START_GAME]: (newState) => {
    const game = newState.game!;
    game.status = GameStatus.Start;
    if (game.liveDetail) {
      delete game.liveDetail.setupTasks;
    }
  },

});

function completeSetupStepForAction(newState: GameState, actionType: string) {
  const setupStepToMarkDone = getStepForAction(actionType);
  const game = newState.game!;

  updateTasks(game, game.liveDetail!.setupTasks, setupStepToMarkDone);
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

  game.liveDetail.setupTasks = tasks;
}
