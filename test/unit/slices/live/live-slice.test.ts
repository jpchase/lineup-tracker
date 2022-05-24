import { TimerData } from '@app/models/clock';
import { FormationType, Position } from '@app/models/formation';
import { GameDetail, GameStatus, LiveGame, LivePlayer, SetupStatus, SetupSteps, SetupTask } from '@app/models/game';
import { getPlayer, PeriodStatus } from '@app/models/live';
import { PlayerStatus } from '@app/models/player';
import { PlayerTimeTrackerMap } from '@app/models/shift.js';
import { GET_GAME_SUCCESS } from '@app/slices/game-types';
import { LIVE_HYDRATE } from '@app/slices/live-types';
import { ClockState, startPeriod } from '@app/slices/live/clock-slice';
import {
  applyPendingSubs, applyStarter, cancelStarter, cancelSub, completeRoster, confirmSub,
  discardPendingSubs, endPeriod, formationSelected, gameCompleted, gameSetupCompleted, live, LiveGameState, LiveState,
  selectPlayer, selectStarter, selectStarterPosition, startersCompleted, startGamePeriod
} from '@app/slices/live/live-slice';
import { RootState } from '@app/store.js';
import { expect } from '@open-wc/testing';
import sinon from 'sinon';
import { buildRunningTimer, buildStoppedTimer } from '../../helpers/test-clock-data.js';
import * as testlive from '../../helpers/test-live-game-data.js';
import {
  buildLivePlayers,
  buildRoster,
  getFakeAction,
  getNewGame,
  getNewPlayer,
  getStoredGame,
  getStoredPlayer,
  OTHER_STORED_GAME_ID
} from '../../helpers/test_data.js';
import { buildClockWithTimer, CLOCK_INITIAL_STATE } from './clock-slice.test.js';
import { SHIFT_INITIAL_STATE } from './shift-slice.test.js';

const LIVE_INITIAL_STATE: LiveGameState = {
  gameId: '',
  liveGame: undefined,
  selectedStarterPlayer: undefined,
  selectedStarterPosition: undefined,
  proposedStarter: undefined,
  selectedOffPlayer: undefined,
  selectedOnPlayer: undefined,
  proposedSub: undefined,
};

const INITIAL_OVERALL_STATE: LiveState = {
  hydrated: false,
  ...LIVE_INITIAL_STATE,
  clock: {
    ...CLOCK_INITIAL_STATE
  },
  shift: {
    ...SHIFT_INITIAL_STATE
  }
};

function buildLiveGameWithPlayers(): LiveGame {
  return testlive.getLiveGameWithPlayers();
}

function buildLiveGameWithPlayersSelected(playerId: string, selected: boolean): LiveGame {
  const game = buildLiveGameWithPlayers();
  const selectedPlayer = game.players!.find(player => (player.id === playerId));
  selectedPlayer!.selected = selected;
  return game;
}

function buildLiveGameWithSetupTasks(players?: LivePlayer[], tasks?: SetupTask[]): LiveGame {
  const game = testlive.getLiveGame(players);
  if (tasks) {
    game.setupTasks = tasks;
  }
  return game;
}

function selectPlayers(game: LiveGame, playerIds: string[], selected: boolean) {
  for (const player of game.players!) {
    if (playerIds.includes(player.id)) {
      player.selected = selected;
    }
  }
}

function buildClock(timer?: TimerData): ClockState {
  return {
    ...CLOCK_INITIAL_STATE,
    timer
  }
}

function buildSetupTasks(): SetupTask[] {
  return [
    {
      step: SetupSteps.Formation,
      status: SetupStatus.Active
    },
    {
      step: SetupSteps.Roster,
      status: SetupStatus.Pending
    },
    {
      step: SetupSteps.Captains,
      status: SetupStatus.Pending
    },
    {
      step: SetupSteps.Starters,
      status: SetupStatus.Pending
    }
  ]
}

function mockGetState(currentState: LiveState) {
  return sinon.fake(() => {
    const mockState: RootState = {
      live: currentState
    };
    return mockState;
  });
}

describe('Live reducer', () => {

  it('should return the initial state', () => {
    expect(
      live(INITIAL_OVERALL_STATE, getFakeAction())
    ).to.equal(INITIAL_OVERALL_STATE);
  });

  describe('LIVE_HYDRATE', () => {
    let currentState: LiveState = INITIAL_OVERALL_STATE;

    beforeEach(() => {
      currentState = {
        ...INITIAL_OVERALL_STATE,
      };
    });

    it('should set state to given cached data', () => {
      const inputGame = buildLiveGameWithPlayers();
      const inputClock = {};

      const newState = live(currentState, {
        type: LIVE_HYDRATE,
        gameId: inputGame.id,
        game: inputGame,
        clock: inputClock
      });

      const expectedGame: LiveGame = {
        ...inputGame,
      };
      const expectedClock = {
        ...inputClock
      }

      expect(newState).to.deep.include({
        hydrated: true,
        gameId: inputGame.id,
        liveGame: expectedGame,
        clock: expectedClock
      });

      expect(newState).not.to.equal(currentState);
      expect(newState.liveGame).not.to.equal(currentState.liveGame);
      expect(newState.clock).not.to.equal(currentState.clock);
    });

    it('should set hydrated flag when cached values are missing', () => {
      const newState = live(currentState, {
        type: LIVE_HYDRATE,
      });

      expect(newState).to.include({
        hydrated: true,
      });
      expect(newState.gameId, 'gameId should not be set').to.not.be.ok;
      expect(newState.liveGame).to.be.undefined;
      expect(newState.clock).to.equal(currentState.clock);

      expect(newState).not.to.equal(currentState);
    });

    it('should ignored cached values when hydrated flag already set', () => {
      const currentGame = buildLiveGameWithPlayers();
      const currentClock = buildClock(buildRunningTimer());
      currentState.gameId = currentGame.id;
      currentState.liveGame = currentGame;
      currentState.clock = currentClock;
      currentState.hydrated = true;

      const inputGame = buildLiveGameWithPlayers();
      inputGame.id = OTHER_STORED_GAME_ID;

      expect(inputGame.id).not.to.equal(currentGame.id);

      const newState = live(currentState, {
        type: LIVE_HYDRATE,
        gameId: inputGame.id,
        game: inputGame,
        clock: buildClock(buildStoppedTimer()),
      });

      expect(newState).to.include({
        hydrated: true,
        liveGame: currentGame,
        clock: currentClock,
      });
      expect(newState.liveGame).to.equal(currentState.liveGame);
      expect(newState.clock).to.equal(currentState.clock);
    });
  }); // describe('LIVE_HYDRATE')

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

      const expectedGame = buildLiveGameWithSetupTasks(
        buildLivePlayers([getStoredPlayer()]), buildSetupTasks()
      );

      currentState.gameId = inputGame.id;
      const newState = live(currentState, {
        type: GET_GAME_SUCCESS,
        game: inputGame
      });

      expect(newState).to.deep.include({
        liveGame: expectedGame,
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

      const expectedGame = buildLiveGameWithSetupTasks([], buildSetupTasks());
      expectedGame.id = currentGame.id;

      currentState.gameId = inputGame.id;
      const newState = live(currentState, {
        type: GET_GAME_SUCCESS,
        game: inputGame
      });

      expect(newState).to.deep.include({
        liveGame: expectedGame,
      });

      expect(newState).not.to.equal(currentState);
      expect(newState.liveGame).not.to.equal(currentState.liveGame);
    });

  }); // describe('GET_GAME_SUCCESS')

  describe('live/gameSetupCompleted', () => {

    it('should set status to Start and clear setup tasks and init shift trackers', () => {
      const rosterPlayers = testlive.getLivePlayers(18);
      const completedTasks = buildSetupTasks();
      completedTasks.forEach(task => { task.status = SetupStatus.Complete; })
      const currentGame = buildLiveGameWithSetupTasks(rosterPlayers, completedTasks);

      const expectedGame = buildLiveGameWithSetupTasks(rosterPlayers, undefined);
      expectedGame.status = GameStatus.Start;
      delete expectedGame.setupTasks;

      const expectedMap = new PlayerTimeTrackerMap();
      expectedMap.initialize(rosterPlayers);

      const state: LiveState = {
        ...LIVE_INITIAL_STATE,
        liveGame: currentGame
      };

      const newState = live(state, gameSetupCompleted(currentGame.id, currentGame));

      expect(newState).to.deep.include({
        liveGame: expectedGame,
        shift: {
          players: expectedMap.toJSON()
        }
      });

      expect(newState).not.to.equal(state);
      expect(newState.liveGame).not.to.equal(state.liveGame);
    });
  }); // describe('live/gameSetupCompleted')

  describe('live/completeRoster', () => {

    it('should update setup tasks and init live players from roster', () => {
      const rosterPlayers = testlive.getLivePlayers(18);
      const updatedTasks = buildSetupTasks();
      updatedTasks[SetupSteps.Roster].status = SetupStatus.Complete;
      updatedTasks[SetupSteps.Captains].status = SetupStatus.Active;
      const expectedGame = buildLiveGameWithSetupTasks(rosterPlayers, updatedTasks);

      const state: LiveState = {
        ...LIVE_INITIAL_STATE,
        liveGame: testlive.getLiveGame()
      };
      expect(state.liveGame).to.not.be.undefined;
      expect(state.liveGame!.players, 'players should be empty').to.deep.equal([]);

      const newState = live(state, completeRoster(buildRoster(rosterPlayers)));

      expect(newState).to.deep.include({
        liveGame: expectedGame
      });

      expect(newState).not.to.equal(state);
      expect(newState.liveGame).not.to.equal(state.liveGame);
    });
  }); // describe('live/completeRoster')

  describe('live/formationSelected', () => {

    it('should set formation type and update setup tasks to mark formation complete', () => {
      const updatedTasks = buildSetupTasks();
      updatedTasks[SetupSteps.Formation].status = SetupStatus.Complete;
      updatedTasks[SetupSteps.Roster].status = SetupStatus.Active;
      const expectedGame = buildLiveGameWithSetupTasks(undefined, updatedTasks);
      expectedGame.formation = { type: FormationType.F4_3_3 };
      delete expectedGame.players;

      const state: LiveState = {
        ...LIVE_INITIAL_STATE,
        liveGame: {
          id: expectedGame.id,
          status: GameStatus.New
        }
      };

      const newState = live(state, formationSelected(FormationType.F4_3_3));

      expect(newState).to.deep.include({
        liveGame: expectedGame,
      });

      expect(newState).not.to.equal(state);
      expect(newState.liveGame).not.to.equal(state.liveGame);
    });

    it('should do nothing if formation input is missing', () => {
      const state = {
        ...INITIAL_OVERALL_STATE,
        liveGame: buildLiveGameWithPlayers(),
      };
      const newState = live(state, formationSelected(undefined as any));

      expect(newState).to.equal(state);
    });
  }); // describe('live/formationSelected')

  describe('live/selectStarter', () => {
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

      const newState = live(currentState, selectStarter(selectedStarter.id, true));

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

      const newState = live(state, selectStarter(selectedStarter.id, false));

      expect(newState).to.deep.include({
        liveGame: buildLiveGameWithPlayersSelected(selectedStarter.id, false),
        selectedStarterPlayer: undefined,
        proposedStarter: undefined
      });

      expect(newState).not.to.equal(state);
    });

    it('should set selectedStarterPlayer and propose starter with position selected', () => {
      const selectedPosition: Position = { id: 'AM1', type: 'AM' };

      currentState.selectedStarterPosition = { ...selectedPosition };
      expect(currentState.selectedStarterPlayer).to.be.undefined;

      const newState = live(currentState, selectStarter(selectedStarter.id, true));

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
  }); // describe('live/selectStarter')

  describe('live/selectStarterPosition', () => {

    it('should only set selectedPosition with nothing selected', () => {
      const state: LiveState = {
        ...LIVE_INITIAL_STATE,
        liveGame: buildLiveGameWithPlayers()
      };
      expect(state.selectedStarterPosition).to.be.undefined;

      const selectedPosition: Position = { id: 'AM1', type: 'AM' };
      const newState = live(state, selectStarterPosition(selectedPosition));

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

      const selectedPosition: Position = { id: 'AM1', type: 'AM' };
      const newState = live(state, selectStarterPosition(selectedPosition));

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
  }); // describe('live/selectStarterPosition')

  describe('live/applyStarter', () => {
    let currentState: LiveState;
    let selectedPlayer: LivePlayer;
    let selectedPosition: Position;

    beforeEach(() => {
      selectedPlayer = testlive.getLivePlayer();
      selectedPosition = { id: 'AM1', type: 'AM' };
      const starter: LivePlayer = {
        ...selectedPlayer,
        currentPosition: { ...selectedPosition }
      }

      currentState = {
        ...INITIAL_OVERALL_STATE,
        liveGame: buildLiveGameWithPlayersSelected(selectedPlayer.id, true),
        selectedStarterPlayer: selectedPlayer.id,
        selectedStarterPosition: { ...selectedPosition },
        proposedStarter: starter
      };
    });

    it('should set live player to ON with currentPosition', () => {
      const newState: LiveState = live(currentState, applyStarter());

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
      const newState = live(currentState, applyStarter());

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

      const newState: LiveState = live(currentState, applyStarter());

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

    it('should do nothing if proposed starter is missing', () => {
      currentState = {
        ...INITIAL_OVERALL_STATE,
        liveGame: buildLiveGameWithPlayersSelected(selectedPlayer.id, true),
      };
      const newState = live(currentState, applyStarter());

      expect(newState).to.equal(currentState);
    });
  }); // describe('live/applyStarter')

  describe('live/cancelStarter', () => {
    let currentState: LiveState;
    let selectedPlayer: LivePlayer;
    let selectedPosition: Position;

    beforeEach(() => {
      selectedPlayer = testlive.getLivePlayer();
      selectedPosition = { id: 'AM1', type: 'AM' };
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
      const newState = live(currentState, cancelStarter());

      const cancelledPlayer = newState.liveGame!.players!.find(player => (player.id === selectedPlayer.id));
      expect(cancelledPlayer).to.not.be.undefined;
      expect(cancelledPlayer!.selected, 'Player should no longer be selected').to.not.be.ok;

      expect(newState.selectedStarterPlayer).to.be.undefined;
      expect(newState.selectedStarterPosition).to.be.undefined;
      expect(newState.proposedStarter).to.be.undefined;

      expect(newState).not.to.equal(currentState);
    });

    it('should do nothing if proposed starter is missing', () => {
      currentState = {
        ...INITIAL_OVERALL_STATE,
        liveGame: buildLiveGameWithPlayersSelected(selectedPlayer.id, true),
      };
      const newState = live(currentState, cancelStarter());

      expect(newState).to.equal(currentState);
    });
  }); // describe('live/cancelStarter')

  describe('live/startersCompleted', () => {

    it('should update setup tasks to mark starters complete', () => {
      const state: LiveState = {
        ...LIVE_INITIAL_STATE,
        liveGame: buildLiveGameWithPlayers()
      };
      const updatedTasks = buildSetupTasks();
      updatedTasks[SetupSteps.Starters].status = SetupStatus.Complete;
      const expectedGame = buildLiveGameWithSetupTasks(state.liveGame?.players, updatedTasks);

      const newState = live(state, startersCompleted());

      expect(newState).to.deep.include({
        liveGame: expectedGame,
      });

      expect(newState).not.to.equal(state);
      expect(newState.liveGame).not.to.equal(state.liveGame);
    });
  }); // describe('live/startersCompleted')

  describe('live/selectPlayer', () => {
    const selectedPlayerId = 'P0';
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

    function buildLiveGameForSelected(status: PlayerStatus, selected: boolean, playerId?: string): LiveGame {
      const game = buildLiveGameWithPlayers();
      const lookupId = playerId || selectedPlayerId;
      const player = game.players!.find(p => (p.id === lookupId));
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
          const newState = live(currentState, selectPlayer(selectedPlayer.id, true));

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

          const newState = live(state, selectPlayer(selectedPlayer.id, false));

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
          const newState = live(currentState, selectPlayer(selectedPlayer.id, true));

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

          const newState = live(currentState, selectPlayer(selectedPlayer.id, false));

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

    describe('Propose sub', () => {
      const offPlayerId = 'P1';
      const onPlayerId = 'P2';
      let offPlayer: LivePlayer;
      let onPlayer: LivePlayer;

      beforeEach(async () => {
        offPlayer = currentState.liveGame!.players!.find(p => (p.id === offPlayerId))!;
        offPlayer.status = PlayerStatus.Off;
        onPlayer = currentState.liveGame!.players!.find(p => (p.id === onPlayerId))!;
        onPlayer.status = PlayerStatus.On;
      });

      it(`should propose sub when OFF player selected after ON player already selected`, () => {
        // Sets an already selected ON player.
        currentState.selectedOnPlayer = onPlayerId;
        onPlayer.selected = true;

        const newState = live(currentState, selectPlayer(offPlayerId, true));

        expect(newState.proposedSub).to.deep.include({
          ...offPlayer,
          selected: true,
          currentPosition: onPlayer.currentPosition,
          replaces: onPlayerId
        });

        expect(newState).not.to.equal(currentState);
      });

      it(`should propose sub when ON player selected after OFF player already selected`, () => {
        // Sets an already selected OFF player.
        currentState.selectedOffPlayer = offPlayerId;
        offPlayer.selected = true;

        const newState = live(currentState, selectPlayer(onPlayerId, true));

        expect(newState.proposedSub).to.deep.include({
          ...offPlayer,
          selected: true,
          currentPosition: onPlayer.currentPosition,
          replaces: onPlayerId
        });

        expect(newState).not.to.equal(currentState);
      });
    }); // describe('Propose sub')
  }); // describe('live/selectPlayer')

  describe('Proposed Subs', () => {
    const offPlayerId = 'P1';
    const onPlayerId = 'P2';
    let offPlayer: LivePlayer;
    let onPlayer: LivePlayer;
    let currentState: LiveState;

    beforeEach(async () => {
      const game = buildLiveGameWithPlayers();
      offPlayer = game.players!.find(p => (p.id === offPlayerId))!;
      offPlayer.status = PlayerStatus.Off;
      offPlayer.selected = true;
      onPlayer = game.players!.find(p => (p.id === onPlayerId))!;
      onPlayer.status = PlayerStatus.On;
      onPlayer.selected = true;

      const sub: LivePlayer = {
        ...offPlayer,
        currentPosition: { ...onPlayer.currentPosition! },
        replaces: onPlayer.id
      }

      currentState = {
        ...INITIAL_OVERALL_STATE,
        liveGame: game,
        selectedOffPlayer: offPlayerId,
        selectedOnPlayer: onPlayerId,
        proposedSub: sub
      };
    });

    describe('live/confirmSub', () => {

      it('should set off player to NEXT with currentPosition', () => {
        const newState: LiveState = live(currentState, confirmSub());

        expect(newState.liveGame!.players).to.not.be.undefined;
        const newPlayers = newState.liveGame!.players!;

        const newPlayer = newPlayers.find(player => (player.id === offPlayerId));
        expect(newPlayer).to.not.be.undefined;
        expect(newPlayer).to.deep.include({
          status: PlayerStatus.Next,
          currentPosition: { ...onPlayer.currentPosition },
          replaces: onPlayerId
        });
        expect(newPlayer!.selected, 'Off player should no longer be selected').to.not.be.ok;

        expect(newState).not.to.equal(currentState);
        expect(newState.liveGame).not.to.equal(currentState.liveGame);
        expect(newPlayers).not.to.equal(currentState.liveGame!.players);
      });

      it('should clear selected players and proposed sub', () => {
        const newState = live(currentState, confirmSub());

        const newPlayer = newState.liveGame!.players!.find(player => (player.id === onPlayerId));
        expect(newPlayer).to.not.be.undefined;
        expect(newPlayer!.selected, 'On player should no longer be selected').to.not.be.ok;

        expect(newState.selectedOffPlayer).to.be.undefined;
        expect(newState.selectedOnPlayer).to.be.undefined;
        expect(newState.proposedSub).to.be.undefined;

        expect(newState).not.to.equal(currentState);
      });

      it('should do nothing if proposed sub is missing', () => {
        currentState = {
          ...INITIAL_OVERALL_STATE,
          liveGame: buildLiveGameWithPlayers(),
        };
        const newState = live(currentState, confirmSub());

        expect(newState).to.equal(currentState);
      });

    }); // describe('live/confirmSub')

    describe('live/cancelSub', () => {

      it('should clear selected players and proposed sub', () => {
        const newState = live(currentState, cancelSub());

        const cancelledOffPlayer = newState.liveGame!.players!.find(player => (player.id === offPlayerId));
        expect(cancelledOffPlayer).to.not.be.undefined;
        expect(cancelledOffPlayer!.selected, 'Off player should no longer be selected').to.not.be.ok;

        const cancelledOnPlayer = newState.liveGame!.players!.find(player => (player.id === onPlayerId));
        expect(cancelledOnPlayer).to.not.be.undefined;
        expect(cancelledOnPlayer!.selected, 'On player should no longer be selected').to.not.be.ok;

        expect(newState.selectedOffPlayer).to.be.undefined;
        expect(newState.selectedOnPlayer).to.be.undefined;
        expect(newState.proposedSub).to.be.undefined;

        expect(newState).not.to.equal(currentState);
      });

      it('should do nothing if proposed sub is missing', () => {
        currentState = {
          ...INITIAL_OVERALL_STATE,
          liveGame: buildLiveGameWithPlayers(),
        };
        const newState = live(currentState, cancelSub());

        expect(newState).to.equal(currentState);
      });

    }); // describe('live/cancelSub')
  }); // describe('Proposed Subs')

  describe('Next Subs', () => {
    const nextPlayerIds = ['P1', 'P2', 'P3'];
    const onPlayerIds = ['P4', 'P5', 'P6'];
    let currentState: LiveState;

    beforeEach(async () => {
      const game = buildLiveGameWithPlayers();

      for (let i = 0; i < nextPlayerIds.length; i++) {
        const nextId = nextPlayerIds[i];
        const nextPlayer = getPlayer(game, nextId)!;
        const onId = onPlayerIds[i];
        const onPlayer = getPlayer(game, onId)!;

        onPlayer.status = PlayerStatus.On;

        nextPlayer.status = PlayerStatus.Next;
        nextPlayer.currentPosition = { ...onPlayer.currentPosition! };
        nextPlayer.replaces = onPlayer.id;
      }

      currentState = {
        ...LIVE_INITIAL_STATE,
        liveGame: game
      };
    });

    function getIdsByStatus(game: LiveGame) {
      let nextIds = [];
      let offIds = [];
      let onIds = [];
      for (const newPlayer of game.players!) {
        switch (newPlayer.status) {
          case PlayerStatus.Next:
            nextIds.push(newPlayer.id);
            break;

          case PlayerStatus.Off:
            offIds.push(newPlayer.id);
            break;

          case PlayerStatus.On:
            onIds.push(newPlayer.id);
            break;
        }
      }
      return {
        [PlayerStatus.Next]: nextIds,
        [PlayerStatus.Off]: offIds,
        [PlayerStatus.On]: onIds
      };
    }

    describe('live/applyPendingSubs', () => {

      it('should sub all next players, when not selectedOnly', () => {
        const newState: LiveState = live(currentState, applyPendingSubs());

        const newIds = getIdsByStatus(newState.liveGame!);

        expect(newIds[PlayerStatus.On]).to.contain.members(nextPlayerIds, 'All next players should now be on');
        expect(newIds[PlayerStatus.Off]).to.contain.members(onPlayerIds, 'All replaced players should now be off');
        expect(newIds[PlayerStatus.Next], 'No next players should remain').to.be.empty;

        expect(newState).not.to.equal(currentState);
        expect(newState.liveGame).not.to.equal(currentState.liveGame);
        expect(newState.liveGame!.players).not.to.equal(currentState.liveGame!.players);
      });

      it('should sub only selected next players', () => {
        // Apply 2 of the 3 pending subs (> 1 to test it will actually sub multiple, not just first)
        const nowPlayingIds = ['P1', 'P3'];
        const stillNextIds = ['P2'];
        const subbedOffIds = ['P4', 'P6'];
        const stillOnIds = ['P5'];

        selectPlayers(currentState.liveGame!, nowPlayingIds, true);

        const newState = live(currentState, applyPendingSubs(/* selectedOnly */ true));

        const newIds = getIdsByStatus(newState.liveGame!);

        expect(newIds[PlayerStatus.On]).to.contain.members(nowPlayingIds, 'Specified next players should now be on');
        expect(newIds[PlayerStatus.On]).to.contain.members(stillOnIds, 'Players not yet replaced should still be on');
        expect(newIds[PlayerStatus.Off]).to.contain.members(subbedOffIds, 'Specified replaced players should now be off');
        expect(newIds[PlayerStatus.Next]).to.have.members(stillNextIds, 'Next players not specified should remain');

        for (const onId of nowPlayingIds) {
          const player = getPlayer(newState.liveGame!, onId)!;

          expect(player.replaces, `Now playing [${player.id}], the replaces property should be cleared`).to.not.be.ok;
          expect(player.currentPosition, `Now playing [${player.id}], the currentPosition property should still be set`).to.be.ok;
          expect(player.selected, `Now playing [${player.id}], the selected property should be false`).to.be.false;
        }

        for (const nextId of stillNextIds) {
          const player = getPlayer(newState.liveGame!, nextId)!;

          expect(player.replaces).to.equal('P5', `Still next [${player.id}], the replaces property should still be set`);
          expect(player.currentPosition, `Still next [${player.id}], the currentPosition property should still be set`).to.be.ok;
        }

        for (const offId of subbedOffIds) {
          const player = getPlayer(newState.liveGame!, offId)!;

          expect(player.currentPosition, `Now off [${player.id}], the currentPosition property should be cleared`).to.not.be.ok;
          expect(player.selected, `Now off [${player.id}], the selected property should be false`).to.not.be.ok;
        }

        expect(newState).not.to.equal(currentState);
      });

      it('should clear selected, when subbing all players (not selectedOnly)', () => {
        const nowPlayingIds = ['P1', 'P2', 'P3'];
        const subbedOffIds = ['P4', 'P5', 'P6'];

        selectPlayers(currentState.liveGame!, ['P1', 'P3'], true);
        selectPlayers(currentState.liveGame!, ['P4', 'P6'], true);

        const newState: LiveState = live(currentState, applyPendingSubs(/* selectedOnly */ false));

        const newIds = getIdsByStatus(newState.liveGame!);

        expect(newIds[PlayerStatus.On]).to.contain.members(nowPlayingIds, 'All next players should now be on');
        expect(newIds[PlayerStatus.Off]).to.contain.members(subbedOffIds, 'All replaced players should now be off');

        for (const onId of nowPlayingIds) {
          const player = getPlayer(newState.liveGame!, onId)!;

          expect(player.selected, `Now playing [${player.id}], the selected property should be false`).to.be.false;
        }

        for (const offId of subbedOffIds) {
          const player = getPlayer(newState.liveGame!, offId)!;

          expect(player.selected, `Now off [${player.id}], the selected property should be false`).to.not.be.ok;
        }

        expect(newState).not.to.equal(currentState);
      });

    }); // describe('live/applyPendingSubs')

    describe('live/discardPendingSubs', () => {

      it('should reset all next players to off, when not selectedOnly', () => {
        const nowOffIds = ['P1', 'P2', 'P3'];
        const stillOnIds = ['P4', 'P5', 'P6'];

        const newState = live(currentState, discardPendingSubs());

        const newIds = getIdsByStatus(newState.liveGame!);

        expect(newIds[PlayerStatus.On]).to.contain.members(stillOnIds, 'All to be replaced players should still be on');
        expect(newIds[PlayerStatus.Off]).to.contain.members(nowOffIds, 'All next players should now be off');
        expect(newIds[PlayerStatus.Next], 'No next players should remain').to.be.empty;

        expect(newState).not.to.equal(currentState);
        expect(newState.liveGame).not.to.equal(currentState.liveGame);
        expect(newState.liveGame!.players).not.to.equal(currentState.liveGame!.players);
      });

      it('should reset only selected next players to off', () => {
        // Discard 2 of the 3 pending subs (> 1 to test it will actually sub multiple, not just first)
        const nowOffIds = ['P1', 'P3'];
        const stillNextIds = ['P2'];
        const stillOnIds = ['P4', 'P5', 'P6'];

        selectPlayers(currentState.liveGame!, nowOffIds, true);

        const newState = live(currentState, discardPendingSubs(/* selectedOnly */ true));

        const newIds = getIdsByStatus(newState.liveGame!);

        expect(newIds[PlayerStatus.On]).to.contain.members(stillOnIds, 'All to be replaced players should still be on');
        expect(newIds[PlayerStatus.Off]).to.contain.members(nowOffIds, 'Specified next players should now be off');
        expect(newIds[PlayerStatus.Next]).to.have.members(stillNextIds, 'Next players not specified should remain');

        for (const nextId of stillNextIds) {
          const player = getPlayer(newState.liveGame!, nextId)!;

          expect(player.replaces).to.equal('P5', `Still next [${player.id}], the replaces property should still be set`);
          expect(player.currentPosition, `Still next [${player.id}], the currentPosition property should still be set`).to.be.ok;
        }

        for (const offId of nowOffIds) {
          const player = getPlayer(newState.liveGame!, offId)!;

          expect(player.replaces, `Now off [${player.id}], the replaces property should be cleared`).to.not.be.ok;
          expect(player.currentPosition, `Now off [${player.id}], the currentPosition property should be cleared`).to.not.be.ok;
          expect(player.selected, `Now off [${player.id}], the selected property should be false`).to.not.be.ok;
        }

        expect(newState).not.to.equal(currentState);
      });

    }); // describe('live/discardPendingSubs')
  }); // describe('Next Subs')

  describe('Clock', () => {
    const startTime = new Date(2016, 0, 1, 14, 0, 0).getTime();
    let currentState: LiveState;
    let fakeClock: sinon.SinonFakeTimers;

    beforeEach(() => {
      fakeClock = sinon.useFakeTimers({ now: startTime });
      currentState = {
        ...INITIAL_OVERALL_STATE,
        liveGame: buildLiveGameWithPlayers(),
        clock: buildClockWithTimer(),
      };
    });

    afterEach(async () => {
      sinon.restore();
      if (fakeClock) {
        fakeClock.restore();
      }
    });

    const startAllowedStatuses = [GameStatus.Start, GameStatus.Break];
    const endAllowedStatuses = [GameStatus.Live];
    const otherStatuses = [GameStatus.New, GameStatus.Done];

    it('All statuses are covered by start/end period tests', () => {
      expect(startAllowedStatuses.length + endAllowedStatuses.length + otherStatuses.length,
        'Start/end period tests for every status').to.equal(Object.values(GameStatus).length);
    });

    describe('clock/startPeriod', () => {
      for (const status of startAllowedStatuses) {

        it(`should dispatch action allow start = true when game is in ${status} status`, async () => {
          currentState.liveGame!.status = status;

          const dispatchMock = sinon.stub();
          const getStateMock = mockGetState(currentState);

          await startGamePeriod()(dispatchMock, getStateMock, undefined);

          // The request action is dispatched, regardless.
          expect(dispatchMock).to.have.callCount(1);

          expect(dispatchMock.lastCall).to.have.been.calledWith({
            type: startPeriod.type,
            payload: {
              gameAllowsStart: true
            }
          });
        });

        it(`should change game status from ${status} to Live`, () => {
          currentState.liveGame!.status = status;

          const newState = live(currentState, startPeriod(/*gameAllowsStart=*/true));

          expect(newState.liveGame?.status).to.equal(GameStatus.Live);
          expect(newState.clock?.periodStatus).to.equal(PeriodStatus.Running);
          expect(newState).not.to.equal(currentState);
        });
      }

      const startInvalidStatuses = endAllowedStatuses.concat(otherStatuses);

      for (const status of startInvalidStatuses) {

        it(`should dispatch action allow start = false when game is in ${status} status`, async () => {
          currentState.liveGame!.status = status;

          const dispatchMock = sinon.stub();
          const getStateMock = mockGetState(currentState);

          await startGamePeriod()(dispatchMock, getStateMock, undefined);

          // The request action is dispatched, regardless.
          expect(dispatchMock).to.have.callCount(1);

          expect(dispatchMock.lastCall).to.have.been.calledWith({
            type: startPeriod.type,
            payload: {
              gameAllowsStart: false
            }
          });
        });

        it(`should do nothing when game is in ${status} status`, () => {
          currentState.liveGame!.status = status;

          const newState = live(currentState, startPeriod(/*gameAllowsStart=*/false));

          expect(newState.liveGame?.status).to.equal(status);
          expect(newState).to.equal(currentState);
        });
      }
    });  // describe('clock/startPeriod')

    describe('clock/endPeriod', () => {

      it(`should change game status to Break for first period (first half)`, () => {
        currentState.liveGame!.status = GameStatus.Live;
        currentState.clock!.currentPeriod = 1;
        currentState.clock!.periodStatus = PeriodStatus.Running;

        const newState = live(currentState, endPeriod());

        expect(newState.liveGame?.status).to.equal(GameStatus.Break);
        expect(newState.clock?.periodStatus).to.equal(PeriodStatus.Pending);
        expect(newState).not.to.equal(currentState);
      });

      it(`should change game status to Break for middle period`, () => {
        currentState.liveGame!.status = GameStatus.Live;
        currentState.clock!.totalPeriods = 3;
        currentState.clock!.currentPeriod = 2;
        currentState.clock!.periodStatus = PeriodStatus.Running;

        const newState = live(currentState, endPeriod());

        expect(newState.liveGame?.status).to.equal(GameStatus.Break);
        expect(newState).not.to.equal(currentState);
      });

      it(`should change game status to Done for last period (second half)`, () => {
        currentState.liveGame!.status = GameStatus.Live;
        currentState.clock!.currentPeriod = 2;
        currentState.clock!.periodStatus = PeriodStatus.Running;

        const newState = live(currentState, endPeriod());

        expect(newState.liveGame?.status).to.equal(GameStatus.Done);
        expect(newState).not.to.equal(currentState);
      });

      const endInvalidStatuses = startAllowedStatuses.concat(otherStatuses);

      for (const status of endInvalidStatuses) {

        it(`should do nothing if game is in ${status} status`, () => {
          currentState.liveGame!.status = status;

          const newState = live(currentState, endPeriod());

          expect(newState.liveGame?.status).to.equal(status);
          expect(newState).to.equal(currentState);
        });
      }
    });  // describe('clock/endPeriod')

  }); // describe('Clock')

  describe('live/gameCompleted', () => {
    let currentState: LiveState;

    beforeEach(() => {
      currentState = {
        ...INITIAL_OVERALL_STATE,
        liveGame: buildLiveGameWithPlayers(),
        clock: buildClockWithTimer(),
      };
    });

    afterEach(async () => {
      sinon.restore();
    });

    const completeAllowedStatuses = [GameStatus.Done];
    const otherStatuses = [GameStatus.New, GameStatus.Start, GameStatus.Break, GameStatus.Live];

    it('All statuses are covered by gameCompleted tests', () => {
      expect(completeAllowedStatuses.length + otherStatuses.length,
        'Game completed tests for every status').to.equal(Object.values(GameStatus).length);
    });

    it('should capture final data from Done status', () => {
      currentState.liveGame!.status = GameStatus.Done;

      const newState = live(currentState, gameCompleted(currentState.liveGame!.id));

      expect(newState.liveGame?.status).to.equal(GameStatus.Done);
      expect(newState.liveGame?.dataCaptured, 'liveGame.dataCaptured').to.be.true;
      expect(newState).not.to.equal(currentState);
    });


    for (const status of otherStatuses) {

      it(`should do nothing when game is in ${status} status`, () => {
        currentState.liveGame!.status = status;

        const newState = live(currentState, gameCompleted(currentState.liveGame!.id));

        expect(newState.liveGame?.status).to.equal(status);
        expect(newState).to.equal(currentState);
      });
    }

  }); // describe('live/gameCompleted')

});
