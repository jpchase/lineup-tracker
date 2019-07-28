/**
@license
*/

import { Action, ActionCreator } from 'redux';
import { ThunkAction } from 'redux-thunk';
import { RootState } from '../store';
import { FormationType, Position } from '../models/formation';
import { Game, GameDetail } from '../models/game';
import { Roster } from '../models/player';
import { firebaseRef } from '../firebase';
import { extractGame, loadGameRoster, loadTeamRoster, KEY_GAMES } from '../firestore-helpers';
import { CollectionReference, DocumentReference, DocumentSnapshot } from '@firebase/firestore-types';

export const GET_GAME_REQUEST = 'GET_GAME_REQUEST';
export const GET_GAME_SUCCESS = 'GET_GAME_SUCCESS';
export const GET_GAME_FAIL = 'GET_GAME_FAIL';
export const CAPTAINS_DONE = 'CAPTAINS_DONE';
export const ROSTER_DONE = 'ROSTER_DONE';
export const STARTERS_DONE = 'STARTERS_DONE';
export const SET_FORMATION = 'SET_FORMATION';
export const START_GAME = 'START_GAME';
export const SELECT_PLAYER = 'SELECT_PLAYER';
export const SELECT_POSITION = 'SELECT_POSITION';

export interface GameActionGetGameRequest extends Action<'GET_GAME_REQUEST'> { gameId: string };
export interface GameActionGetGameSuccess extends Action<'GET_GAME_SUCCESS'> { game: GameDetail, teamRoster?: Roster };
export interface GameActionGetGameFail extends Action<'GET_GAME_FAIL'> { error: string };
export interface GameActionCaptainsDone extends Action<'CAPTAINS_DONE'> {};
export interface GameActionRosterDone extends Action<'ROSTER_DONE'> {};
export interface GameActionStartersDone extends Action<'STARTERS_DONE'> {};
export interface GameActionSetFormation extends Action<'SET_FORMATION'> { formationType: FormationType };
export interface GameActionStartGame extends Action<'START_GAME'> {};
export interface GameActionSelectPlayer extends Action<'SELECT_PLAYER'> { playerId: string };
export interface GameActionSelectPosition extends Action<'SELECT_POSITION'> { position: Position };
export type GameAction = GameActionGetGameRequest | GameActionGetGameSuccess |
                         GameActionGetGameFail | GameActionCaptainsDone | GameActionRosterDone |
                         GameActionStartersDone | GameActionSetFormation | GameActionStartGame |
                         GameActionSelectPlayer | GameActionSelectPosition;

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
  const existingGame: Game | undefined = state.games && state.games.games && state.games.games[gameId];
  if (existingGame && existingGame.hasDetail) {
    dispatch(getGameSuccess(existingGame));
    // let the calling code know there's nothing to wait for.
    return Promise.resolve();
  }

  let game: Game;
  let gameRoster: Roster;
  let gameRosterExists = false;
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
  .then((roster: Roster) => {
    // Checks if the game roster has been populated.
    gameRoster = roster;
    gameRosterExists = (Object.keys(roster).length > 0);
    if (gameRosterExists) {
      return {};
    }
    // No roster yet, load the team roster.
    return loadTeamRoster(firebaseRef.firestore(), game.teamId);
  })
  .then((teamRoster: Roster) => {
    const gameDetail: GameDetail = {
      ...game,
      roster: gameRoster
    };
    dispatch(getGameSuccess(gameDetail, teamRoster));
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

const getGameSuccess: ActionCreator<GameActionGetGameSuccess> = (game: GameDetail, teamRoster?: Roster) => {
  return {
    type: GET_GAME_SUCCESS,
    game,
    teamRoster
  };
};

const getGameFail: ActionCreator<GameActionGetGameFail> = (error: string) => {
  return {
    type: GET_GAME_FAIL,
    error
  };
};

export const markCaptainsDone: ActionCreator<ThunkResult> = () => (dispatch) => {
  dispatch({
    type: CAPTAINS_DONE
  });
};

export const markRosterDone: ActionCreator<ThunkResult> = () => (dispatch) => {
  dispatch({
    type: ROSTER_DONE
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
