import { Action, ActionCreator } from 'redux';
import { Game, GameDetail } from '../../models/game.js';
import { Player, Roster } from '../../models/player.js';
import { currentGameIdSelector } from '../../reducers/game.js';
import {
  ADD_GAME_PLAYER, COPY_ROSTER_FAIL, COPY_ROSTER_REQUEST,
  COPY_ROSTER_SUCCESS
} from '../game-types.js';
import { persistGamePlayer } from './game-storage.js';
import { loadTeamRoster } from '../team/team-storage.js';
import { ThunkPromise, ThunkResult } from '../../store.js';

interface GameActionCopyRosterRequest extends Action<typeof COPY_ROSTER_REQUEST> { gameId: string };
interface GameActionCopyRosterSuccess extends Action<typeof COPY_ROSTER_SUCCESS> { gameId: string, gameRoster?: Roster };
interface GameActionCopyRosterFail extends Action<typeof COPY_ROSTER_FAIL> { error: string };
interface GameActionAddPlayer extends Action<typeof ADD_GAME_PLAYER> { player: Player };

export const copyRoster = (gameId: string): ThunkPromise<void> => (dispatch, getState) => {
  if (!gameId) {
    return Promise.reject('gameId is missing');
  }

  // Gets the retrieved game. The game must exist as the copy can only be triggered when viewing
  // a loaded game.
  const state = getState();
  let existingGame: Game | undefined;
  if (state.game && state.game.game && state.game.game.id === gameId) {
    existingGame = state.game.game!;
  } else {
    existingGame = state.game?.games[gameId];
  }
  if (!existingGame) {
    return Promise.reject(`No existing game found for id: ${gameId}`);
  }

  dispatch(copyRosterRequest(gameId));

  const game: GameDetail = existingGame as GameDetail;

  const rosterExists = (Object.keys(game.roster).length > 0);
  if (rosterExists) {
    dispatch(copyRosterSuccess(gameId));
    return Promise.resolve();
  }

  // Load team roster and save copy to storage
  return loadTeamRoster(game.teamId)
    .then((teamRoster: Roster) => {
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
      dispatch(copyRosterSuccess(gameId, roster));
    })
    .catch((error: any) => {
      dispatch(copyRosterFail(error.toString()));
    });
}

const copyRosterRequest: ActionCreator<GameActionCopyRosterRequest> = (gameId: string) => {
  return {
    type: COPY_ROSTER_REQUEST,
    gameId
  };
};

const copyRosterSuccess: ActionCreator<GameActionCopyRosterSuccess> = (gameId: string, gameRoster?: Roster) => {
  return {
    type: COPY_ROSTER_SUCCESS,
    gameId,
    gameRoster
  };
};

const copyRosterFail: ActionCreator<GameActionCopyRosterFail> = (error: string) => {
  return {
    type: COPY_ROSTER_FAIL,
    error
  };
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
