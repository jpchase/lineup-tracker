import { createNextState, createSlice, PayloadAction, Reducer } from '@reduxjs/toolkit';
import { Position } from '../../models/formation.js';
import { Game, GameDetail, GameStatus, SetupStatus, SetupSteps, SetupTask } from '../../models/game.js';
import { findPlayersByStatus, gameCanStartPeriod, getPlayer, LiveGame, LiveGameBuilder, LiveGames, LivePlayer } from '../../models/live.js';
import { PlayerStatus } from '../../models/player.js';
import { getGame, selectGameById } from '../../slices/game/game-slice.js';
import { RootState, ThunkResult } from '../../store.js';
import {
  configurePeriodsHandler, configurePeriodsPrepare,
  endPeriodHandler,
  startPeriodHandler, startPeriodPrepare,
  toggleHandler
} from './clock-reducer-logic.js';
import { LiveGamePayload, prepareLiveGamePayload } from './live-action-types.js';
import {
  applyStarterHandler, cancelStarterHandler,
  captainsCompletedHandler,
  formationSelectedHandler, formationSelectedPrepare,
  invalidStartersHandler, invalidStartersPrepare,
  rosterCompletedHandler, rosterCompletedPrepare,
  selectStarterHandler, selectStarterPositionHandler, selectStarterPositionPrepare, selectStarterPrepare,
  setupCompletedHandler, startersCompletedHandler
} from './setup-reducer-logic.js';
import { shift, ShiftState } from './shift-slice.js';
import {
  cancelSubHandler,
  cancelSwapHandler,
  confirmSubHandler, confirmSubPrepare,
  confirmSwapHandler,
  discardPendingSubsHandler, discardPendingSubsPrepare,
  invalidPendingSubsHandler, invalidPendingSubsPrepare,
  markPlayerOutHandler,
  pendingSubsAppliedHandler, pendingSubsAppliedPrepare,
  returnOutPlayerHandler,
  selectPlayerHandler, selectPlayerPrepare
} from './substitution-reducer-logic.js';
export { pendingSubsAppliedCreator, startersCompletedCreator } from './live-action-creators.js';

export interface LiveGameState {
  games?: LiveGames;
  selectedStarterPlayer?: string;
  selectedStarterPosition?: Position;
  proposedStarter?: LivePlayer;
  invalidStarters?: string[];
  selectedOffPlayer?: string;
  selectedOnPlayer?: string;
  selectedOnPlayer2?: string;
  selectedOutPlayer?: string;
  proposedSub?: LivePlayer;
  proposedSwap?: LivePlayer;
  invalidSubs?: string[];
}

export interface LiveState extends LiveGameState {
  shift?: ShiftState;
}

const INITIAL_STATE: LiveGameState = {
  games: {},
  selectedStarterPlayer: undefined,
  selectedStarterPosition: undefined,
  proposedStarter: undefined,
  selectedOffPlayer: undefined,
  selectedOnPlayer: undefined,
  proposedSub: undefined,
  invalidSubs: undefined
};

export const selectLiveGameById = (state: RootState, gameId: string) => {
  if (!state.live || !gameId) {
    return;
  }
  return findGame(state.live, gameId);
}

export const proposedSubSelector = (state: RootState) => state.live && state.live!.proposedSub;
export const selectProposedSwap = (state: RootState) => state.live?.proposedSwap;
export const selectInvalidSubs = (state: RootState) => state.live?.invalidSubs;
export const selectInvalidStarters = (state: RootState) => state.live?.invalidStarters;
export const selectCurrentShift = (state: RootState) => state.live?.shift;
export const selectPendingSubs = (state: RootState, gameId: string, selectedOnly?: boolean, includeSwaps?: boolean) => {
  const game = selectLiveGameById(state, gameId);
  if (!game) {
    return;
  }
  const nextPlayers = findPlayersByStatus(game, PlayerStatus.Next, selectedOnly, includeSwaps);
  if (nextPlayers.some(player => {
    if (includeSwaps && player.isSwap) {
      return false;
    }
    const replacedPlayer = getPlayer(game, player.replaces!);
    return (replacedPlayer?.status !== PlayerStatus.On);
  })) {
    return;
  }
  return nextPlayers;
}

export const rosterCompleted = (gameId: string): ThunkResult => (dispatch, getState) => {
  const game = selectGameById(getState(), gameId);
  if (!game) {
    return;
  }
  dispatch(actions.completeRoster(gameId, game.roster));
};

export const startGamePeriod = (gameId: string): ThunkResult => (dispatch, getState) => {
  const state = getState();
  const game = selectLiveGameById(state, gameId);
  if (!game || !game.clock) {
    return;
  }
  dispatch(startPeriod(game.id, gameCanStartPeriod(game, game.clock.currentPeriod, game.clock.totalPeriods)));
};

export const live: Reducer<LiveState> = function (state, action) {
  // Use immer so that a new object is returned only when something actually changes.
  // This is important to avoid triggering unnecessary rendering cycles.
  // - The |state| might be undefined on app initialization. Immer will *not*
  //   create a draft for undefined, which causes an error for Object.assign().
  //   As a workaround, pass the |INITIAL_STATE|, even though it seems redundant with
  //   the inner reducers.
  return createNextState(state || INITIAL_STATE as LiveState, (draft) => {
    Object.assign(draft, liveSlice.reducer(draft, action));
    draft!.shift = shift(draft?.shift, action);
  }) as LiveState;
}

const liveSlice = createSlice({
  name: 'live',
  initialState: INITIAL_STATE,
  reducers: {
    getLiveGame: (state, action: PayloadAction<Game>) => {
      const liveGame: LiveGame = LiveGameBuilder.create(action.payload);
      if (liveGame.status === GameStatus.New) {
        updateTasks(liveGame);
      }
      setCurrentGame(state, liveGame);
    },

    completeRoster: {
      reducer: buildActionHandler(rosterCompletedHandler),
      prepare: rosterCompletedPrepare
    },

    formationSelected: {
      reducer: buildActionHandler(formationSelectedHandler),
      prepare: formationSelectedPrepare
    },

    startersCompleted: {
      reducer: buildActionHandler(startersCompletedHandler),
      prepare: prepareLiveGamePayload
    },

    invalidStarters: {
      reducer: buildActionHandler(invalidStartersHandler),
      prepare: invalidStartersPrepare
    },

    captainsCompleted: {
      reducer: buildActionHandler(captainsCompletedHandler),
      prepare: prepareLiveGamePayload
    },

    gameSetupCompleted: {
      reducer: buildActionHandler(setupCompletedHandler),

      prepare: (gameId: string, game: LiveGame) => {
        return {
          payload: {
            gameId,
            liveGame: game
          }
        };
      }
    },

    selectStarter: {
      reducer: buildActionHandler(selectStarterHandler),
      prepare: selectStarterPrepare
    },

    selectStarterPosition: {
      reducer: buildActionHandler(selectStarterPositionHandler),
      prepare: selectStarterPositionPrepare
    },

    applyStarter: {
      reducer: buildActionHandler(applyStarterHandler),
      prepare: prepareLiveGamePayload
    },

    cancelStarter: {
      reducer: buildActionHandler(cancelStarterHandler),
      prepare: prepareLiveGamePayload
    },

    selectPlayer: {
      reducer: buildActionHandler(selectPlayerHandler),
      prepare: selectPlayerPrepare
    },

    confirmSub: {
      reducer: buildActionHandler(confirmSubHandler),
      prepare: confirmSubPrepare
    },

    cancelSub: {
      reducer: buildActionHandler(cancelSubHandler),
      prepare: prepareLiveGamePayload
    },

    confirmSwap: {
      reducer: buildActionHandler(confirmSwapHandler),
      prepare: prepareLiveGamePayload
    },

    cancelSwap: {
      reducer: buildActionHandler(cancelSwapHandler),
      prepare: prepareLiveGamePayload
    },

    applyPendingSubs: {
      reducer: buildActionHandler(pendingSubsAppliedHandler),
      prepare: pendingSubsAppliedPrepare
    },

    invalidPendingSubs: {
      reducer: buildActionHandler(invalidPendingSubsHandler),
      prepare: invalidPendingSubsPrepare
    },

    discardPendingSubs: {
      reducer: buildActionHandler(discardPendingSubsHandler),
      prepare: discardPendingSubsPrepare
    },

    markPlayerOut: {
      reducer: buildActionHandler(markPlayerOutHandler),
      prepare: prepareLiveGamePayload
    },

    returnOutPlayer: {
      reducer: buildActionHandler(returnOutPlayerHandler),
      prepare: prepareLiveGamePayload
    },

    gameCompleted: {
      reducer: (state, action: PayloadAction<LiveGamePayload>) => {
        const game = findGame(state, action.payload.gameId);
        if (!game) {
          return;
        }
        if (game.status !== GameStatus.Done) {
          return;
        }
        // TODO: Aggregate/persist data as necessary
        game.dataCaptured = true;
      },

      prepare: prepareLiveGamePayload
    },

    // Clock-related actions
    configurePeriods: {
      reducer: buildActionHandler(configurePeriodsHandler),
      prepare: configurePeriodsPrepare
    },

    startPeriod: {
      reducer: buildActionHandler(startPeriodHandler),
      prepare: startPeriodPrepare
    },

    endPeriod: {
      reducer: buildActionHandler(endPeriodHandler),
      prepare: prepareLiveGamePayload
    },

    toggleClock: {
      reducer: buildActionHandler(toggleHandler),
      prepare: prepareLiveGamePayload
    },
  },
  extraReducers: (builder) => {
    builder.addCase(getGame.fulfilled, (state: LiveGameState,
      action: PayloadAction<GameDetail>) => {
      if (findGame(state, action.payload.id)) {
        // Game has already been initialized.
        return;
      }

      const game: LiveGame = LiveGameBuilder.create(action.payload);
      if (action.payload.status === GameStatus.New) {
        updateTasks(game);
      }

      setCurrentGame(state, game);
    });
  }
});

const { actions } = liveSlice;
export const {
  // TODO: Remove this export of completeRoster when no longer needed in reducers/game.ts
  completeRoster,
  formationSelected, getLiveGame, startersCompleted, captainsCompleted, gameSetupCompleted,
  // Starter-related actions
  selectStarter, selectStarterPosition, applyStarter, cancelStarter, invalidStarters,
  // Clock-related actions
  configurePeriods, startPeriod, endPeriod, toggleClock,
  // Sub-related actions
  selectPlayer, cancelSub, confirmSub, cancelSwap, confirmSwap, applyPendingSubs,
  invalidPendingSubs, discardPendingSubs, markPlayerOut, returnOutPlayer,
  // Game status actions
  gameCompleted
} = actions;

type ActionHandler<P extends LiveGamePayload> =
  (state: LiveState, game: LiveGame, action: PayloadAction<P>) => void;

function buildActionHandler<P extends LiveGamePayload>(handler: ActionHandler<P>) {
  return (state: LiveState, action: PayloadAction<P>) => {
    return invokeActionHandler(state, action, handler);
  }
}

function invokeActionHandler<P extends LiveGamePayload>(state: LiveState, action: PayloadAction<P>,
  handler: ActionHandler<P>) {
  const game = findGame(state, action.payload.gameId);
  if (!game) {
    return;
  }
  return handler(state, game, action);
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

function findGame(state: LiveState, gameId: string) {
  if (!state.games || !(gameId in state.games)) {
    return;
  }
  return state.games[gameId];
}

function setCurrentGame(state: LiveState, game: LiveGame) {
  if (!state.games) {
    state.games = {};
  }
  state.games[game.id] = game;
}
