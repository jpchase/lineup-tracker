import { FormationType } from '@app/models/formation';
import { GameDetail, LiveGame } from '@app/models/game';
import { live, LiveState } from '@app/reducers/live';
import { GET_GAME_SUCCESS, SET_FORMATION } from '@app/slices/game-types';
import { SELECT_PLAYER } from '@app/slices/live-types';
import { expect } from '@open-wc/testing';
import { getLiveGame } from '../helpers/test-live-game-data';
import {
  buildLivePlayers,
  buildRoster,
  getFakeAction,
  getNewGame,
  getStoredGame,
  getStoredPlayer
} from '../helpers/test_data';

const LIVE_INITIAL_STATE: LiveState = {
  gameId: '',
  liveGame: undefined,
  selectedPlayer: undefined,
};

describe('Live reducer', () => {

  it('should return the initial state', () => {
    expect(
      live(LIVE_INITIAL_STATE, getFakeAction())
      ).to.equal(LIVE_INITIAL_STATE);
  });

  describe('GET_GAME_SUCCESS', () => {
    let currentState: LiveState = LIVE_INITIAL_STATE;

    beforeEach(() => {
      currentState = {
        ...LIVE_INITIAL_STATE,
      };
    });

    it('should set live game to given game with full detail', () => {
      const existingGame = getStoredGame();
      const inputGame: GameDetail = {
        ...existingGame,
        hasDetail: true,
        roster: buildRoster([getStoredPlayer()])
      };

      currentState.gameId = inputGame.id;
      const newState = live(currentState, {
        type: GET_GAME_SUCCESS,
        game: inputGame
      });

      const liveDetail: LiveGame = {
        id: existingGame.id,
        players: buildLivePlayers([getStoredPlayer()])
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
      const newState = live(currentState, {
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

  describe('SELECT_PLAYER', () => {

    it('should only set selectedPlayer with nothing selected', () => {
      const state: LiveState = {
        ...LIVE_INITIAL_STATE,
        liveGame: getLiveGame()
      };
      expect(state.selectedPlayer).to.be.undefined;

      const selectedPlayer = getStoredPlayer();

      const newState = live(state, {
        type: SELECT_PLAYER,
        playerId: selectedPlayer.id
      });

      expect(newState).to.deep.include({
        liveGame: getLiveGame(),
        selectedPlayer: selectedPlayer.id,
      });

      expect(newState).not.to.equal(state);
    });
  }); // describe('SELECT_PLAYER')

  describe('SET_FORMATION', () => {

    it('should set formation type and update setup tasks to mark formation complete', () => {
      const currentGame = getNewGame();
      const state: LiveState = {
        ...LIVE_INITIAL_STATE,
        liveGame: {
          id: currentGame.id
        }
      };

      const newState = live(state, {
        type: SET_FORMATION,
        formationType: FormationType.F4_3_3
      });

      const liveDetail: LiveGame = {
        id: currentGame.id,
        formation: { type: FormationType.F4_3_3 }
      }

      expect(newState).to.deep.include({
        liveGame: liveDetail,
      });

      expect(newState).not.to.equal(state);
      expect(newState.liveGame).not.to.equal(state.liveGame);
    });
  }); // describe('SET_FORMATION')
});
