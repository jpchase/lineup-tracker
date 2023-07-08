/** @format */

import { createNextState, createSlice, PayloadAction, Reducer } from '@reduxjs/toolkit';
import { Position } from '../../models/formation.js';
import { Game, GameDetail, GameStatus } from '../../models/game.js';
import {
  findPlayersByStatus,
  gameCanStartPeriod,
  getPlayer,
  LiveGame,
  LiveGameBuilder,
  LiveGames,
  LivePlayer,
} from '../../models/live.js';
import { PlayerStatus } from '../../models/player.js';
import { RootState, ThunkResult } from '../../store.js';
import { getGame, selectGameById } from '../game/game-slice.js';
import {
  configurePeriodsHandler,
  configurePeriodsPrepare,
  endPeriodHandler,
  endPeriodPrepare,
  markPeriodOverdueHandler,
  markPeriodOverduePrepare,
  startPeriodHandler,
  startPeriodPrepare,
  toggleHandler,
} from './clock-reducer-logic.js';
import { eventsReducer, EventState } from './events-slice.js';
import { LiveGamePayload, prepareLiveGamePayload } from './live-action-types.js';
import {
  applyStarterHandler,
  cancelStarterHandler,
  captainsCompletedHandler,
  formationSelectedHandler,
  formationSelectedPrepare,
  invalidStartersHandler,
  invalidStartersPrepare,
  rosterCompletedHandler,
  rosterCompletedPrepare,
  selectStarterHandler,
  selectStarterPositionHandler,
  selectStarterPositionPrepare,
  selectStarterPrepare,
  setupCompletedHandler,
  startersCompletedHandler,
  updateTasks,
} from './setup-reducer-logic.js';
import { shift, ShiftState } from './shift-slice.js';
import {
  cancelSubHandler,
  cancelSwapHandler,
  confirmSubHandler,
  confirmSubPrepare,
  confirmSwapHandler,
  discardPendingSubsHandler,
  discardPendingSubsPrepare,
  invalidPendingSubsHandler,
  invalidPendingSubsPrepare,
  markPlayerOutHandler,
  pendingSubsAppliedHandler,
  pendingSubsAppliedPrepare,
  returnOutPlayerHandler,
  selectPlayerHandler,
  selectPlayerPrepare,
} from './substitution-reducer-logic.js';

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

export interface LiveState extends LiveGameState, EventState {
  shift?: ShiftState;
}

export const LIVE_GAME_INITIAL_STATE: LiveGameState = {
  games: {},
  selectedStarterPlayer: undefined,
  selectedStarterPosition: undefined,
  proposedStarter: undefined,
  selectedOffPlayer: undefined,
  selectedOnPlayer: undefined,
  proposedSub: undefined,
  invalidSubs: undefined,
};

const LIVE_INITIAL_STATE: LiveState = {
  ...LIVE_GAME_INITIAL_STATE,
  // TODO: Figure out to address circular dependency
  // ...EVENTS_INITIAL_STATE,
  events: undefined,
};

export const selectLiveGameById = (state: RootState, gameId: string) => {
  if (!state.live || !gameId) {
    return undefined;
  }
  return findGame(state.live, gameId);
};

export const selectProposedSub = (state: RootState) => state.live && state.live!.proposedSub;
export const selectProposedSwap = (state: RootState) => state.live?.proposedSwap;
export const selectInvalidSubs = (state: RootState) => state.live?.invalidSubs;
export const selectInvalidStarters = (state: RootState) => state.live?.invalidStarters;
export const selectCurrentShift = (state: RootState) => state.live?.shift;
export const selectPendingSubs = (
  state: RootState,
  gameId: string,
  selectedOnly?: boolean,
  includeSwaps?: boolean
) => {
  const game = selectLiveGameById(state, gameId);
  if (!game) {
    return undefined;
  }
  const nextPlayers = findPlayersByStatus(game, PlayerStatus.Next, selectedOnly, includeSwaps);
  const hasInvalid = nextPlayers.some((player) => {
    if (includeSwaps && player.isSwap) {
      return false;
    }
    const replacedPlayer = getPlayer(game, player.replaces!);
    return replacedPlayer?.status !== PlayerStatus.On;
  });
  if (hasInvalid) {
    return undefined;
  }
  return nextPlayers;
};

export const rosterCompleted =
  (gameId: string): ThunkResult =>
  (dispatch, getState) => {
    const game = selectGameById(getState(), gameId);
    if (!game) {
      return;
    }
    dispatch(actions.completeRoster(gameId, game.roster));
  };

export const startGamePeriod =
  (gameId: string): ThunkResult =>
  (dispatch, getState) => {
    const state = getState();
    const game = selectLiveGameById(state, gameId);
    if (!game || !game.clock) {
      return;
    }
    dispatch(
      actions.startPeriod(
        game.id,
        gameCanStartPeriod(game, game.clock.currentPeriod, game.clock.totalPeriods)
      )
    );
  };

export const live: Reducer<LiveState> = function reduce(state, action) {
  // Use immer so that a new object is returned only when something actually changes.
  // This is important to avoid triggering unnecessary rendering cycles.
  // - The |state| might be undefined on app initialization. Immer will *not*
  //   create a draft for undefined, which causes an error for Object.assign().
  //   As a workaround, pass the |LIVE_INITIAL_STATE|, even though it seems redundant with
  //   the inner reducers.
  return createNextState(state || LIVE_INITIAL_STATE, (draft) => {
    Object.assign(draft, liveSlice.reducer(draft, action));
    // eslint-disable-next-line no-param-reassign
    draft!.shift = shift(draft?.shift, action);
    Object.assign(draft, eventsReducer(draft, action));
  }) as LiveState;
};

export const liveSlice = createSlice({
  name: 'live',
  initialState: LIVE_GAME_INITIAL_STATE,
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
      prepare: rosterCompletedPrepare,
    },

    formationSelected: {
      reducer: buildActionHandler(formationSelectedHandler),
      prepare: formationSelectedPrepare,
    },

    startersCompleted: {
      reducer: buildActionHandler(startersCompletedHandler),
      prepare: prepareLiveGamePayload,
    },

    invalidStarters: {
      reducer: buildActionHandler(invalidStartersHandler),
      prepare: invalidStartersPrepare,
    },

    captainsCompleted: {
      reducer: buildActionHandler(captainsCompletedHandler),
      prepare: prepareLiveGamePayload,
    },

    gameSetupCompleted: {
      reducer: buildActionHandler(setupCompletedHandler),

      prepare: (gameId: string, game: LiveGame) => {
        return {
          payload: {
            gameId,
            liveGame: game,
          },
        };
      },
    },

    selectStarter: {
      reducer: buildActionHandler(selectStarterHandler),
      prepare: selectStarterPrepare,
    },

    selectStarterPosition: {
      reducer: buildActionHandler(selectStarterPositionHandler),
      prepare: selectStarterPositionPrepare,
    },

    applyStarter: {
      reducer: buildActionHandler(applyStarterHandler),
      prepare: prepareLiveGamePayload,
    },

    cancelStarter: {
      reducer: buildActionHandler(cancelStarterHandler),
      prepare: prepareLiveGamePayload,
    },

    selectPlayer: {
      reducer: buildActionHandler(selectPlayerHandler),
      prepare: selectPlayerPrepare,
    },

    confirmSub: {
      reducer: buildActionHandler(confirmSubHandler),
      prepare: confirmSubPrepare,
    },

    cancelSub: {
      reducer: buildActionHandler(cancelSubHandler),
      prepare: prepareLiveGamePayload,
    },

    confirmSwap: {
      reducer: buildActionHandler(confirmSwapHandler),
      prepare: prepareLiveGamePayload,
    },

    cancelSwap: {
      reducer: buildActionHandler(cancelSwapHandler),
      prepare: prepareLiveGamePayload,
    },

    applyPendingSubs: {
      reducer: buildActionHandler(pendingSubsAppliedHandler),
      prepare: pendingSubsAppliedPrepare,
    },

    invalidPendingSubs: {
      reducer: buildActionHandler(invalidPendingSubsHandler),
      prepare: invalidPendingSubsPrepare,
    },

    discardPendingSubs: {
      reducer: buildActionHandler(discardPendingSubsHandler),
      prepare: discardPendingSubsPrepare,
    },

    markPlayerOut: {
      reducer: buildActionHandler(markPlayerOutHandler),
      prepare: prepareLiveGamePayload,
    },

    returnOutPlayer: {
      reducer: buildActionHandler(returnOutPlayerHandler),
      prepare: prepareLiveGamePayload,
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

      prepare: prepareLiveGamePayload,
    },

    // Clock-related actions
    configurePeriods: {
      reducer: buildActionHandler(configurePeriodsHandler),
      prepare: configurePeriodsPrepare,
    },

    startPeriod: {
      reducer: buildActionHandler(startPeriodHandler),
      prepare: startPeriodPrepare,
    },

    endPeriod: {
      reducer: buildActionHandler(endPeriodHandler),
      prepare: endPeriodPrepare,
    },

    toggleClock: {
      reducer: buildActionHandler(toggleHandler),
      prepare: prepareLiveGamePayload,
    },

    markPeriodOverdue: {
      reducer: buildActionHandler(markPeriodOverdueHandler),
      prepare: markPeriodOverduePrepare,
    },
  },
  extraReducers: (builder) => {
    builder.addCase(
      getGame.fulfilled,
      (state: LiveGameState, action: PayloadAction<GameDetail>) => {
        if (findGame(state, action.payload.id)) {
          // Game has already been initialized.
          return;
        }

        const game: LiveGame = LiveGameBuilder.create(action.payload);
        if (action.payload.status === GameStatus.New) {
          updateTasks(game);
        }

        setCurrentGame(state, game);
      }
    );
  },
});

export const { actions } = liveSlice;

// TODO: Figure out better solution
//   - These are used only by game-slice.ts and shift-slice.ts to avoid an error at runtime:
//     "ReferenceError: Cannot access 'actions' before initialization"
export const { applyPendingSubs, endPeriod, gameCompleted, gameSetupCompleted, startPeriod } =
  actions;

type ActionHandler<P extends LiveGamePayload> = (
  state: LiveState,
  game: LiveGame,
  action: PayloadAction<P>
) => void;

function buildActionHandler<P extends LiveGamePayload>(handler: ActionHandler<P>) {
  return (state: LiveState, action: PayloadAction<P>) => {
    return invokeActionHandler(state, action, handler);
  };
}

function invokeActionHandler<P extends LiveGamePayload>(
  state: LiveState,
  action: PayloadAction<P>,
  handler: ActionHandler<P>
) {
  const game = findGame(state, action.payload.gameId);
  if (!game) {
    return undefined;
  }
  return handler(state, game, action);
}

function findGame(state: LiveState, gameId: string) {
  if (!state.games || !(gameId in state.games)) {
    return undefined;
  }
  return state.games[gameId];
}

function setCurrentGame(state: LiveState, game: LiveGame) {
  if (!state.games) {
    state.games = {};
  }
  state.games[game.id] = game;
}
