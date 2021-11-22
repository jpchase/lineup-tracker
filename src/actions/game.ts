/**
@license
*/

import { Action, ActionCreator } from 'redux';
import { ThunkAction } from 'redux-thunk';
import { FormationType } from '../models/formation';
import { Game, GameDetail, Games, GameStatus } from '../models/game';
import { Player, Roster } from '../models/player';
import { currentGameIdSelector, currentGameSelector } from '../reducers/game';
import {
  ADD_GAME_PLAYER, CAPTAINS_DONE, COPY_ROSTER_FAIL, COPY_ROSTER_REQUEST,
  COPY_ROSTER_SUCCESS, GAME_HYDRATE, GET_GAME_FAIL, GET_GAME_REQUEST,
  GET_GAME_SUCCESS, ROSTER_DONE, SET_FORMATION, STARTERS_DONE, START_GAME
} from '../slices/game-types';
import { loadGame, loadGameRoster, persistGamePlayer, updateExistingGame } from '../slices/game/game-storage.js';
import { loadTeamRoster } from '../slices/team/team-storage.js';
import { RootState } from '../store.js';

export interface GameActionHydrate extends Action<typeof GAME_HYDRATE> { gameId?: string, games: Games };
export interface GameActionGetGameRequest extends Action<typeof GET_GAME_REQUEST> { gameId: string };
export interface GameActionGetGameSuccess extends Action<typeof GET_GAME_SUCCESS> { game: GameDetail };
export interface GameActionGetGameFail extends Action<typeof GET_GAME_FAIL> { error: string };
export interface GameActionCopyRosterRequest extends Action<typeof COPY_ROSTER_REQUEST> { gameId: string };
export interface GameActionCopyRosterSuccess extends Action<typeof COPY_ROSTER_SUCCESS> { gameId: string, gameRoster?: Roster };
export interface GameActionCopyRosterFail extends Action<typeof COPY_ROSTER_FAIL> { error: string };
export interface GameActionCaptainsDone extends Action<typeof CAPTAINS_DONE> { };
export interface GameActionAddPlayer extends Action<typeof ADD_GAME_PLAYER> { player: Player };
export interface GameActionRosterDone extends Action<typeof ROSTER_DONE> { roster: Roster };
export interface GameActionStartersDone extends Action<typeof STARTERS_DONE> { };
export interface GameActionSetFormation extends Action<typeof SET_FORMATION> { formationType: FormationType };
export interface GameActionStartGame extends Action<typeof START_GAME> { };
export type GameAction = GameActionHydrate | GameActionGetGameRequest | GameActionGetGameSuccess |
  GameActionGetGameFail | GameActionCaptainsDone | GameActionRosterDone |
  GameActionStartersDone | GameActionSetFormation | GameActionStartGame |
  GameActionAddPlayer | GameActionCopyRosterRequest |
  GameActionCopyRosterSuccess | GameActionCopyRosterFail;

type ThunkResult = ThunkAction<void, RootState, undefined, GameAction>;
type ThunkPromise<R> = ThunkAction<Promise<R>, RootState, undefined, GameAction>;

export const hydrateGame: ActionCreator<GameActionHydrate> = (games: Games, gameId?: string) => {
  return {
    type: GAME_HYDRATE,
    gameId,
    games
  }
};

export const getGame: ActionCreator<ThunkPromise<void>> = (gameId: string) => (dispatch, getState) => {
  if (!gameId) {
    return Promise.reject();
  }
  dispatch(getGameRequest(gameId));

  // TODO: Check for game cached in IDB (similar to getTeams action)
  // Checks if the game has already been retrieved.
  const state = getState();
  let existingGame: Game | undefined;
  if (state.game && state.game.game && state.game.game.id === gameId) {
    existingGame = state.game.game!;
  } else {
    existingGame = state.game?.games[gameId];
  }
  if (existingGame && existingGame.hasDetail) {
    dispatch(getGameSuccess(existingGame));
    // let the calling code know there's nothing to wait for.
    return Promise.resolve();
  }

  let game: Game;
  return loadGame(gameId)
    .then((result) => {
      game = result;
      return loadGameRoster(gameId);
    })
    .then((gameRoster: Roster) => {
      const gameDetail: GameDetail = {
        ...game,
        roster: gameRoster
      };
      dispatch(getGameSuccess(gameDetail));
    })
    .catch((error: any) => {
      dispatch(getGameFail(error.toString()));
    });
}

const getGameRequest: ActionCreator<GameActionGetGameRequest> = (gameId: string) => {
  return {
    type: GET_GAME_REQUEST,
    gameId
  };
};

const getGameSuccess: ActionCreator<GameActionGetGameSuccess> = (game: GameDetail) => {
  return {
    type: GET_GAME_SUCCESS,
    game
  };
};

const getGameFail: ActionCreator<GameActionGetGameFail> = (error: string) => {
  return {
    type: GET_GAME_FAIL,
    error
  };
};

export const copyRoster: ActionCreator<ThunkPromise<void>> = (gameId: string) => (dispatch, getState) => {
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

export const markCaptainsDone: ActionCreator<ThunkResult> = () => (dispatch) => {
  dispatch({
    type: CAPTAINS_DONE
  });
};

export const addNewGamePlayer: ActionCreator<ThunkResult> = (newPlayer: Player) => (dispatch, getState) => {
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

export const saveGamePlayer: ActionCreator<ThunkResult> = (newPlayer: Player) => (dispatch, getState) => {
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

export const markRosterDone: ActionCreator<ThunkResult> = () => (dispatch, getState) => {
  const game = currentGameSelector(getState());
  if (!game) {
    return;
  }
  dispatch({
    type: ROSTER_DONE,
    roster: game.roster
  });
};

export const markStartersDone: ActionCreator<ThunkResult> = () => (dispatch) => {
  dispatch({
    type: STARTERS_DONE
  });
};

export const setFormation: ActionCreator<ThunkResult> = (formationType: FormationType) => (dispatch) => {
  if (!formationType) {
    return;
  }
  dispatch({
    type: SET_FORMATION,
    formationType
  });
};

export const startGame: ActionCreator<ThunkResult> = () => (dispatch, getState) => {
  // TODO: Figure out how save game to Firestore, *after* status is updated by reducer,
  //       so don't have to duplicate logic.
  const gameId = currentGameIdSelector(getState())!;
  updateExistingGame(gameId, {
    status: GameStatus.Start
  });
  dispatch({
    type: START_GAME
  });
};
