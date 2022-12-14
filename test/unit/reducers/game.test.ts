import {
  GameDetail, GameStatus
} from '@app/models/game.js';
import { Player } from '@app/models/player';
import {
  ADD_GAME_PLAYER,
  GET_GAME_FAIL,
  GET_GAME_REQUEST,
  GET_GAME_SUCCESS
} from '@app/slices/game-types';
import { copyRoster, gameReducer as game, GameState } from '@app/slices/game/game-slice.js';
import { expect } from '@open-wc/testing';
import {
  buildRoster,
  getFakeAction,
  getNewGame, getNewGameDetail,
  getNewPlayer, getStoredGame, getStoredPlayer
} from '../helpers/test_data';

const GAME_INITIAL_STATE: GameState = {
  gameId: '',
  game: undefined,
  games: {},
  detailLoading: false,
  detailFailure: false,
  rosterLoading: false,
  rosterFailure: false,
  error: ''
};

function buildNewGameDetailAndRoster(): GameDetail {
  return getNewGameDetail(buildRoster([getStoredPlayer()]));
}

describe('Game reducer', () => {

  it('should return the initial state', () => {
    expect(
      game(GAME_INITIAL_STATE, getFakeAction())
    ).to.equal(GAME_INITIAL_STATE);
  });

  describe('GET_GAME_REQUEST', () => {
    it('should set game id and loading flag', () => {
      const gameId = 'idfornewgame';
      const newState = game(GAME_INITIAL_STATE, {
        type: GET_GAME_REQUEST,
        gameId: gameId
      });

      expect(newState).to.include({
        gameId: gameId,
        detailLoading: true,
        detailFailure: false
      });

      expect(newState).not.to.equal(GAME_INITIAL_STATE);
      expect(newState.gameId).not.to.equal(GAME_INITIAL_STATE.gameId);
    });
  }); // describe('GET_GAME_REQUEST')

  describe('GET_GAME_SUCCESS', () => {
    let currentState: GameState = GAME_INITIAL_STATE;

    beforeEach(() => {
      currentState = {
        ...GAME_INITIAL_STATE,
        detailLoading: true,
      };
    });

    it('should set game to given game with full detail', () => {
      const existingGame = getStoredGame(GameStatus.Start);
      const inputGame: GameDetail = {
        ...existingGame,
        roster: buildRoster([getStoredPlayer()])
      };

      currentState.gameId = inputGame.id;
      const newState = game(currentState, {
        type: GET_GAME_SUCCESS,
        game: inputGame
      });

      const gameDetail: GameDetail = {
        ...existingGame,
        hasDetail: true,
        roster: buildRoster([getStoredPlayer()])
      };

      expect(newState).to.deep.include({
        game: gameDetail,
        // TODO: Ensure games state has latest game detail
        // games: buildGames([gameDetail]),
        detailLoading: false,
        detailFailure: false
      });

      expect(newState).not.to.equal(currentState);
      expect(newState.game).not.to.equal(currentState.game);
    });

    it('should initialize detail when game roster is empty', () => {
      const currentGame = getNewGame();
      const inputGame: GameDetail = {
        ...currentGame,
        roster: {}
      };

      currentState.gameId = inputGame.id;
      const newState = game(currentState, {
        type: GET_GAME_SUCCESS,
        game: inputGame
      });

      const gameDetail: GameDetail = {
        ...currentGame,
        hasDetail: true,
        roster: {},
      };

      expect(newState).to.deep.include({
        game: gameDetail,
        // TODO: Ensure games state has latest game detail
        // games: buildGames([gameDetail]),
        detailLoading: false,
        detailFailure: false
      });

      expect(newState).not.to.equal(currentState);
      expect(newState.game).not.to.equal(currentState.game);
    });

    it('should only update loading flag when game set to current game', () => {
      const currentGame = buildNewGameDetailAndRoster();
      currentState.gameId = currentGame.id;
      currentState.game = currentGame;

      const newState = game(currentState, {
        type: GET_GAME_SUCCESS,
        game: currentGame
      });

      const gameDetail: GameDetail = {
        ...currentGame,
      };

      expect(newState).to.deep.include({
        game: gameDetail,
        // TODO: Ensure games state has latest game detail
        // games: buildGames([gameDetail]),
        detailLoading: false,
        detailFailure: false
      });

      expect(newState).not.to.equal(currentState);
      expect(newState.game).to.equal(currentState.game);
      expect(newState.game!.roster).to.equal(currentState.game!.roster);
    });
  }); // describe('GET_GAME_SUCCESS')

  describe('GET_GAME_FAIL', () => {
    it('should set failure flag and error message', () => {

      const newState = game(GAME_INITIAL_STATE, {
        type: GET_GAME_FAIL,
        error: 'What a game failure!'
      });

      expect(newState).to.include({
        error: 'What a game failure!',
        detailLoading: false,
        detailFailure: true
      });

      expect(newState).not.to.equal(GAME_INITIAL_STATE);
      expect(newState.error).not.to.equal(GAME_INITIAL_STATE.error);
    });
  }); // describe('GET_GAME_FAIL')

  describe('COPY_ROSTER_REQUEST', () => {
    it('should set copying flag', () => {
      const gameId = 'agameid';
      const newState = game(GAME_INITIAL_STATE, {
        type: copyRoster.pending.type,
        meta: {
          gameId: gameId
        }
      });

      expect(newState).to.include({
        gameId: gameId,
        rosterLoading: true,
        rosterFailure: false
      });

      expect(newState).not.to.equal(GAME_INITIAL_STATE);
      expect(newState.gameId).not.to.equal(GAME_INITIAL_STATE.gameId);
    });
  }); // describe('COPY_ROSTER_REQUEST')

  describe('COPY_ROSTER_SUCCESS', () => {
    let currentState: GameState = GAME_INITIAL_STATE;
    let currentGame = getNewGame();

    beforeEach(() => {
      currentState = {
        ...GAME_INITIAL_STATE,
        rosterLoading: true,
        game: {
          ...currentGame,
          hasDetail: true,
          roster: {}
        }
      };
    });

    it('should only update flags when roster already set', () => {
      currentState.game!.roster = buildRoster([getStoredPlayer()]);

      const newState = game(currentState, {
        type: copyRoster.fulfilled.type,
        payload: {
          gameId: currentState.game!.id
        }
      });

      const gameDetail: GameDetail = {
        ...currentState.game as GameDetail
      };

      expect(newState).to.deep.include({
        game: gameDetail,
        rosterLoading: false,
        rosterFailure: false
      });

      expect(newState).not.to.equal(currentState);
      expect(newState.game).to.equal(currentState.game);
      expect(newState.game!.roster).to.equal(currentState.game!.roster);
    });

    it('should set roster and update flags', () => {
      const rosterPlayers = [getStoredPlayer()];

      expect(currentState.game!.roster).to.deep.equal({});

      const newState = game(currentState, {
        type: copyRoster.fulfilled.type,
        payload: {
          gameId: currentState.game!.id,
          gameRoster: buildRoster(rosterPlayers)
        }
      });

      const gameDetail: GameDetail = {
        ...currentGame,
        hasDetail: true,
        roster: buildRoster(rosterPlayers)
      };

      expect(newState).to.deep.include({
        game: gameDetail,
        rosterLoading: false,
        rosterFailure: false
      });

      expect(newState).not.to.equal(currentState);
      expect(newState.game).not.to.equal(currentState.game);
      expect(newState.game!.roster).not.to.equal(currentState.game!.roster);
    });
  }); // describe('COPY_ROSTER_SUCCESS')

  describe('COPY_ROSTER_FAIL', () => {
    it('should set failure flag and error message', () => {

      const newState = game(GAME_INITIAL_STATE, {
        type: copyRoster.rejected.type,
        error: { message: 'What a roster failure!' }
      });

      expect(newState).to.include({
        error: 'What a roster failure!',
        rosterLoading: false,
        rosterFailure: true
      });

      expect(newState).not.to.equal(GAME_INITIAL_STATE);
      expect(newState.error).not.to.equal(GAME_INITIAL_STATE.error);
    });
  }); // describe('COPY_ROSTER_FAIL')

  describe('ADD_PLAYER', () => {
    let newPlayer: Player;
    let existingPlayer: Player;
    let currentState: GameState = GAME_INITIAL_STATE;

    beforeEach(() => {
      newPlayer = getNewPlayer();
      existingPlayer = getStoredPlayer();

      currentState = {
        ...GAME_INITIAL_STATE,
        game: {
          ...getNewGameDetail()
        }
      };
    });

    it('should add new player to empty roster', () => {
      const newState = game(currentState, {
        type: ADD_GAME_PLAYER,
        player: newPlayer
      });

      expect(newState.game).to.deep.include({
        roster: buildRoster([newPlayer]),
      });

      expect(newState).not.to.equal(currentState);
      expect(newState.game!.roster).not.to.equal(currentState.game!.roster);
    });

    it('should add new player to roster with existing players', () => {
      currentState.game!.roster = buildRoster([existingPlayer]);

      const newState = game(currentState, {
        type: ADD_GAME_PLAYER,
        player: newPlayer
      });

      expect(newState.game).to.deep.include({
        roster: buildRoster([existingPlayer, newPlayer]),
      });

      expect(newState).not.to.equal(currentState);
      expect(newState.game!.roster).not.to.equal(currentState.game!.roster);
    });
  }); // describe('ADD_PLAYER')

});
