/**
@license
*/

import { Reducer } from 'redux';
import { Games } from '../models/game';
import {
  ADD_GAME,
  GET_GAMES
} from '../actions/games';
import { RootAction } from '../store';

export interface GamesState {
  games: Games;
  error?: string;
}

const INITIAL_STATE: GamesState = {
  games: {},
  error: ''
};

const games: Reducer<GamesState, RootAction> = (state = INITIAL_STATE, action) => {
  const newState: GamesState = {
    ...state,
    games: { ...state.games },
  };
  // console.log(`games.ts - reducer: ${JSON.stringify(action)}, state = ${JSON.stringify(state)}`);
  switch (action.type) {
    case ADD_GAME:
      newState.games[action.game.id] = action.game;
      return newState;

    case GET_GAMES:
      newState.games = action.games;
      return newState;

    default:
      return state;
  }
};

export default games;
