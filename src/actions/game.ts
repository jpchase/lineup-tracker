/**
@license
*/

import { Action, ActionCreator } from 'redux';
import { ThunkAction } from 'redux-thunk';
import { RootState } from '../store';
import { FormationType, Position } from '../models/formation';
import { Game, GameDetail } from '../models/game';
import { Player, Roster } from '../models/player';
import { currentGameIdSelector } from '../reducers/game';
import { firebaseRef } from '../firebase';
import { extractGame, loadGameRoster, loadTeamRoster, savePlayerToGameRoster, KEY_GAMES } from '../firestore-helpers';
import { CollectionReference, DocumentReference, DocumentSnapshot } from '@firebase/firestore-types';

export const GET_GAME_REQUEST = 'GET_GAME_REQUEST';
export const GET_GAME_SUCCESS = 'GET_GAME_SUCCESS';
export const GET_GAME_FAIL = 'GET_GAME_FAIL';
export const CAPTAINS_DONE = 'CAPTAINS_DONE';
export const COPY_ROSTER_REQUEST = 'COPY_ROSTER_REQUEST';
export const COPY_ROSTER_SUCCESS = 'COPY_ROSTER_SUCCESS';
export const COPY_ROSTER_FAIL = 'COPY_ROSTER_FAIL';
export const ADD_PLAYER = 'ADD_PLAYER';
export const ROSTER_DONE = 'ROSTER_DONE';
export const APPLY_STARTER = 'APPLY_STARTER';
export const CANCEL_STARTER = 'CANCEL_STARTER';
export const STARTERS_DONE = 'STARTERS_DONE';
export const SET_FORMATION = 'SET_FORMATION';
export const START_GAME = 'START_GAME';
export const SELECT_PLAYER = 'SELECT_PLAYER';
export const SELECT_POSITION = 'SELECT_POSITION';

export interface GameActionGetGameRequest extends Action<'GET_GAME_REQUEST'> { gameId: string };
export interface GameActionGetGameSuccess extends Action<'GET_GAME_SUCCESS'> { game: GameDetail };
export interface GameActionGetGameFail extends Action<'GET_GAME_FAIL'> { error: string };
export interface GameActionCopyRosterRequest extends Action<'COPY_ROSTER_REQUEST'> { gameId: string };
export interface GameActionCopyRosterSuccess extends Action<'COPY_ROSTER_SUCCESS'> { gameId: string, gameRoster?: Roster };
export interface GameActionCopyRosterFail extends Action<'COPY_ROSTER_FAIL'> { error: string };
export interface GameActionCaptainsDone extends Action<'CAPTAINS_DONE'> {};
export interface GameActionAddPlayer extends Action<'ADD_PLAYER'> { player: Player };
export interface GameActionRosterDone extends Action<'ROSTER_DONE'> {};
export interface GameActionApplyStarter extends Action<'APPLY_STARTER'> {};
export interface GameActionCancelStarter extends Action<'CANCEL_STARTER'> {};
export interface GameActionStartersDone extends Action<'STARTERS_DONE'> {};
export interface GameActionSetFormation extends Action<'SET_FORMATION'> { formationType: FormationType };
export interface GameActionStartGame extends Action<'START_GAME'> {};
export interface GameActionSelectPlayer extends Action<'SELECT_PLAYER'> { playerId: string };
export interface GameActionSelectPosition extends Action<'SELECT_POSITION'> { position: Position };
export type GameAction = GameActionGetGameRequest | GameActionGetGameSuccess |
                         GameActionGetGameFail | GameActionCaptainsDone | GameActionRosterDone |
                         GameActionStartersDone | GameActionSetFormation | GameActionStartGame |
                         GameActionSelectPlayer | GameActionSelectPosition | GameActionApplyStarter |
                         GameActionCancelStarter | GameActionAddPlayer | GameActionCopyRosterRequest |
                         GameActionCopyRosterSuccess | GameActionCopyRosterFail;

type ThunkResult = ThunkAction<void, RootState, undefined, GameAction>;
type ThunkPromise<R> = ThunkAction<Promise<R>, RootState, undefined, GameAction>;

function getGamesCollection(): CollectionReference {
  return firebaseRef.firestore().collection(KEY_GAMES);
}

export const getGame: ActionCreator<ThunkPromise<void>> = (gameId: string) => (dispatch, getState) => {
  if (!gameId) {
    return Promise.reject();
  }
  dispatch(getGameRequest(gameId));

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
    type: ADD_PLAYER,
    player
  });
};

export const markRosterDone: ActionCreator<ThunkResult> = () => (dispatch) => {
  dispatch({
    type: ROSTER_DONE
  });
};

export const applyProposedStarter: ActionCreator<ThunkResult> = () => (dispatch, getState) => {
  const state = getState();
  if (!(state.game && state.game.proposedStarter)) {
    return;
  }
  dispatch({
    type: APPLY_STARTER
  });
};

export const cancelProposedStarter: ActionCreator<ThunkResult> = () => (dispatch, getState) => {
  const state = getState();
  if (!(state.game && state.game.proposedStarter)) {
    return;
  }
  dispatch({
    type: CANCEL_STARTER
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

export const startGame: ActionCreator<ThunkResult> = () => (dispatch) => {
  // TODO: Save game to storage
  dispatch({
    type: START_GAME
  });
};

export const selectPlayer: ActionCreator<ThunkResult> = (playerId: string) => (dispatch) => {
  if (!playerId) {
    return;
  }
  dispatch({
    type: SELECT_PLAYER,
    playerId
  });
};

export const selectPosition: ActionCreator<ThunkResult> = (position: Position) => (dispatch) => {
  if (!position) {
    return;
  }
  dispatch({
    type: SELECT_POSITION,
    position
  });
};
