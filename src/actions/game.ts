/**
@license
*/

import { Action, ActionCreator } from 'redux';
import { ThunkAction } from 'redux-thunk';
import { RootState } from '../store';
import { Game, Games } from '../models/game';
import { firebaseRef } from "../firebase";
import { CollectionReference, DocumentData, DocumentReference, Query, QuerySnapshot, QueryDocumentSnapshot} from '@firebase/firestore-types';

export const ADD_GAME = 'ADD_GAME';
export const GET_GAME = 'GET_GAME';
export const GET_GAMES = 'GET_GAMES';

export interface GameActionAddGame extends Action<'ADD_GAME'> { game: Game };
export interface GameActionGetGame extends Action<'GET_GAME'> { gameId: string };
export interface GameActionGetGames extends Action<'GET_GAMES'> { games: Games };
export type GameAction = GameActionAddGame | GameActionGetGame | GameActionGetGames;

type ThunkResult = ThunkAction<void, RootState, undefined, GameAction>;
type ThunkPromise<R> = ThunkAction<Promise<R>, RootState, undefined, GameAction>;

const KEY_GAMES = 'games';
const FIELD_OWNER = 'owner_uid';
const FIELD_PUBLIC = 'public';
const FIELD_TEAMID = 'teamId';

function getGamesCollection(): CollectionReference {
  return firebaseRef.firestore().collection(KEY_GAMES);
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
      const data: DocumentData = result.data();
      const entry: Game = {
        id: result.id,
        teamId: data.teamId,
        name: data.name,
        date: data.date.toDate(),
        opponent: data.opponent
      };
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

export const getGame: ActionCreator<ThunkPromise<void>> = (gameId: string) => (/* dispatch, getState */) => {
  if (!gameId) {
    return Promise.reject();
  }
  return Promise.resolve();
}

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
export const saveGame: ActionCreator<ThunkResult> = (newGame: Game) => (dispatch) => {
  const collection = getGamesCollection();
  const doc: DocumentReference = collection.doc();
  doc.set(newGame);
  newGame.id = doc.id;
  dispatch(addGame(newGame));
};

export const addGame: ActionCreator<ThunkResult> = (game: Game) => (dispatch) => {
  dispatch({
    type: ADD_GAME,
    game
  });
};
