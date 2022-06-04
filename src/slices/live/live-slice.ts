/**
@license
*/

import { createNextState, createSlice, PayloadAction, ThunkAction } from '@reduxjs/toolkit';
import { ActionCreator, AnyAction, Reducer } from 'redux';
import { LiveActionHydrate } from '../../actions/live.js';
import { FormationType, Position } from '../../models/formation.js';
import { Game, GameStatus, LiveGame, LivePlayer, SetupStatus, SetupSteps, SetupTask } from '../../models/game.js';
import { gameCanStartPeriod, getPlayer, LiveGameBuilder, removePlayer } from '../../models/live.js';
import { PlayerStatus, Roster } from '../../models/player.js';
import { createReducer } from '../../reducers/createReducer.js';
import { selectCurrentGame } from '../../slices/game/game-slice.js';
import { RootState } from '../../store.js';
import { GET_GAME_SUCCESS } from '../game-types.js';
import { LIVE_HYDRATE } from '../live-types.js';
import { clock, ClockState, endPeriod, startPeriod, StartPeriodPayload } from './clock-slice.js';
import { shift, ShiftState } from './shift-slice.js';
export { endPeriod, toggle as toggleClock } from './clock-slice.js';
export { pendingSubsAppliedCreator } from './live-action-creators.js';

export interface LiveGameState {
  gameId: string;
  liveGame?: LiveGame;
  selectedStarterPlayer?: string;
  selectedStarterPosition?: Position;
  proposedStarter?: LivePlayer;
  selectedOffPlayer?: string;
  selectedOnPlayer?: string;
  selectedOnPlayer2?: string;
  proposedSub?: LivePlayer;
  proposedSwap?: LivePlayer;
}

export interface LiveState extends LiveGameState {
  hydrated?: boolean;
  clock?: ClockState;
  shift?: ShiftState;
}

export interface GameSetupCompletedPayload {
  gameId: string;
  liveGame: LiveGame;
}

export interface PendingSubsAppliedPayload {
  subs: LivePlayer[],
  selectedOnly?: boolean
}

const SWAP_ID_SUFFIX = '_swap';

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

export const selectLiveGameById = (state: RootState, gameId?: string) => {
  if (!state.live?.liveGame || (gameId && state.live.liveGame.id !== gameId)) {
    return;
  }
  return state.live.liveGame;
}
export const selectCurrentLiveGame = (state: RootState) => {
  return state.live?.liveGame;
}

export const proposedSubSelector = (state: RootState) => state.live && state.live!.proposedSub;
export const selectProposedSwap = (state: RootState) => state.live?.proposedSwap;
export const clockSelector = (state: RootState) => state.live && state.live!.clock;
export const selectCurrentShift = (state: RootState) => state.live?.shift;
export const selectPendingSubs = (state: RootState, selectedOnly?: boolean) => {
  if (!state.live) {
    return;
  }
  const nextPlayers = findPlayersByStatus(state.live, PlayerStatus.Next, selectedOnly);
  if (nextPlayers.some(player => {
    const replacedPlayer = findPlayer(state.live!, player.replaces!);
    return (!(replacedPlayer?.status === PlayerStatus.On));
  })) {
    return;
  }
  return nextPlayers;
}

export const rosterCompleted: ActionCreator<ThunkAction<void, RootState, undefined, AnyAction>> = () => (dispatch, getState) => {
  const game = selectCurrentGame(getState());
  if (!game) {
    return;
  }
  dispatch(actions.completeRoster(game.roster));
};

export const startGamePeriod: ActionCreator<ThunkAction<void, RootState, undefined, AnyAction>> = () => (dispatch, getState) => {
  const state = getState();
  const game = selectCurrentLiveGame(state);
  if (!game) {
    return;
  }
  const periodState = clockSelector(state);
  if (!periodState) {
    return;
  }
  dispatch(startPeriod(gameCanStartPeriod(game, periodState.currentPeriod, periodState.totalPeriods)));
};

export const live: Reducer<LiveState> = function (state, action) {
  // Use immer so that a new object is returned only when something actually changes.
  // This is important to avoid triggering unnecessary rendering cycles.
  // - The |state| might be undefined on app initialization. Immer will *not*
  //   create a draft for undefined, which causes an error for Object.assign().
  //   As a workaround, pass the |INITIAL_STATE|, even though it seems redundant with
  //   the inner reducers.
  return createNextState(state || INITIAL_STATE as LiveState, (draft) => {
    Object.assign(draft, liveGame(draft, action));
    Object.assign(draft, liveSlice.reducer(draft, action));
    draft!.clock = clock(draft?.clock, action);
    draft!.shift = shift(draft?.shift, action);
    Object.assign(draft, hydrateReducer(draft, action));
  }) as LiveState;
}

const hydrateReducer: Reducer<LiveState> = createReducer({} as LiveState, {
  [LIVE_HYDRATE]: (state, action: LiveActionHydrate) => {
    if (state.hydrated) {
      return;
    }
    state.hydrated = true;
    if (!action.gameId) {
      return;
    }
    if (!action.game) {
      return;
    }
    // TODO: This will overwrite a currently loaded game with different game id
    state.gameId = action.game.id;
    state.liveGame = action.game;
    if (action.clock) {
      state.clock = action.clock;
    }
    if (action.shift) {
      state.shift = action.shift;
    }
  },
});

const liveGame: Reducer<LiveGameState> = createReducer(INITIAL_STATE, {
  [GET_GAME_SUCCESS]: (state, action) => {
    if (state.liveGame && state.liveGame.id === action.game.id) {
      // Game has already been initialized.
      return;
    }

    const game: LiveGame = LiveGameBuilder.create(action.game);
    if (action.game.status === GameStatus.New) {
      updateTasks(game);
    }

    state.liveGame = game;
  },
});

type SelectPlayer = { playerId: string; selected: boolean };

const liveSlice = createSlice({
  name: 'live',
  initialState: INITIAL_STATE,
  reducers: {
    getLiveGame: (state, action: PayloadAction<Game>) => {
      const liveGame: LiveGame = LiveGameBuilder.create(action.payload);
      if (liveGame.status === GameStatus.New) {
        updateTasks(liveGame);
      }
      state.liveGame = liveGame;
    },

    completeRoster: (state, action: PayloadAction<Roster>) => {
      // Setup live players from roster
      const roster = action.payload;
      const players: LivePlayer[] = Object.keys(roster).map((playerId) => {
        const player = roster[playerId];
        return { ...player } as LivePlayer;
      });

      state.liveGame!.players = players;

      completeSetupStepForAction(state, SetupSteps.Roster);
    },

    formationSelected: {
      reducer: (state, action: PayloadAction<{ formationType: FormationType }>) => {
        if (!action.payload.formationType) {
          return;
        }
        const game = state.liveGame!;
        game.formation = { type: action.payload.formationType };

        completeSetupStepForAction(state, SetupSteps.Formation);
      },

      prepare: (formationType: FormationType) => {
        return {
          payload: {
            formationType
          }
        };
      }
    },

    startersCompleted: (state) => {
      completeSetupStepForAction(state, SetupSteps.Starters);
    },

    captainsCompleted: (state) => {
      completeSetupStepForAction(state, SetupSteps.Captains);
    },

    gameSetupCompleted: {
      reducer: (state, action: PayloadAction<GameSetupCompletedPayload>) => {
        const game = state.liveGame!;
        if (game.id !== action.payload.gameId) {
          return;
        }
        if (game.status !== GameStatus.New) {
          return;
        }
        game.status = GameStatus.Start;
        delete game.setupTasks;
      },

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
      reducer: (state, action: PayloadAction<SelectPlayer>) => {
        const playerId = action.payload.playerId;
        const selectedPlayer = findPlayer(state, playerId);
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

        prepareStarterIfPossible(state);
      },

      prepare: (playerId: string, selected: boolean) => {
        return {
          payload: {
            playerId,
            selected: !!selected
          }
        };
      }
    },

    selectStarterPosition: {
      reducer: (state, action: PayloadAction<{ position: Position }>) => {
        state.selectedStarterPosition = action.payload.position;

        prepareStarterIfPossible(state);
      },
      prepare: (position: Position) => {
        return {
          payload: {
            position
          }
        };
      }
    },

    applyStarter: (state) => {
      if (!state.proposedStarter) {
        return;
      }
      const starter = state.proposedStarter;
      const positionId = starter.currentPosition!.id;

      state.liveGame!.players!.forEach(player => {
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
    },

    cancelStarter: (state) => {
      if (!state.proposedStarter) {
        return;
      }
      const selectedPlayer = findPlayer(state, state.selectedStarterPlayer!);
      if (selectedPlayer && selectedPlayer.selected) {
        selectedPlayer.selected = false;
      }
      clearProposedStarter(state);
    },

    selectPlayer: {
      reducer: (state, action: PayloadAction<SelectPlayer>) => {
        const playerId = action.payload.playerId;
        const selectedPlayer = findPlayer(state, playerId);
        if (!selectedPlayer) {
          return;
        }

        // Always sets the selected flag to true/false as appropriate.
        selectedPlayer.selected = !!action.payload.selected;

        // Only On and Off statuses need further handling.
        if (selectedPlayer.status !== PlayerStatus.On &&
          selectedPlayer.status !== PlayerStatus.Off) {
          return;
        }

        const status = selectedPlayer.status;
        if (action.payload.selected) {
          setCurrentSelected(state, status, playerId);
          const madeSub = prepareSubIfPossible(state);
          if (!madeSub) {
            prepareSwapIfPossible(state);
          }
        } else {
          // De-selection.
          if (getCurrentSelected(state, status) === playerId) {
            setCurrentSelected(state, status, undefined);
          }
        }
      },

      prepare: (playerId: string, selected: boolean) => {
        return {
          payload: {
            playerId,
            selected: !!selected
          }
        };
      }
    },

    confirmSub: (state) => {
      const sub = state.proposedSub;
      if (!sub) {
        return;
      }

      state.liveGame!.players!.forEach(player => {
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

      clearProposedSub(state);
    },

    cancelSub: (state) => {
      if (!state.proposedSub) {
        return;
      }
      const cancelIds = [state.selectedOffPlayer!, state.selectedOnPlayer!];
      for (const playerId of cancelIds) {
        const selectedPlayer = findPlayer(state, playerId);
        if (selectedPlayer && selectedPlayer.selected) {
          selectedPlayer.selected = false;
        }
      }
      clearProposedSub(state);
    },

    confirmSwap: (state) => {
      const swap = state.proposedSwap;
      if (!swap) {
        return;
      }

      const swapIds = [state.selectedOnPlayer!, state.selectedOnPlayer2!];
      for (const playerId of swapIds) {
        const selectedPlayer = findPlayer(state, playerId);
        if (!!selectedPlayer?.selected) {
          selectedPlayer.selected = false;
        }
      }

      const nextSwap: LivePlayer = {
        ...swap,
        id: buildSwapPlayerId(swap.id),
        status: PlayerStatus.Next,
        selected: false
      }
      state.liveGame!.players!.push(nextSwap);

      clearProposedSwap(state);
    },

    cancelSwap: (state) => {
      if (!state.proposedSwap) {
        return;
      }
      const cancelIds = [state.selectedOnPlayer!, state.selectedOnPlayer2!];
      for (const playerId of cancelIds) {
        const selectedPlayer = findPlayer(state, playerId);
        if (!!selectedPlayer?.selected) {
          selectedPlayer.selected = false;
        }
      }
      clearProposedSwap(state);
    },

    applyPendingSubs: {
      reducer: (state, action: PayloadAction<PendingSubsAppliedPayload>) => {
        action.payload.subs.forEach(sub => {
          const player = findPlayer(state, sub.id);
          if (player?.status !== PlayerStatus.Next) {
            return;
          }
          const replacedPlayer = findPlayer(state, player.replaces!);
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

        // Apply any position swaps
        const nextPlayers = findPlayersByStatus(state, PlayerStatus.Next, action.payload.selectedOnly);
        nextPlayers.forEach(swapPlayer => {
          if (!swapPlayer.isSwap) {
            return;
          }
          const actualPlayerId = extractIdFromSwapPlayerId(swapPlayer.id);
          const player = findPlayer(state, actualPlayerId);
          if (player?.status !== PlayerStatus.On) {
            return;
          }

          player.currentPosition = { ...swapPlayer.nextPosition! };
          player.selected = false;

          deletePlayer(state, swapPlayer.id);
        });
      },

      prepare: (subs: LivePlayer[], selectedOnly?: boolean) => {
        return {
          payload: {
            subs,
            selectedOnly: !!selectedOnly
          }
        };
      }
    },

    discardPendingSubs: {
      reducer: (state, action: PayloadAction<{ selectedOnly?: boolean }>) => {
        const nextPlayers = findPlayersByStatus(state, PlayerStatus.Next, action.payload.selectedOnly);
        nextPlayers.forEach(player => {
          if (player.isSwap) {
            deletePlayer(state, player.id);
            return;
          }

          player.status = PlayerStatus.Off;
          player.replaces = undefined;
          player.currentPosition = undefined;
          player.selected = false;
        });
      },
      prepare: (selectedOnly?: boolean) => {
        return {
          payload: {
            selectedOnly: !!selectedOnly
          }
        };
      }
    },

    gameCompleted: {
      reducer: (state, action: PayloadAction<{ gameId: string }>) => {
        const game = state.liveGame!;
        if (game.id !== action.payload.gameId) {
          return;
        }
        if (game.status !== GameStatus.Done) {
          return;
        }
        // TODO: Aggregate/persist data as necessary
        game.dataCaptured = true;
      },

      prepare: (gameId: string) => {
        return {
          payload: {
            gameId
          }
        };
      }
    },
  },

  extraReducers: (builder) => {
    builder.addCase(startPeriod, (state, action: PayloadAction<StartPeriodPayload>) => {
      if (!action.payload.gameAllowsStart) {
        return;
      }
      // TODO: validate game matches?
      const game = state.liveGame!;
      game.status = GameStatus.Live;
    }).addCase(endPeriod, (state: LiveState) => {
      // TODO: validate game matches?
      const game = state.liveGame!;
      if (game.status !== GameStatus.Live) {
        return;
      }
      if (state.clock?.currentPeriod === state.clock?.totalPeriods) {
        game.status = GameStatus.Done;
      } else {
        game.status = GameStatus.Break;
      }
    });
  },
});

const { actions } = liveSlice;
export const {
  // TODO: Remove this export of completeRoster when no longer needed in reducers/game.ts
  completeRoster,
  formationSelected, getLiveGame, startersCompleted, captainsCompleted, gameSetupCompleted,
  selectStarter, selectStarterPosition, applyStarter, cancelStarter,
  selectPlayer, cancelSub, confirmSub, cancelSwap, confirmSwap, applyPendingSubs, discardPendingSubs, gameCompleted
} = actions;

function completeSetupStepForAction(state: LiveGameState, setupStepToComplete: SetupSteps) {
  const game = state.liveGame!;

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

function prepareStarterIfPossible(state: LiveState) {
  if (!state.selectedStarterPlayer || !state.selectedStarterPosition) {
    // Need both a position and player selected to setup a starter
    return;
  }

  const player = findPlayer(state, state.selectedStarterPlayer);
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

function prepareSubIfPossible(state: LiveState): boolean {
  if (!state.selectedOffPlayer || !state.selectedOnPlayer) {
    // Need both an On and Off player selected to set up a sub
    return false;
  }

  const offPlayer = findPlayer(state, state.selectedOffPlayer);
  if (!offPlayer) {
    return false;
  }
  const onPlayer = findPlayer(state, state.selectedOnPlayer);
  if (!onPlayer) {
    return false;
  }

  state.proposedSub = {
    ...offPlayer,
    currentPosition: {
      ...onPlayer.currentPosition!
    },
    replaces: onPlayer.id
  }
  return true;
}

function clearProposedSub(state: LiveState) {
  delete state.selectedOffPlayer;
  delete state.selectedOnPlayer;
  delete state.proposedSub;
}

function prepareSwapIfPossible(state: LiveState) {
  if (!state.selectedOnPlayer || !state.selectedOnPlayer2) {
    // Need two On players selected to set up a swap.
    return;
  }

  const onPlayer = findPlayer(state, state.selectedOnPlayer);
  if (!onPlayer) {
    return;
  }
  const positionPlayer = findPlayer(state, state.selectedOnPlayer2);
  if (!positionPlayer) {
    return;
  }

  const swap: LivePlayer = {
    ...onPlayer,
    nextPosition: {
      ...positionPlayer.currentPosition!
    },
    isSwap: true
  }
  state.proposedSwap = swap;
}

function clearProposedSwap(state: LiveState) {
  state.selectedOnPlayer = undefined;
  state.selectedOnPlayer2 = undefined;
  state.proposedSwap = undefined;
}

function findPlayer(state: LiveState, playerId: string) {
  return getPlayer(state.liveGame!, playerId);
}

function deletePlayer(state: LiveState, playerId: string) {
  return removePlayer(state.liveGame!, playerId);
}

function buildSwapPlayerId(playerId: string) {
  return playerId + SWAP_ID_SUFFIX;
}

function extractIdFromSwapPlayerId(swapPlayerId: string) {
  if (!swapPlayerId.endsWith(SWAP_ID_SUFFIX)) {
    return swapPlayerId;
  }
  return swapPlayerId.slice(0, swapPlayerId.length - SWAP_ID_SUFFIX.length);
}

function findPlayersByStatus(state: LiveState, status: PlayerStatus, selectedOnly?: boolean) {
  let matches: LivePlayer[] = [];
  state.liveGame!.players!.forEach(player => {
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

function getCurrentSelected(state: LiveState, status: PlayerStatus) {
  switch (status) {
    case PlayerStatus.Off:
      return state.selectedOffPlayer;
    case PlayerStatus.On:
      return state.selectedOnPlayer;
  }
  throw new Error(`Unsupported status: ${status}`);
}

function setCurrentSelected(state: LiveState, status: PlayerStatus, value: string | undefined) {
  switch (status) {
    case PlayerStatus.Off:
      state.selectedOffPlayer = value;
      break;
    case PlayerStatus.On:
      if (value && state.selectedOnPlayer) {
        // Second On player selected.
        state.selectedOnPlayer2 = value;
      } else {
        // Otherwise, this is either the first On player to be selected, or is
        // de-selecting. When de-selecting, there should only ever by one On
        // player selected,
        state.selectedOnPlayer = value;
      }
      break;
    default:
      throw new Error(`Unsupported status: ${status}`);
  }
}
