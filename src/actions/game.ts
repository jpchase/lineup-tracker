import { Action, ActionCreator } from 'redux';
import { Game, GameDetail } from '../models/game.js';
import { Roster } from '../models/player.js';
import {
  GET_GAME_FAIL, GET_GAME_REQUEST,
  GET_GAME_SUCCESS
} from '../slices/game-types';
import { loadGame, loadGameRoster } from '../slices/game/game-storage.js';
import { ThunkPromise } from '../store.js';

interface GameActionGetGameRequest extends Action<typeof GET_GAME_REQUEST> { gameId: string };
export interface GameActionGetGameSuccess extends Action<typeof GET_GAME_SUCCESS> { game: GameDetail };
interface GameActionGetGameFail extends Action<typeof GET_GAME_FAIL> { error: string };

export const getGame = (gameId: string): ThunkPromise<void> => (dispatch, getState) => {
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
