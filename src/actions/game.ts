/**
@license
*/

import { Action, ActionCreator } from 'redux';
import { ThunkAction } from 'redux-thunk';
import { RootState } from '../store';
import { Game, Games, GameDetail, GameStatus } from '../models/game';
import { Roster } from '../models/player';
import { firebaseRef } from '../firebase';
import { buildNewDocumentData, loadRoster } from '../firestore-helpers';
import { CollectionReference, DocumentData, DocumentReference, DocumentSnapshot, Query, QuerySnapshot, QueryDocumentSnapshot } from '@firebase/firestore-types';

export const ADD_GAME = 'ADD_GAME';
export const GET_GAME_REQUEST = 'GET_GAME_REQUEST';
export const GET_GAME_SUCCESS = 'GET_GAME_SUCCESS';
export const GET_GAME_FAIL = 'GET_GAME_FAIL';
export const GET_GAMES = 'GET_GAMES';

export interface GameActionAddGame extends Action<'ADD_GAME'> { game: Game };
export interface GameActionGetGameRequest extends Action<'GET_GAME_REQUEST'> { gameId: string };
export interface GameActionGetGameSuccess extends Action<'GET_GAME_SUCCESS'> { game: GameDetail };
export interface GameActionGetGameFail extends Action<'GET_GAME_FAIL'> { error: string };
export interface GameActionGetGames extends Action<'GET_GAMES'> { games: Games };
export type GameAction = GameActionAddGame | GameActionGetGameRequest | GameActionGetGameSuccess | GameActionGetGameFail | GameActionGetGames;

type ThunkResult = ThunkAction<void, RootState, undefined, GameAction>;
type ThunkPromise<R> = ThunkAction<Promise<R>, RootState, undefined, GameAction>;

const KEY_GAMES = 'games';
const KEY_ROSTER = 'roster';
const FIELD_OWNER = 'owner_uid';
const FIELD_PUBLIC = 'public';
const FIELD_TEAMID = 'teamId';

function getGamesCollection(): CollectionReference {
  return firebaseRef.firestore().collection(KEY_GAMES);
}

function extractGame(document: DocumentSnapshot): Game {
  // Caller is responsible for ensuring data exists
  const data: DocumentData = document.data()!;
  const game: Game = {
    id: document.id,
    teamId: data.teamId,
    status: data.status,
    name: data.name,
    date: data.date.toDate(),
    opponent: data.opponent
  };
  return game;
}

export const getGames: ActionCreator<ThunkResult> = (teamId: string) => (dispatch, getState) => {
  if (!teamId) {
    return;
  }
  // TODO: Add try/catch for firestore/collection/get calls?
  let query: Query = getGamesCollection().where(FIELD_TEAMID, '==', teamId);
  // Show the user's games, when signed in. Otherwise, only show public data.
  // TODO: Extract into helper function somewhere?
  const currentUser = getState().auth!.user;
  if (currentUser && currentUser.id) {
    console.log(`Get games for owner = ${JSON.stringify(currentUser)}`);
    query = query.where(FIELD_OWNER, '==', currentUser.id);
  } else {
    console.log(`Get public games`);
    query = query.where(FIELD_PUBLIC, '==', true);
  }

  query.get().then((value: QuerySnapshot) => {
    const games = {} as Games;

    value.forEach((result: QueryDocumentSnapshot) => {
      const entry: Game = extractGame(result);
      games[entry.id] = entry;
    });

    console.log(`getGames - ActionCreator: ${JSON.stringify(games)}`);

    dispatch({
      type: GET_GAMES,
      games
    });

  }).catch((error: any) => {
    // TODO: Dispatch error?
    console.log(`Loading of games from storage failed: ${error}`);
  });
};

export const getGame: ActionCreator<ThunkPromise<void>> = (gameId: string) => (dispatch, getState) => {
  if (!gameId) {
    return Promise.reject();
  }
  dispatch(getGameRequest(gameId));

  // Checks if the game has already been retrieved.
  const state = getState();
  const existingGame: Game | undefined = state.game && state.game.games && state.game.games[gameId];
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
    return loadRoster(firebaseRef.firestore(), `${KEY_GAMES}/${gameId}/${KEY_ROSTER}`);
  })
  .then((roster: Roster) => {
    const gameDetail: GameDetail = {
      ...game,
      hasDetail: true,
      roster
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

export const addNewGame: ActionCreator<ThunkResult> = (newGame: Game) => (dispatch, getState) => {
  if (!newGame) {
    return;
  }
  const state = getState();
  // Verify that the game name is unique.
  const gameState = state.game!;
  if (gameState.games) {
    const hasMatch = Object.keys(gameState.games).some((key) => {
      const game = gameState.games[key];
      return (game.name.localeCompare(newGame.name, undefined, {sensitivity: 'base'}) == 0);
    });
    if (hasMatch) {
      return;
    }
  }
  dispatch(saveGame(newGame));
};

// Saves the new game in local storage, before adding to the store
export const saveGame: ActionCreator<ThunkResult> = (newGame: Game) => (dispatch, getState) => {
  if (!newGame.status) {
    newGame.status = GameStatus.New;
  }
  const data = buildNewDocumentData(newGame, getState(), true);

  const collection = getGamesCollection();
  const doc: DocumentReference = collection.doc();
  doc.set(data);
  newGame.id = doc.id;
  dispatch(addGame(newGame));
};

export const addGame: ActionCreator<ThunkResult> = (game: Game) => (dispatch) => {
  dispatch({
    type: ADD_GAME,
    game
  });
};
