/**
@license
*/

import { createNextState, createSlice, PayloadAction, ThunkAction } from '@reduxjs/toolkit';
import { ActionCreator, AnyAction, Reducer } from 'redux';
import { LiveActionHydrate } from '../../actions/live.js';
import { FormationType, Position } from '../../models/formation.js';
import { Game, GameStatus, SetupStatus, SetupSteps, SetupTask } from '../../models/game.js';
import { gameCanStartPeriod, getPlayer, LiveGame, LiveGameBuilder, LiveGames, LivePlayer, removePlayer } from '../../models/live.js';
import { PlayerStatus, Roster } from '../../models/player.js';
import { createReducer } from '../../reducers/createReducer.js';
import { selectCurrentGame } from '../../slices/game/game-slice.js';
import { RootState } from '../../store.js';
import { GET_GAME_SUCCESS } from '../game-types.js';
import { LIVE_HYDRATE } from '../live-types.js';
import { configurePeriodsHandler, configurePeriodsPrepare, endPeriodHandler, startPeriodHandler, startPeriodPrepare, toggleHandler } from './clock-reducer-logic.js';
import { buildSwapPlayerId, ConfigurePeriodsPayload, extractIdFromSwapPlayerId, GameSetupCompletedPayload, LiveGamePayload, PendingSubsAppliedPayload, PendingSubsInvalidPayload, prepareLiveGamePayload, StartPeriodPayload } from './live-action-types.js';
import { shift, ShiftState } from './shift-slice.js';
export { pendingSubsAppliedCreator } from './live-action-creators.js';

export interface LiveGameState {
  gameId: string;
  games?: LiveGames;
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
  shift?: ShiftState;
}

const INITIAL_STATE: LiveGameState = {
  gameId: '',
  games: {},
  selectedStarterPlayer: undefined,
  selectedStarterPosition: undefined,
  proposedStarter: undefined,
  selectedOffPlayer: undefined,
  selectedOnPlayer: undefined,
  proposedSub: undefined,
};

export const selectLiveGameById = (state: RootState, gameId: string) => {
  if (!state.live || !gameId) {
    return;
  }
  return findGame(state.live, gameId);
}
export const selectCurrentLiveGame = (state: RootState) => {
  if (!state.live) {
    return;
  }
  return findCurrentGame(state.live);
}

export const proposedSubSelector = (state: RootState) => state.live && state.live!.proposedSub;
export const selectProposedSwap = (state: RootState) => state.live?.proposedSwap;
export const selectCurrentShift = (state: RootState) => state.live?.shift;
export const selectPendingSubs = (state: RootState, selectedOnly?: boolean, includeSwaps?: boolean) => {
  const game = selectCurrentLiveGame(state);
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
    Object.assign(draft, liveGame(draft, action));
    Object.assign(draft, liveSlice.reducer(draft, action));
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
    if (!action.games) {
      return;
    }
    // TODO: This will overwrite a currently loaded game with different game id
    state.gameId = action.gameId;
    if (!state.games) {
      state.games = action.games;
    } else {
      for (const id in action.games) {
        state.games[id] = action.games[id];
      }
    }
    if (action.shift) {
      state.shift = action.shift;
    }
  },
});

const liveGame: Reducer<LiveGameState> = createReducer(INITIAL_STATE, {
  [GET_GAME_SUCCESS]: (state, action) => {
    if (findGame(state, action.game.id)) {
      // Game has already been initialized.
      return;
    }

    const game: LiveGame = LiveGameBuilder.create(action.game);
    if (action.game.status === GameStatus.New) {
      updateTasks(game);
    }

    setCurrentGame(state, game);
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
      setCurrentGame(state, liveGame);
    },

    completeRoster: (state, action: PayloadAction<Roster>) => {
      // Setup live players from roster
      const roster = action.payload;
      const players: LivePlayer[] = Object.keys(roster).map((playerId) => {
        const player = roster[playerId];
        return { ...player } as LivePlayer;
      });

      const liveGame = findCurrentGame(state);
      liveGame!.players = players;

      completeSetupStepForAction(state, SetupSteps.Roster);
    },

    formationSelected: {
      reducer: (state, action: PayloadAction<{ formationType: FormationType }>) => {
        if (!action.payload.formationType) {
          return;
        }
        const game = findCurrentGame(state)!;
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
        const game = findGame(state, action.payload.gameId);
        if (!game) {
          return;
        }
        if (game.status !== GameStatus.New) {
          return;
        }
        game.status = GameStatus.Start;
        if (!game.clock) {
          game.clock = LiveGameBuilder.createClock();
        }
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
        const game = findCurrentGame(state)!;
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

      const game = findCurrentGame(state)!;
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
    },

    cancelStarter: (state) => {
      if (!state.proposedStarter) {
        return;
      }
      const game = findCurrentGame(state)!;
      const selectedPlayer = getPlayer(game, state.selectedStarterPlayer!);
      if (selectedPlayer && selectedPlayer.selected) {
        selectedPlayer.selected = false;
      }
      clearProposedStarter(state);
    },

    selectPlayer: {
      reducer: (state, action: PayloadAction<SelectPlayer>) => {
        const game = findCurrentGame(state)!;
        const playerId = action.payload.playerId;
        const selectedPlayer = getPlayer(game, playerId);
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

    confirmSub: {
      reducer: (state, action: PayloadAction<{ newPosition?: Position }>) => {
        const sub = state.proposedSub;
        if (!sub) {
          return;
        }

        const game = findCurrentGame(state)!;
        game.players!.forEach(player => {
          if (player.id === sub.id) {
            player.selected = false;
            player.status = PlayerStatus.Next;
            player.currentPosition = action.payload.newPosition || sub.currentPosition;
            player.replaces = sub.replaces;
            return;
          }
          if (player.id === sub.replaces) {
            player.selected = false;
          }
        });

        clearProposedSub(state);
      },

      prepare: (newPosition?: Position) => {
        return {
          payload: {
            newPosition
          }
        };
      }
    },

    cancelSub: (state) => {
      if (!state.proposedSub) {
        return;
      }
      const game = findCurrentGame(state)!;
      const cancelIds = [state.selectedOffPlayer!, state.selectedOnPlayer!];
      for (const playerId of cancelIds) {
        const selectedPlayer = getPlayer(game, playerId);
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

      const game = findCurrentGame(state)!;
      const swapIds = [state.selectedOnPlayer!, state.selectedOnPlayer2!];
      for (const playerId of swapIds) {
        const selectedPlayer = getPlayer(game, playerId);
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
      game.players!.push(nextSwap);

      clearProposedSwap(state);
    },

    cancelSwap: (state) => {
      if (!state.proposedSwap) {
        return;
      }
      const game = findCurrentGame(state)!;
      const cancelIds = [state.selectedOnPlayer!, state.selectedOnPlayer2!];
      for (const playerId of cancelIds) {
        const selectedPlayer = getPlayer(game, playerId);
        if (!!selectedPlayer?.selected) {
          selectedPlayer.selected = false;
        }
      }
      clearProposedSwap(state);
    },

    applyPendingSubs: {
      reducer: (state, action: PayloadAction<PendingSubsAppliedPayload>) => {
        const game = findGame(state, action.payload.gameId);
        if (!game) {
          return;
        }
        action.payload.subs.forEach(sub => {
          const player = getPlayer(game, sub.id);
          if (!player || player.isSwap || player.status !== PlayerStatus.Next) {
            return;
          }
          const replacedPlayer = getPlayer(game, player.replaces!);
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
        const nextPlayers = findPlayersByStatus(game, PlayerStatus.Next,
          action.payload.selectedOnly, /* includeSwaps */ true);
        nextPlayers.forEach(swapPlayer => {
          if (!swapPlayer.isSwap) {
            return;
          }
          const actualPlayerId = extractIdFromSwapPlayerId(swapPlayer.id);
          const player = getPlayer(game, actualPlayerId);
          if (player?.status !== PlayerStatus.On) {
            return;
          }

          player.currentPosition = { ...swapPlayer.nextPosition! };
          player.selected = false;

          removePlayer(game, swapPlayer.id);
        });
      },

      prepare: (gameId: string, subs: LivePlayer[], selectedOnly?: boolean) => {
        return {
          payload: {
            gameId,
            subs,
            selectedOnly: !!selectedOnly
          }
        };
      }
    },

    invalidPendingSubs: {
      reducer: (_state, _action: PayloadAction<PendingSubsInvalidPayload>) => {
        /*
        const game = findCurrentGame(state)!;
        action.payload.subs.forEach(sub => {
          const player = getPlayer(game, sub.id);
          if (player?.status !== PlayerStatus.Next) {
            return;
          }
          const replacedPlayer = getPlayer(game, player.replaces!);
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

        });*/
      },

      prepare: (gameId: string, invalidSubs: string[]) => {
        return {
          payload: {
            gameId,
            invalidSubs,
          }
        };
      }
    },

    discardPendingSubs: {
      reducer: (state, action: PayloadAction<{ selectedOnly?: boolean }>) => {
        const game = findCurrentGame(state)!;
        const nextPlayers = findPlayersByStatus(game, PlayerStatus.Next,
          action.payload.selectedOnly, /* includeSwaps */ true);
        nextPlayers.forEach(player => {
          if (player.isSwap) {
            removePlayer(game, player.id);
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

      prepare: (gameId: string) => {
        return {
          payload: {
            gameId
          }
        };
      }
    },

    // Clock-related actions
    configurePeriods: {
      reducer: (state, action: PayloadAction<ConfigurePeriodsPayload>) => {
        const game = findGame(state, action.payload.gameId);
        if (!game) {
          return;
        }
        return configurePeriodsHandler(game, action);
      },
      prepare: configurePeriodsPrepare
    },

    startPeriod: {
      reducer: (state, action: PayloadAction<StartPeriodPayload>) => {
        if (!action.payload.gameAllowsStart) {
          return;
        }
        const game = findGame(state, action.payload.gameId);
        if (!game) {
          return;
        }
        return startPeriodHandler(game, action);
      },
      prepare: startPeriodPrepare
    },

    endPeriod: {
      reducer: (state, action: PayloadAction<LiveGamePayload>) => {
        const game = findGame(state, action.payload.gameId);
        if (!game) {
          return;
        }
        return endPeriodHandler(game);
      },
      prepare: prepareLiveGamePayload
    },

    toggleClock: {
      reducer: (state, action: PayloadAction<LiveGamePayload>) => {
        const game = findGame(state, action.payload.gameId);
        if (!game) {
          return;
        }
        return toggleHandler(game);
      },
      prepare: prepareLiveGamePayload
    },
  },
});

const { actions } = liveSlice;
export const {
  // TODO: Remove this export of completeRoster when no longer needed in reducers/game.ts
  completeRoster,
  formationSelected, getLiveGame, startersCompleted, captainsCompleted, gameSetupCompleted,
  selectStarter, selectStarterPosition, applyStarter, cancelStarter,
  // Clock-related actions
  configurePeriods, startPeriod, endPeriod, toggleClock,
  // Sub-related actions
  selectPlayer, cancelSub, confirmSub, cancelSwap, confirmSwap, applyPendingSubs, invalidPendingSubs, discardPendingSubs, gameCompleted
} = actions;

function completeSetupStepForAction(state: LiveGameState, setupStepToComplete: SetupSteps) {
  const game = findCurrentGame(state)!;

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
  const game = findCurrentGame(state)!;
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

function prepareSubIfPossible(state: LiveState): boolean {
  if (!state.selectedOffPlayer || !state.selectedOnPlayer) {
    // Need both an On and Off player selected to set up a sub
    return false;
  }

  const game = findCurrentGame(state)!;
  const offPlayer = getPlayer(game, state.selectedOffPlayer);
  if (!offPlayer) {
    return false;
  }
  const onPlayer = getPlayer(game, state.selectedOnPlayer);
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

  const game = findCurrentGame(state)!;
  const onPlayer = getPlayer(game, state.selectedOnPlayer);
  if (!onPlayer) {
    return;
  }
  const positionPlayer = getPlayer(game, state.selectedOnPlayer2);
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

function findCurrentGame(state: LiveState) {
  return findGame(state, state.gameId);
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
  state.gameId = game.id;
  state.games[game.id] = game;
}

function findPlayersByStatus(game: LiveGame, status: PlayerStatus,
  selectedOnly?: boolean, includeSwaps?: boolean) {
  let matches: LivePlayer[] = [];
  game.players!.forEach(player => {
    if (player.status !== status) {
      return;
    }
    if (selectedOnly && !player.selected) {
      return;
    }
    if (!includeSwaps && player.isSwap) {
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
