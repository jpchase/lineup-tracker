/**
@license
*/

import { Reducer } from 'redux';
import { Games, GameDetail } from '../models/game';
import { Player, Roster } from '../models/player';
import {
  ADD_GAME,
  GET_GAME_REQUEST,
  GET_GAME_SUCCESS,
  GET_GAME_FAIL,
  GET_GAMES
} from '../actions/game';
import { RootAction } from '../store';

export interface GameState {
  games: Games;
  gameId: string;
  game: GameDetail | undefined;
  detailLoading: boolean;
  detailFailure: boolean;
  error?: string;
}

const INITIAL_STATE: GameState = {
  games: {},
  gameId: '',
  game: undefined,
  detailLoading: false,
  detailFailure: false,
  error: ''
};

const game: Reducer<GameState, RootAction> = (state = INITIAL_STATE, action) => {
  const newState: GameState = {
    ...state,
    games: { ...state.games },
  };
  console.log(`game.ts - reducer: ${JSON.stringify(action)}, state = ${JSON.stringify(state)}`);
  switch (action.type) {
    case ADD_GAME:
      newState.games[action.game.id] = action.game;
      return newState;

    case GET_GAMES:
      newState.games = action.games;
      return newState;

    case GET_GAME_REQUEST:
      newState.gameId = action.gameId;
      newState.detailFailure = false;
      newState.detailLoading = true;
      return newState;

    case GET_GAME_SUCCESS:
      const gameDetail: GameDetail = action.game;
      // Copy team roster, if required.
      let hasGameRoster = (Object.keys(gameDetail.roster).length > 0);
      if (action.teamRoster && !hasGameRoster) {
        const teamRoster = action.teamRoster!;
        const roster: Roster = Object.keys(teamRoster).reduce((obj, key) => {
          const teamPlayer: Player = teamRoster[key];
          const player: Player = { ...teamPlayer};
          obj[player.id] = player;
          return obj;
        }, {} as Roster);
        gameDetail.roster = roster;
        hasGameRoster = true;
      }
      gameDetail.hasDetail = hasGameRoster;
      newState.game = gameDetail;
      newState.games[action.game.id] = action.game;
      newState.detailFailure = false;
      newState.detailLoading = false;
      return newState;

    case GET_GAME_FAIL:
      newState.error = action.error;
      newState.detailFailure = true;
      newState.detailLoading = false;
      return newState;

    default:
      return state;
  }
};

export default game;
