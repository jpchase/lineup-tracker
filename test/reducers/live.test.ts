import { FormationType, Position } from '@app/models/formation';
import { GameDetail, LiveGame, LivePlayer } from '@app/models/game';
import { PlayerStatus } from '@app/models/player';
import { live, LiveState } from '@app/reducers/live';
import { GET_GAME_SUCCESS, ROSTER_DONE, SET_FORMATION } from '@app/slices/game-types';
import { APPLY_STARTER, CANCEL_STARTER, SELECT_PLAYER, SELECT_STARTER, SELECT_STARTER_POSITION } from '@app/slices/live-types';
import { expect } from '@open-wc/testing';
import { getLiveGame } from '../helpers/test-live-game-data';
import {
  buildLivePlayers,
  buildRoster,
  getFakeAction,
  getNewGame,
  getNewPlayer,
  getStoredGame,
  getStoredPlayer
} from '../helpers/test_data';

const LIVE_INITIAL_STATE: LiveState = {
  gameId: '',
  liveGame: undefined,
  selectedStarterPlayer: undefined,
  selectedStarterPosition: undefined,
  proposedStarter: undefined,
  selectedPlayer: undefined,
};

function buildLiveGameWithPlayers(): LiveGame {
  return getLiveGame([getStoredPlayer()]);
}

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
        roster: {}
      };

      currentState.gameId = inputGame.id;
      const newState = live(currentState, {
        type: GET_GAME_SUCCESS,
        game: inputGame
      });

      const liveDetail: LiveGame = {
        id: currentGame.id,
        players: []
      };

      expect(newState).to.deep.include({
        liveGame: liveDetail,
      });

      expect(newState).not.to.equal(currentState);
      expect(newState.liveGame).not.to.equal(currentState.liveGame);
    });

  }); // describe('GET_GAME_SUCCESS')

  describe('ROSTER_DONE', () => {

    it('should init live players from roster', () => {
      const rosterPlayers = [getStoredPlayer()];

      const state: LiveState = {
        ...LIVE_INITIAL_STATE,
        liveGame: getLiveGame()
      };
      expect(state.liveGame).to.not.be.undefined;
      expect(state.liveGame!.players, 'players should be empty').to.deep.equal([]);

      const newState = live(state, {
        type: ROSTER_DONE,
        roster: buildRoster(rosterPlayers)
      });

      const liveDetail: LiveGame = {
        id: state.liveGame!.id,
        players: buildLivePlayers(rosterPlayers)
      };

      expect(newState).to.deep.include({
        liveGame: liveDetail
      });

      expect(newState).not.to.equal(state);
      expect(newState.liveGame).not.to.equal(state.liveGame);
    });
  }); // describe('ROSTER_DONE')

  describe('SELECT_STARTER', () => {

    it('should only set selectedStarterPlayer with nothing selected', () => {
      const state: LiveState = {
        ...LIVE_INITIAL_STATE,
        liveGame: buildLiveGameWithPlayers()
      };
      expect(state.selectedStarterPlayer).to.be.undefined;

      const selectedStarter = getStoredPlayer();

      const newState = live(state, {
        type: SELECT_STARTER,
        playerId: selectedStarter.id
      });

      expect(newState).to.deep.include({
        liveGame: buildLiveGameWithPlayers(),
        selectedStarterPlayer: selectedStarter.id,
        proposedStarter: undefined
      });

      expect(newState).not.to.equal(state);
    });

    it('should set selectedStarterPlayer and propose starter with position selected', () => {
      const selectedPosition: Position = { id: 'AM1', type: 'AM'};

      const state: LiveState = {
        ...LIVE_INITIAL_STATE,
        liveGame: buildLiveGameWithPlayers(),
        selectedStarterPosition: { ...selectedPosition }
      };
      expect(state.selectedStarterPlayer).to.be.undefined;

      const selectedStarter = getStoredPlayer();

      const newState = live(state, {
        type: SELECT_STARTER,
        playerId: selectedStarter.id
      });

      const starter: LivePlayer = {
        ...selectedStarter,
        currentPosition: { ...selectedPosition }
      }

      expect(newState).to.deep.include({
        liveGame: buildLiveGameWithPlayers(),
        selectedStarterPosition: { ...selectedPosition },
        selectedStarterPlayer: selectedStarter.id,
        proposedStarter: starter
      });

      expect(newState).not.to.equal(state);
    });
  }); // describe('SELECT_STARTER')

  describe('SELECT_STARTER_POSITION', () => {

    it('should only set selectedPosition with nothing selected', () => {
      const state: LiveState = {
        ...LIVE_INITIAL_STATE,
        liveGame: buildLiveGameWithPlayers()
      };
      expect(state.selectedStarterPosition).to.be.undefined;

      const selectedPosition: Position = { id: 'AM1', type: 'AM'};
      const newState = live(state, {
        type: SELECT_STARTER_POSITION,
        position: selectedPosition
      });

      expect(newState).to.deep.include({
        liveGame: buildLiveGameWithPlayers(),
        selectedStarterPosition: { ...selectedPosition },
        proposedStarter: undefined
      });

      expect(newState).not.to.equal(state);
    });

    it('should set selectedPosition and propose starter with player selected', () => {
      const selectedPlayer = getStoredPlayer();

      const state: LiveState = {
        ...LIVE_INITIAL_STATE,
        liveGame: buildLiveGameWithPlayers(),
        selectedStarterPlayer: selectedPlayer.id,
      };
      expect(state.selectedStarterPosition).to.be.undefined;

      const selectedPosition: Position = { id: 'AM1', type: 'AM'};
      const newState = live(state, {
        type: SELECT_STARTER_POSITION,
        position: selectedPosition
      });

      const starter: LivePlayer = {
        ...selectedPlayer,
        currentPosition: { ...selectedPosition }
      }

      expect(newState).to.deep.include({
        liveGame: buildLiveGameWithPlayers(),
        selectedStarterPlayer: selectedPlayer.id,
        selectedStarterPosition: { ...selectedPosition },
        proposedStarter: starter
      });

      expect(newState).not.to.equal(state);
    });
  }); // describe('SELECT_STARTER_POSITION')

  describe('APPLY_STARTER', () => {
    let currentState: LiveState;
    let selectedPlayer: LivePlayer;
    let selectedPosition: Position;

    beforeEach(() => {
      selectedPlayer = getStoredPlayer();
      selectedPosition = { id: 'AM1', type: 'AM'};
      const starter: LivePlayer = {
        ...selectedPlayer,
        currentPosition: { ...selectedPosition }
      }

      currentState = {
        ...LIVE_INITIAL_STATE,
        liveGame: buildLiveGameWithPlayers(),
        selectedStarterPlayer: selectedPlayer.id,
        selectedStarterPosition: { ...selectedPosition },
        proposedStarter: starter
      };
    });

    it('should set live player to ON with currentPosition', () => {
      const newState: LiveState = live(currentState, {
        type: APPLY_STARTER
      });

      expect(newState.liveGame!.players).to.not.be.undefined;
      const newPlayers = newState.liveGame!.players!;

      const newPlayer = newPlayers.find(player => (player.id === selectedPlayer.id));
      expect(newPlayer).to.not.be.undefined;
      expect(newPlayer).to.deep.include({
        id: selectedPlayer.id,
        status: PlayerStatus.On,
        currentPosition: { ...selectedPosition }
      });

      expect(newState).not.to.equal(currentState);
      expect(newState.liveGame).not.to.equal(currentState.liveGame);
      expect(newPlayers).not.to.equal(currentState.liveGame!.players);
    });

    it('should clear selected starter player/position and proposed starter', () => {
      const newState = live(currentState, {
        type: APPLY_STARTER
      });

      expect(newState.selectedStarterPlayer).to.be.undefined;
      expect(newState.selectedStarterPosition).to.be.undefined;
      expect(newState.proposedStarter).to.be.undefined;

      expect(newState).not.to.equal(currentState);
    });

    it('should replace starter already in the position', () => {
      const existingStarter: LivePlayer = {
        ...getNewPlayer(),
        status: PlayerStatus.On,
        currentPosition: { ...selectedPosition }
      }
      currentState.liveGame!.players!.push(existingStarter);

      const newState: LiveState = live(currentState, {
        type: APPLY_STARTER
      });

      expect(newState.liveGame!.players).to.not.be.undefined;
      const newPlayers = newState.liveGame!.players!;

      const newPlayer = newPlayers.find(player => (player.id === selectedPlayer.id));
      expect(newPlayer).to.not.be.undefined;
      expect(newPlayer).to.deep.include({
        id: selectedPlayer.id,
        status: PlayerStatus.On,
        currentPosition: { ...selectedPosition }
      });

      const replacedPlayer = newPlayers.find(player => (player.id === existingStarter.id));
      expect(replacedPlayer).to.not.be.undefined;
      expect(replacedPlayer).to.include({
        id: existingStarter.id,
        status: PlayerStatus.Off,
      });
      expect(replacedPlayer!.currentPosition).to.be.undefined;

      expect(newState).not.to.equal(currentState);
      expect(newState.liveGame).not.to.equal(currentState.liveGame);
      expect(newPlayers).not.to.equal(currentState.liveGame!.players);
    });
  }); // describe('APPLY_STARTER')

  describe('CANCEL_STARTER', () => {
    let currentState: LiveState;
    let selectedPlayer: LivePlayer;
    let selectedPosition: Position;

    beforeEach(() => {
      selectedPlayer = getStoredPlayer();
      selectedPosition = { id: 'AM1', type: 'AM'};
      const starter: LivePlayer = {
        ...selectedPlayer,
        currentPosition: { ...selectedPosition }
      }

      currentState = {
        ...LIVE_INITIAL_STATE,
        liveGame: buildLiveGameWithPlayers(),
        selectedStarterPlayer: selectedPlayer.id,
        selectedStarterPosition: { ...selectedPosition },
        proposedStarter: starter
      };
    });

    it('should clear selected player/position and proposed starter', () => {
      const newState = live(currentState, {
        type: CANCEL_STARTER
      });

      expect(newState.selectedPlayer).to.be.undefined;
      expect(newState.selectedStarterPosition).to.be.undefined;
      expect(newState.proposedStarter).to.be.undefined;

      expect(newState).not.to.equal(currentState);
    });
  }); // describe('CANCEL_STARTER')

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
