import { createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Action, ActionCreator } from 'redux';
import { Game, GameDetail } from '../../models/game.js';
import { Player, Roster } from '../../models/player.js';
import { currentGameIdSelector } from '../../reducers/game.js';
import { RootState, ThunkResult } from '../../store.js';
import {
  ADD_GAME_PLAYER
} from '../game-types.js';
import { loadTeamRoster } from '../team/team-storage.js';
import { RosterCopiedPayload } from './game-action-types.js';
import { GameState } from './game-slice.js';
import { persistGamePlayer } from './game-storage.js';

interface GameActionAddPlayer extends Action<typeof ADD_GAME_PLAYER> { player: Player };

export const copyRoster = createAsyncThunk<
  // Return type of the payload creator.
  RosterCopiedPayload,
  // The gameId is the first argument to the payload creator.
  string,
  {
    // Optional fields for defining thunkApi field types
    state: RootState,
    // The game id is added to the meta for the pending action.
    pendingMeta: { gameId: string }
  }
>(
  'game/copyRoster',
  async (gameId, thunkAPI) => {
    // Gets the retrieved game. The game must exist as the copy can only be triggered when viewing
    // a loaded game.
    const state = thunkAPI.getState();
    let existingGame: Game | undefined;
    if (state.game?.game?.id === gameId) {
      existingGame = state.game.game!;
    } else {
      existingGame = state.game?.games[gameId];
    }
    if (!existingGame) {
      throw new Error(`No existing game found for id: ${gameId}`);
    }

    const game: GameDetail = existingGame as GameDetail;

    const rosterExists = (Object.keys(game.roster).length > 0);
    if (rosterExists) {
      return { gameId };
    }

    // Load team roster and save copy to storage
    const teamRoster = await loadTeamRoster(game.teamId);

    // TODO: Use batched writes? (Firestore transactions don't work offline)
    const roster: Roster = {};
    Object.keys(teamRoster).forEach((key) => {
      // Copies the team player to a new player object.
      const gamePlayer: Player = {
        ...teamRoster[key]
      };
      // Saves player to game roster storage, but keep the same id. This allows matching up player
      // from team roster across games.
      persistGamePlayer(gamePlayer, gameId, false);
      roster[gamePlayer.id] = gamePlayer;
    });

    return { gameId, gameRoster: roster };
  },
  {
    condition: (gameId) => {
      if (!gameId) {
        return false;
      }
      return true;
    },
    getPendingMeta: (base) => {
      return { gameId: base.arg };
    }
  }
);

export const rosterCopyPendingHandler = (state: GameState,
  action: ReturnType<typeof copyRoster.pending>) => {
  state.gameId = action.meta.gameId;
  state.rosterFailure = false;
  state.rosterLoading = true;
};

export const rosterCopiedHandler = (state: GameState, action: PayloadAction<RosterCopiedPayload>) => {
  // Set new roster, if required.
  if (action.payload.gameRoster && (Object.keys(state.game!.roster).length === 0)) {
    const gameRoster = action.payload.gameRoster!;
    const roster: Roster = {};
    Object.keys(gameRoster).forEach((key) => {
      const teamPlayer: Player = gameRoster[key];
      const player: Player = { ...teamPlayer };
      roster[player.id] = player;
    });
    state.game!.roster = roster;
    // TODO: Ensure games state has latest game detail
    // newState.games[action.game.id] = gameWithRoster;
  }

  state.rosterFailure = false;
  state.rosterLoading = false;
};

export const rosterCopyFailedHandler = (state: GameState,
  action: ReturnType<typeof copyRoster.rejected>) => {
  state.error = action.error.message || action.error.name;
  state.rosterFailure = true;
  state.rosterLoading = false;
};

export const addNewGamePlayer = (newPlayer: Player): ThunkResult => (dispatch, getState) => {
  if (!newPlayer) {
    return;
  }
  const state = getState();
  // Verify that the player id is unique.
  const gameState = state.game!;
  if (gameState.game && gameState.game.roster[newPlayer.id]) {
    return;
  }
  dispatch(saveGamePlayer(newPlayer));
};

export const saveGamePlayer = (newPlayer: Player): ThunkResult => (dispatch, getState) => {
  // Save the player to Firestore, before adding to the store.
  const gameId = currentGameIdSelector(getState())!;
  persistGamePlayer(newPlayer, gameId, true);
  dispatch(addGamePlayer(newPlayer));
};

export const addGamePlayer: ActionCreator<GameActionAddPlayer> = (player: Player) => {
  return {
    type: ADD_GAME_PLAYER,
    player
  };
};
