import { FormationType, Position } from '@app/models/formation';
import { GameDetail, LiveGame, LivePlayer } from '@app/models/game';
import { PlayerStatus } from '@app/models/player';
import { live, LiveState } from '@app/reducers/live';
import { GET_GAME_SUCCESS, ROSTER_DONE, SET_FORMATION } from '@app/slices/game-types';
import { APPLY_STARTER, CANCEL_STARTER, SELECT_PLAYER, SELECT_STARTER, SELECT_STARTER_POSITION } from '@app/slices/live-types';
import { expect } from '@open-wc/testing';
import * as testlive from '../helpers/test-live-game-data';
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
  selectedOffPlayer: undefined,
  selectedOnPlayer: undefined,
};

function buildLiveGameWithPlayers(): LiveGame {
  return testlive.getLiveGame(testlive.getLivePlayers(18));
}

function buildLiveGameWithPlayersSelected(playerId: string, selected: boolean): LiveGame {
  const game = buildLiveGameWithPlayers();
  const selectedPlayer = game.players!.find(player => (player.id === playerId));
  selectedPlayer!.selected = selected;
  return game;
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
        liveGame: testlive.getLiveGame()
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
    let currentState: LiveState;
    let selectedStarter: LivePlayer;

    beforeEach(() => {
      selectedStarter = testlive.getLivePlayer();

      currentState = {
        ...LIVE_INITIAL_STATE,
        liveGame: buildLiveGameWithPlayers(),
      };
    });

    it('should only set selectedStarterPlayer with nothing selected', () => {
      expect(currentState.selectedStarterPlayer).to.be.undefined;

      const newState = live(currentState, {
        type: SELECT_STARTER,
        playerId: selectedStarter.id,
        selected: true
      });

      expect(newState).to.deep.include({
        liveGame: buildLiveGameWithPlayersSelected(selectedStarter.id, true),
        selectedStarterPlayer: selectedStarter.id,
        proposedStarter: undefined
      });

      expect(newState).not.to.equal(currentState);
    });

    it('should clear selectedStarterPlayer when de-selected', () => {
      const state: LiveState = {
        ...LIVE_INITIAL_STATE,
        liveGame: buildLiveGameWithPlayersSelected(selectedStarter.id, true),
        selectedStarterPlayer: selectedStarter.id
      };
      expect(state.liveGame!.players![0].selected).to.be.true;

      const newState = live(state, {
        type: SELECT_STARTER,
        playerId: selectedStarter.id,
        selected: false
      });

      expect(newState).to.deep.include({
        liveGame: buildLiveGameWithPlayersSelected(selectedStarter.id, false),
        selectedStarterPlayer: undefined,
        proposedStarter: undefined
      });

      expect(newState).not.to.equal(state);
    });

    it('should set selectedStarterPlayer and propose starter with position selected', () => {
      const selectedPosition: Position = { id: 'AM1', type: 'AM'};

      currentState.selectedStarterPosition = { ...selectedPosition };
      expect(currentState.selectedStarterPlayer).to.be.undefined;

      const newState = live(currentState, {
        type: SELECT_STARTER,
        playerId: selectedStarter.id,
        selected: true
      });

      const starter: LivePlayer = {
        ...selectedStarter,
        selected: true,
        currentPosition: { ...selectedPosition }
      }

      expect(newState).to.deep.include({
        liveGame: buildLiveGameWithPlayersSelected(selectedStarter.id, true),
        selectedStarterPosition: { ...selectedPosition },
        selectedStarterPlayer: selectedStarter.id,
        proposedStarter: starter
      });

      expect(newState).not.to.equal(currentState);
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
      const selectedPlayer = testlive.getLivePlayer();

      const state: LiveState = {
        ...LIVE_INITIAL_STATE,
        liveGame: buildLiveGameWithPlayersSelected(selectedPlayer.id, true),
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
        selected: true,
        currentPosition: { ...selectedPosition }
      }

      expect(newState).to.deep.include({
        liveGame: buildLiveGameWithPlayersSelected(selectedPlayer.id, true),
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
      selectedPlayer = testlive.getLivePlayer();
      selectedPosition = { id: 'AM1', type: 'AM'};
      const starter: LivePlayer = {
        ...selectedPlayer,
        currentPosition: { ...selectedPosition }
      }

      currentState = {
        ...LIVE_INITIAL_STATE,
        liveGame: buildLiveGameWithPlayersSelected(selectedPlayer.id, true),
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
      expect(newPlayer!.selected, 'Player should no longer be selected').to.not.be.ok;

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
      expect(newPlayer!.selected, 'Player should no longer be selected').to.not.be.ok;

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
      selectedPlayer = testlive.getLivePlayer();
      selectedPosition = { id: 'AM1', type: 'AM'};
      const starter: LivePlayer = {
        ...selectedPlayer,
        currentPosition: { ...selectedPosition }
      }

      currentState = {
        ...LIVE_INITIAL_STATE,
        liveGame: buildLiveGameWithPlayersSelected(selectedPlayer.id, true),
        selectedStarterPlayer: selectedPlayer.id,
        selectedStarterPosition: { ...selectedPosition },
        proposedStarter: starter
      };
    });

    it('should clear selected player/position and proposed starter', () => {
      const newState = live(currentState, {
        type: CANCEL_STARTER
      });

      const cancelledPlayer = newState.liveGame!.players!.find(player => (player.id === selectedPlayer.id));
      expect(cancelledPlayer).to.not.be.undefined;
      expect(cancelledPlayer!.selected, 'Player should no longer be selected').to.not.be.ok;

      expect(newState.selectedStarterPlayer).to.be.undefined;
      expect(newState.selectedStarterPosition).to.be.undefined;
      expect(newState.proposedStarter).to.be.undefined;

      expect(newState).not.to.equal(currentState);
    });
  }); // describe('CANCEL_STARTER')

  describe('SELECT_PLAYER', () => {
    const selectedPlayerId = testlive.getLivePlayer().id;
    let currentState: LiveState;
    let selectedPlayer: LivePlayer;

    beforeEach(() => {
      selectedPlayer = testlive.getLivePlayer();

      currentState = {
        ...LIVE_INITIAL_STATE,
        liveGame: buildLiveGameWithPlayers(),
      };
    });

    function setPlayerStatus(game: LiveGame, playerId: string, status: PlayerStatus) {
      const player = game.players!.find(p => (p.id === playerId));
      if (player) {
        player.status = status;
      }
    }

    function buildLiveGameForSelected(status: PlayerStatus, selected: boolean): LiveGame {
      const game = buildLiveGameWithPlayers();
      const player = game.players!.find(p => (p.id === selectedPlayerId));
      if (player) {
        player.status = status;
        player.selected = selected;
      }
      return game;
    }

    function setTrackedPlayer(state: LiveState, status: PlayerStatus) {
      switch (status) {
        case PlayerStatus.Off:
          state.selectedOffPlayer = selectedPlayerId;
          break;
        case PlayerStatus.On:
          state.selectedOnPlayer = selectedPlayerId;
          break;
      }
    }

    const trackedStatuses = [PlayerStatus.On, PlayerStatus.Off];
    const flagOnlyStatuses = [PlayerStatus.Next, PlayerStatus.Out];

    it('All statuses are covered by selected tests', () => {
      expect(trackedStatuses.length + flagOnlyStatuses.length, 'Selected tests for every status').to.equal(Object.values(PlayerStatus).length);
    });

    for (const status of trackedStatuses) {

      describe(`Status: ${status}`, () => {
        beforeEach(async () => {
          setPlayerStatus(currentState.liveGame!, selectedPlayer.id, status);
        });

        it(`should only set selectedPlayer with no other player selected`, () => {
          const newState = live(currentState, {
            type: SELECT_PLAYER,
            playerId: selectedPlayer.id,
            selected: true
          });

          const expectedState: LiveState = {
            ...LIVE_INITIAL_STATE,
            liveGame: buildLiveGameForSelected(status, true),
          };
          setTrackedPlayer(expectedState, status);

          expect(newState).to.deep.include(expectedState);

          expect(newState).not.to.equal(currentState);
        });

        it(`should clear selectedPlayer when de-selected`, () => {
          const state: LiveState = {
            ...LIVE_INITIAL_STATE,
            liveGame: buildLiveGameForSelected(status, true)
          };
          setTrackedPlayer(state, status);

          const newState = live(state, {
            type: SELECT_PLAYER,
            playerId: selectedPlayer.id,
            selected: false
          });

          // Uses LIVE_INITIAL_STATE to set all the tracking properties to undefined.
          expect(newState).to.deep.include({
            ...LIVE_INITIAL_STATE,
            liveGame: buildLiveGameForSelected(status, false),
          });

          expect(newState).not.to.equal(state);
        });
      });
    } // for (const status of trackedStatuses)

    for (const status of flagOnlyStatuses) {

      describe(`Status: ${status}`, () => {
        beforeEach(async () => {
          setPlayerStatus(currentState.liveGame!, selectedPlayer.id, status);
        });

        it(`should select individual player only`, () => {
          const newState = live(currentState, {
            type: SELECT_PLAYER,
            playerId: selectedPlayer.id,
            selected: true
          });

          const expectedGame = buildLiveGameForSelected(status, true);

          expect(newState).to.deep.include({
            liveGame: expectedGame,
          });
          expect(newState.selectedOffPlayer).to.be.undefined;
          expect(newState.selectedOnPlayer).to.be.undefined;

          expect(newState).not.to.equal(currentState);
        });

        it(`should de-select individual player only`, () => {
          currentState.selectedOffPlayer = 'other off';
          currentState.selectedOnPlayer = 'other on';

          const newState = live(currentState, {
            type: SELECT_PLAYER,
            playerId: selectedPlayer.id,
            selected: false
          });

          const expectedGame = buildLiveGameForSelected(status, false);

          expect(newState).to.deep.include({
            liveGame: expectedGame,
            selectedOffPlayer: 'other off',
            selectedOnPlayer: 'other on',
          });

          expect(newState).not.to.equal(currentState);
        });
      });
    } // for (const status of flagOnlyStatuses)
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
