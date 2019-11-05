import { GET_GAME_SUCCESS } from '@app/actions/game-types';
import { GameDetail, LiveGame } from '@app/models/game';
import { liveGame, LiveGameState } from '@app/reducers/live-game';
import { expect } from '@open-wc/testing';
import {
  buildRoster,
  getFakeAction,
  getNewGame,
  getStoredGame,
  getStoredPlayer
} from '../helpers/test_data';

const LIVEGAME_INITIAL_STATE: LiveGameState = {
  gameId: '',
  liveGame: undefined,
};

describe('Live Game reducer', () => {

  it('should return the initial state', () => {
    expect(
      liveGame(LIVEGAME_INITIAL_STATE, getFakeAction())
      ).to.equal(LIVEGAME_INITIAL_STATE);
  });

  describe('GET_GAME_SUCCESS', () => {
    let currentState: LiveGameState = LIVEGAME_INITIAL_STATE;

    beforeEach(() => {
      currentState = {
        ...LIVEGAME_INITIAL_STATE,
      };
    });

    it('should set live game to given game with full detail', () => {
      const existingGame = getStoredGame();
      const inputGame: GameDetail = {
        ...existingGame,
        roster: buildRoster([getStoredPlayer()])
      };

      currentState.gameId = inputGame.id;
      const newState = liveGame(currentState, {
        type: GET_GAME_SUCCESS,
        game: inputGame
      });

      const liveDetail: LiveGame = {
        id: existingGame.id
      };

      expect(newState).to.deep.include({
        liveGame: liveDetail,
      });

      expect(newState).not.to.equal(currentState);
      expect(newState.liveGame).not.to.equal(currentState.liveGame);
    });

    it('should initialize live game for new game', () => {
      const currentGame = getNewGame();
      const inputGame: GameDetail = {
        ...currentGame,
        roster: buildRoster([getStoredPlayer()])
      };

      currentState.gameId = inputGame.id;
      const newState = liveGame(currentState, {
        type: GET_GAME_SUCCESS,
        game: inputGame
      });

      const liveDetail: LiveGame = {
        id: currentGame.id
      };

      expect(newState).to.deep.include({
        liveGame: liveDetail,
      });

      expect(newState).not.to.equal(currentState);
      expect(newState.liveGame).not.to.equal(currentState.liveGame);
    });

  }); // describe('GET_GAME_SUCCESS')

});
