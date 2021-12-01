/**
@license
*/

import { createSlice, PayloadAction, ThunkAction } from '@reduxjs/toolkit';
import { ActionCreator, AnyAction, Reducer } from 'redux';
import { LiveActionHydrate } from '../../actions/live.js';
import { FormationType, Position } from '../../models/formation.js';
import { Game, GameStatus, LiveGame, LivePlayer } from '../../models/game.js';
import { getPlayer, LiveGameBuilder } from '../../models/live.js';
import { PlayerStatus, Roster } from '../../models/player.js';
import { createReducer } from '../../reducers/createReducer.js';
import { gameStarted, selectCurrentGame } from '../../slices/game/game-slice.js';
import { RootState } from '../../store.js';
import { GET_GAME_SUCCESS } from '../game-types.js';
import { LIVE_HYDRATE } from '../live-types.js';
import { clock, ClockState } from './clock-slice.js';
export { toggle as toggleClock } from './clock-slice.js';
import { SetupStatus, SetupSteps, SetupTask } from '../../models/game.js';

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

export const selectLiveGameById = (state: RootState, gameId?: string) => {
  if (!state.live?.liveGame || (gameId && state.live.liveGame.id !== gameId)) {
    return;
  }
  return state.live.liveGame;
}
export const proposedSubSelector = (state: RootState) => state.live && state.live!.proposedSub;
export const clockSelector = (state: RootState) => state.live && state.live!.clock;

export const rosterCompleted: ActionCreator<ThunkAction<void, RootState, undefined, AnyAction>> = () => (dispatch, getState) => {
  const game = selectCurrentGame(getState());
  if (!game) {
    return;
  }
  dispatch(actions.completeRoster(game.roster));
};

export const live: Reducer<LiveState> = function (state, action) {
  const partialState = liveSlice.reducer(liveGame(state, action), action);
  // TODO: Use immer or combine reducers to avoid creating a new object on every call.
  const newState: LiveState = {
    ...partialState,
    clock: clock(state ? state.clock : undefined, action)
  }
  return hydrateReducer(newState, action);
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
          prepareSubIfPossible(state);
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

    applyPendingSubs: {
      reducer: (state, action: PayloadAction<{ selectedOnly?: boolean }>) => {
        const nextPlayers = findPlayersByStatus(state, PlayerStatus.Next, action.payload.selectedOnly);
        nextPlayers.forEach(player => {
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
      },

      prepare: (selectedOnly?: boolean) => {
        return {
          payload: {
            selectedOnly: !!selectedOnly
          }
        };
      }
    },

    discardPendingSubs: {
      reducer: (state, action: PayloadAction<{ selectedOnly?: boolean }>) => {
        const nextPlayers = findPlayersByStatus(state, PlayerStatus.Next, action.payload.selectedOnly);
        nextPlayers.forEach(player => {
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
  },

  extraReducers: (builder) => {
    builder.addCase(gameStarted, (state, action: PayloadAction<{ gameId: string }>) => {
      const game = state.liveGame!;
      if (game.id !== action.payload.gameId) {
        return;
      }
      if (game.status !== GameStatus.New) {
        return;
      }
      game.status = GameStatus.Start;
      delete game.setupTasks;
    })
  },
});

const { actions } = liveSlice;
export const {
  // TODO: Remove this export of completeRoster when no longer needed in reducers/game.ts
  completeRoster,
  formationSelected, getLiveGame, startersCompleted, captainsCompleted,
  selectStarter, selectStarterPosition, applyStarter, cancelStarter,
  selectPlayer, cancelSub, confirmSub, applyPendingSubs, discardPendingSubs
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

function prepareSubIfPossible(state: LiveState) {
  if (!state.selectedOffPlayer || !state.selectedOnPlayer) {
    // Need both an On and Off player selected to set up a sub
    return;
  }

  const offPlayer = findPlayer(state, state.selectedOffPlayer);
  if (!offPlayer) {
    return;
  }
  const onPlayer = findPlayer(state, state.selectedOnPlayer);
  if (!onPlayer) {
    return;
  }

  state.proposedSub = {
    ...offPlayer,
    currentPosition: {
      ...onPlayer.currentPosition!
    },
    replaces: onPlayer.id
  }
}

function clearProposedSub(state: LiveState) {
  delete state.selectedOffPlayer;
  delete state.selectedOnPlayer;
  delete state.proposedSub;
}

function findPlayer(state: LiveState, playerId: string) {
  return getPlayer(state.liveGame!, playerId);
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
      state.selectedOnPlayer = value;
      break;
    default:
      throw new Error(`Unsupported status: ${status}`);
  }
}
