/** @format */

import { createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Player, Roster } from '../../models/player.js';
import { RootState, ThunkPromise, ThunkResult } from '../../store.js';
import { loadTeamRoster } from '../team/team-storage.js';
import { PlayerAddedPayload, RosterCopiedPayload } from './game-action-types.js';
import { findGame, actions, GameState, selectGameById } from './game-slice.js';
import { persistGamePlayer } from './game-storage.js';

export const copyRoster = createAsyncThunk<
  // Return type of the payload creator.
  RosterCopiedPayload,
  // The gameId is the first argument to the payload creator.
  string,
  {
    // Optional fields for defining thunkApi field types
    state: RootState;
    // The game id is added to the meta for the pending action.
    pendingMeta: { gameId: string };
  }
>(
  'game/copyRoster',
  async (gameId, thunkAPI) => {
    // Gets the retrieved game. The game must exist as the copy can only be triggered when viewing
    // a loaded game.
    const state = thunkAPI.getState();
    const game = selectGameById(state, gameId);
    if (!game) {
      throw new Error(`No existing game found for id: ${gameId}`);
    }

    const rosterExists = Object.keys(game.roster).length > 0;
    if (rosterExists) {
      return { gameId };
    }

    // Load team roster and save copy to storage
    const teamRoster = await loadTeamRoster(game.teamId);

    // TODO: Use batched writes? (Firestore transactions don't work offline)
    const roster: Roster = {};
    await Promise.all(
      Object.keys(teamRoster).map((key) => {
        // Copies the team player to a new player object.
        const gamePlayer: Player = {
          ...teamRoster[key],
        };
        // Saves player to game roster storage, but keep the same id. This allows matching up player
        // from team roster across games.
        return persistGamePlayer(gamePlayer, gameId, false).then(() => {
          roster[gamePlayer.id] = gamePlayer;
        });
      }),
    );

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
    },
  },
);

export const rosterCopyPendingHandler = (
  state: GameState,
  _action: ReturnType<typeof copyRoster.pending>,
) => {
  state.rosterFailure = false;
  state.rosterLoading = true;
};

export const rosterCopiedHandler = (
  state: GameState,
  action: PayloadAction<RosterCopiedPayload>,
) => {
  // Set new roster, if required.
  const game = findGame(state, action.payload.gameId);
  if (action.payload.gameRoster && Object.keys(game.roster).length === 0) {
    const gameRoster = action.payload.gameRoster;
    const roster: Roster = {};
    Object.keys(gameRoster).forEach((key) => {
      const teamPlayer: Player = gameRoster[key];
      const player: Player = { ...teamPlayer };
      roster[player.id] = player;
    });
    game.hasDetail = true;
    game.roster = roster;
  }

  state.rosterFailure = false;
  state.rosterLoading = false;
};

export const rosterCopyFailedHandler = (
  state: GameState,
  action: ReturnType<typeof copyRoster.rejected>,
) => {
  state.error = action.error.message || action.error.name;
  state.rosterFailure = true;
  state.rosterLoading = false;
};

export const addNewGamePlayer =
  (gameId: string, newPlayer: Player): ThunkResult =>
  (dispatch, getState) => {
    if (!newPlayer) {
      return;
    }
    // Verify that the player id is unique.
    const game = selectGameById(getState(), gameId);
    if (game?.roster[newPlayer.id]) {
      return;
    }
    dispatch(saveGamePlayer(gameId, newPlayer));
  };

export const saveGamePlayer =
  (gameId: string, newPlayer: Player): ThunkPromise<void> =>
  async (dispatch) => {
    // Save the player to Firestore, before adding to the store.
    await persistGamePlayer(newPlayer, gameId, true);
    dispatch(actions.gamePlayerAdded(gameId, newPlayer));
  };

export const gamePlayerAddedHandler = (
  state: GameState,
  action: PayloadAction<PlayerAddedPayload>,
) => {
  const game = findGame(state, action.payload.gameId);
  game.roster[action.payload.player.id] = action.payload.player;
};

export const gamePlayerAddedPrepare = (gameId: string, player: Player) => {
  return {
    payload: {
      gameId,
      player,
    },
  };
};
