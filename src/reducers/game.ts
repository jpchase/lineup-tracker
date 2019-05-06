/**
@license
*/

import { Reducer } from 'redux';
import { Games } from '../models/game.js';
import {
  ADD_GAME,
  GET_GAME,
  GET_GAMES
} from '../actions/game.js';
import { RootAction } from '../store.js';

export interface GameState {
  games: Games;
  gameId: string;
  error: string;
}

const INITIAL_STATE: GameState = {
  games: {},
  gameId: '',
  error: ''
};

const game: Reducer<GameState, RootAction> = (state = INITIAL_STATE, action) => {
  const newState: GameState = {
    ...state,
    games: { ...state.games },
  };
  console.log(`game.ts - reducer: ${JSON.stringify(action)}, ${JSON.stringify(state)}`);
  switch (action.type) {
    case ADD_GAME:
      newState.games[action.game.id] = action.game;
      return newState;

    case GET_GAMES:
      newState.games = action.games;
      return newState;

    case GET_GAME:
      newState.gameId = action.gameId;
      return newState;

    default:
      return state;
  }
};

export default game;
