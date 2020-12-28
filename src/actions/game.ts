/**
@license
*/

import { Action, ActionCreator } from 'redux';
import { ThunkAction } from 'redux-thunk';
import { RootState } from '../store';
import { FormationType } from '../models/formation';
import { Game, GameDetail, Games, GameStatus } from '../models/game';
import { Player, Roster } from '../models/player';
import { currentGameIdSelector, currentGameSelector } from '../reducers/game';
import { firebaseRef } from '../firebase';
import { extractGame, loadGameRoster, loadTeamRoster, savePlayerToGameRoster, KEY_GAMES } from '../firestore-helpers';
import { CollectionReference, DocumentReference, DocumentSnapshot } from '@firebase/firestore-types';

import {
  GAME_HYDRATE,
  GET_GAME_REQUEST,
  GET_GAME_SUCCESS,
  GET_GAME_FAIL,
  CAPTAINS_DONE,
  COPY_ROSTER_REQUEST,
  COPY_ROSTER_SUCCESS,
  COPY_ROSTER_FAIL,
  ADD_GAME_PLAYER,
  ROSTER_DONE,
  STARTERS_DONE,
  SET_FORMATION,
  START_GAME
} from '../slices/game-types';

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

function getGamesCollection(): CollectionReference {
  return firebaseRef.firestore().collection(KEY_GAMES);
}

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
    existingGame = state.games && state.games.games && state.games.games[gameId];
  }
  if (existingGame && existingGame.hasDetail) {
    dispatch(getGameSuccess(existingGame));
    // let the calling code know there's nothing to wait for.
    return Promise.resolve();
  }

  let game: Game;
  const docRef: DocumentReference = getGamesCollection().doc(gameId);
  return docRef.get().then((value: DocumentSnapshot) => {
    if (!value.exists) {
      throw new Error(`Game not found: ${gameId}`);
    }
    game = extractGame(value);
  })
    .then(() => {
      return loadGameRoster(firebaseRef.firestore(), gameId);
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
    return Promise.resolve();
  }

  // Gets the retrieved game. The game must exist as the copy can only be triggered when viewing
  // a loaded game.
  const state = getState();
  let existingGame: Game | undefined;
  if (state.game && state.game.game && state.game.game.id === gameId) {
    existingGame = state.game.game!;
  } else {
    existingGame = state.games && state.games.games && state.games.games[gameId];
  }
  if (!existingGame) {
    return Promise.resolve();
  }

  dispatch(copyRosterRequest(gameId));

  const game: GameDetail = existingGame as GameDetail;

  const rosterExists = (Object.keys(game.roster).length > 0);
  if (rosterExists) {
    dispatch(copyRosterSuccess(gameId));
    return Promise.resolve();
  }

  // Load team roster and save copy to storage
  return loadTeamRoster(firebaseRef.firestore(), game.teamId)
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
        savePlayerToGameRoster(gamePlayer, firebaseRef.firestore(), gameId, { keepExistingId: true });
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
  savePlayerToGameRoster(newPlayer, firebaseRef.firestore(), gameId);
  dispatch(addGamePlayer(newPlayer));
};

export const addGamePlayer: ActionCreator<ThunkResult> = (player: Player) => (dispatch) => {
  dispatch({
    type: ADD_GAME_PLAYER,
    player
  });
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
  const doc: DocumentReference = getGamesCollection().doc(gameId);
  doc.update({
    status: GameStatus.Start
  });
  dispatch({
    type: START_GAME
  });
};
