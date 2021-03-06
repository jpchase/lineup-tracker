/**
@license
*/

import { Action, ActionCreator } from 'redux';
import { ThunkAction } from 'redux-thunk';
import { RootState } from '../store';
import { Game, Games, GameStatus } from '../models/game';
import { firebaseRef } from '../firebase';
import { saveNewDocument, extractGame, KEY_GAMES } from '../firestore-helpers';
import {
  CollectionReference,
  Query, QuerySnapshot, QueryDocumentSnapshot
} from '@firebase/firestore-types';

export const ADD_GAME = 'ADD_GAME';
export const GET_GAMES = 'GET_GAMES';

export interface GamesActionAddGame extends Action<'ADD_GAME'> { game: Game };
export interface GamesActionGetGames extends Action<'GET_GAMES'> { games: Games };
export type GamesAction = GamesActionAddGame | GamesActionGetGames;

type ThunkResult = ThunkAction<void, RootState, undefined, GamesAction>;

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

export const addNewGame: ActionCreator<ThunkResult> = (newGame: Game) => (dispatch, getState) => {
  if (!newGame) {
    return;
  }
  const state = getState();
  // Verify that the game name is unique.
  const gameState = state.games!;
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
  saveNewDocument(newGame, getGamesCollection(), getState(), { addTeamId: true, addUserId: true });
  dispatch(addGame(newGame));
};

export const addGame: ActionCreator<ThunkResult> = (game: Game) => (dispatch) => {
  dispatch({
    type: ADD_GAME,
    game
  });
};
