import { hydrateLive } from '@app/actions/live.js';
import { FormationType, Position } from '@app/models/formation';
import { GameDetail, GameStatus, SetupStatus, SetupSteps, SetupTask } from '@app/models/game.js';
import { getPlayer, LiveGame, LivePlayer, PeriodStatus } from '@app/models/live.js';
import { PlayerStatus } from '@app/models/player';
import { PlayerTimeTrackerMap } from '@app/models/shift.js';
import { GET_GAME_SUCCESS } from '@app/slices/game-types';
import {
  applyPendingSubs, applyStarter, cancelStarter, cancelSub, cancelSwap, completeRoster, confirmSub,
  confirmSwap,
  discardPendingSubs, endPeriod, formationSelected, gameCompleted, gameSetupCompleted, live, LiveGameState, LiveState, selectPlayer, selectStarter, selectStarterPosition, startersCompleted, startGamePeriod, startPeriod
} from '@app/slices/live/live-slice';
import { RootState } from '@app/store.js';
import { expect } from '@open-wc/testing';
import sinon from 'sinon';
import { buildClock, buildClockWithTimer, buildLiveStateWithCurrentGame, buildShiftWithTrackers, SHIFT_INITIAL_STATE } from '../../helpers/live-state-setup.js';
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

const LIVE_INITIAL_STATE: LiveGameState = {
  gameId: '',
  games: undefined,
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

function buildSwapPlayerPlaceholder(onPlayer: LivePlayer, position: Position) {
  const swap: LivePlayer = {
    ...onPlayer,
    nextPosition: { ...position },
    isSwap: true
  };
  return swap;
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

function getCurrentGame(state: LiveState) {
  return getGame(state, state.gameId);
}

function getGame(state: LiveState, gameId: string) {
  if (!state.games) {
    return;
  }
  return state.games[gameId];
}

function mockGetState(currentState: LiveState) {
  return sinon.fake(() => {
    const mockState: RootState = {
      live: currentState
    };
    return mockState;
  });
}

describe('Live slice', () => {

  it('should return the initial state', () => {
    expect(
      live(INITIAL_OVERALL_STATE, getFakeAction())
    ).to.equal(INITIAL_OVERALL_STATE);
  });

  describe('LIVE_HYDRATE', () => {
    let currentState: LiveState;

    beforeEach(() => {
      currentState = {
        ...INITIAL_OVERALL_STATE,
      };
    });

    it('should set state to given cached data', () => {
      const inputGame = buildLiveGameWithPlayers();
      inputGame.clock = buildClock(buildRunningTimer(),
        {
          totalPeriods: 3
        });
      const inputShift = buildShiftWithTrackers(inputGame.players);

      const newState = live(currentState, hydrateLive(
        testlive.buildLiveGames([inputGame]),
        inputGame.id,
        inputShift
      ));

      const expectedGame: LiveGame = {
        ...inputGame,
      };
      const expectedShift = {
        ...inputShift
      };

      expect(newState).to.deep.include({
        hydrated: true,
        gameId: inputGame.id,
        games: testlive.buildLiveGames([expectedGame]),
        shift: expectedShift
      });

      expect(getCurrentGame(newState)).not.to.equal(getCurrentGame(currentState));
      expect(newState.shift).not.to.equal(currentState.shift);
    });

    it('should set hydrated flag when cached values are missing', () => {
      const newState = live(currentState, hydrateLive());

      expect(newState).to.include({
        hydrated: true,
      });
      expect(newState.gameId, 'gameId should not be set').to.not.be.ok;
      expect(getCurrentGame(newState)).to.be.undefined;
      expect(newState.shift).to.equal(currentState.shift);
    });

    it('should ignored cached values when hydrated flag already set', () => {
      const currentGame = buildLiveGameWithPlayers();
      currentGame.clock = buildClock(buildStoppedTimer());
      const currentShift = buildShiftWithTrackers(currentGame.players);
      currentState = buildLiveStateWithCurrentGame(
        currentGame,
        {
          gameId: currentGame.id,
          shift: currentShift,
          hydrated: true,
        })

      const inputGame = buildLiveGameWithPlayers();
      inputGame.id = OTHER_STORED_GAME_ID;

      expect(inputGame.id).not.to.equal(currentGame.id);

      const newState = live(currentState,
        hydrateLive(
          testlive.buildLiveGames([inputGame]),
          inputGame.id
        )
      );

      const expectedState = buildLiveStateWithCurrentGame(currentGame,
        {
          hydrated: true,
          shift: currentShift
        });
      expectedState.shift = currentShift;

      expect(newState).to.deep.include(expectedState);
      expect(getCurrentGame(newState)).to.equal(getCurrentGame(currentState));
      expect(newState.shift).to.equal(currentState.shift);
    });
  }); // describe('LIVE_HYDRATE')

  describe('GET_GAME_SUCCESS', () => {
    let currentState: LiveState;

    beforeEach(() => {
      currentState = {
        ...INITIAL_OVERALL_STATE,
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
      const expectedState = buildLiveStateWithCurrentGame(expectedGame);

      currentState.gameId = inputGame.id;
      const newState = live(currentState, {
        type: GET_GAME_SUCCESS,
        game: inputGame
      });

      expect(newState).to.deep.include(expectedState);

      expect(getCurrentGame(newState)).not.to.equal(getCurrentGame(currentState));
    });

    it('should initialize live game for new game', () => {
      const currentGame = getNewGame();
      const inputGame: GameDetail = {
        ...currentGame,
        roster: {}
      };

      const expectedGame = buildLiveGameWithSetupTasks([], buildSetupTasks());
      expectedGame.id = currentGame.id;
      const expectedState = buildLiveStateWithCurrentGame(expectedGame);

      currentState.gameId = inputGame.id;
      const newState = live(currentState, {
        type: GET_GAME_SUCCESS,
        game: inputGame
      });

      expect(newState).to.deep.include(expectedState);

      expect(getCurrentGame(newState)).not.to.equal(getCurrentGame(currentState));
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
      const expectedState = buildLiveStateWithCurrentGame(expectedGame,
        {
          shift: {
            trackerMap: expectedMap.toJSON()
          }
        });

      const state = buildLiveStateWithCurrentGame(currentGame);

      const newState = live(state, gameSetupCompleted(currentGame.id, currentGame));

      expect(newState).to.deep.include(expectedState);
    });
  }); // describe('live/gameSetupCompleted')

  describe('live/completeRoster', () => {

    it('should update setup tasks and init live players from roster', () => {
      const rosterPlayers = testlive.getLivePlayers(18);
      const updatedTasks = buildSetupTasks();
      updatedTasks[SetupSteps.Roster].status = SetupStatus.Complete;
      updatedTasks[SetupSteps.Captains].status = SetupStatus.Active;
      const expectedState = buildLiveStateWithCurrentGame(
        buildLiveGameWithSetupTasks(rosterPlayers, updatedTasks));

      const state = buildLiveStateWithCurrentGame(testlive.getLiveGame());
      expect(getCurrentGame(state)?.players, 'players should be empty').to.deep.equal([]);

      const newState = live(state, completeRoster(buildRoster(rosterPlayers)));

      expect(newState).to.deep.include(expectedState);
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
      const expectedState = buildLiveStateWithCurrentGame(expectedGame);

      const state = buildLiveStateWithCurrentGame(
        {
          id: expectedGame.id,
          status: GameStatus.New
        });

      const newState = live(state, formationSelected(FormationType.F4_3_3));

      expect(newState).to.deep.include(expectedState);
    });

    it('should do nothing if formation input is missing', () => {
      const state = buildLiveStateWithCurrentGame(
        buildLiveGameWithPlayers());

      const newState = live(state, formationSelected(undefined as any));

      expect(newState).to.equal(state);
    });
  }); // describe('live/formationSelected')

  describe('live/selectStarter', () => {
    let currentState: LiveState;
    let selectedStarter: LivePlayer;

    beforeEach(() => {
      selectedStarter = testlive.getLivePlayer();
      currentState = buildLiveStateWithCurrentGame(buildLiveGameWithPlayers());
    });

    it('should only set selectedStarterPlayer with nothing selected', () => {
      expect(currentState.selectedStarterPlayer).to.be.undefined;

      const newState = live(currentState, selectStarter(selectedStarter.id, true));

      const expectedState = buildLiveStateWithCurrentGame(
        buildLiveGameWithPlayersSelected(selectedStarter.id, true),
        {
          selectedStarterPlayer: selectedStarter.id,
          proposedStarter: undefined
        });

      expect(newState).to.deep.include(expectedState);
    });

    it('should clear selectedStarterPlayer when de-selected', () => {
      const state: LiveState = buildLiveStateWithCurrentGame(
        buildLiveGameWithPlayersSelected(selectedStarter.id, true), {
        selectedStarterPlayer: selectedStarter.id
      });

      const newState = live(state, selectStarter(selectedStarter.id, false));

      const expectedState = buildLiveStateWithCurrentGame(
        buildLiveGameWithPlayersSelected(selectedStarter.id, false),
        {
          selectedStarterPlayer: undefined,
          proposedStarter: undefined
        });

      expect(newState).to.deep.include(expectedState);
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

      const expectedState = buildLiveStateWithCurrentGame(
        buildLiveGameWithPlayersSelected(selectedStarter.id, true),
        {
          selectedStarterPosition: { ...selectedPosition },
          selectedStarterPlayer: selectedStarter.id,
          proposedStarter: starter
        });

      expect(newState).to.deep.include(expectedState);
    });
  }); // describe('live/selectStarter')

  describe('live/selectStarterPosition', () => {

    it('should only set selectedPosition with nothing selected', () => {
      const state = buildLiveStateWithCurrentGame(
        buildLiveGameWithPlayers());
      expect(state.selectedStarterPosition).to.be.undefined;

      const selectedPosition: Position = { id: 'AM1', type: 'AM' };
      const newState = live(state, selectStarterPosition(selectedPosition));

      const expectedState = buildLiveStateWithCurrentGame(
        buildLiveGameWithPlayers(),
        {
          selectedStarterPosition: { ...selectedPosition },
          proposedStarter: undefined
        });

      expect(newState).to.deep.include(expectedState);
    });

    it('should set selectedPosition and propose starter with player selected', () => {
      const selectedPlayer = testlive.getLivePlayer();
      const selectedPosition: Position = { id: 'AM1', type: 'AM' };

      const state = buildLiveStateWithCurrentGame(
        buildLiveGameWithPlayersSelected(selectedPlayer.id, true), {
        selectedStarterPlayer: selectedPlayer.id,
      });
      expect(state.selectedStarterPosition).to.be.undefined;

      const newState = live(state, selectStarterPosition(selectedPosition));

      const starter: LivePlayer = {
        ...selectedPlayer,
        selected: true,
        currentPosition: { ...selectedPosition }
      }
      const expectedState = buildLiveStateWithCurrentGame(
        buildLiveGameWithPlayersSelected(selectedPlayer.id, true), {
        selectedStarterPlayer: selectedPlayer.id,
        selectedStarterPosition: { ...selectedPosition },
        proposedStarter: starter
      });

      expect(newState).to.deep.include(expectedState);
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

      currentState = buildLiveStateWithCurrentGame(
        buildLiveGameWithPlayersSelected(selectedPlayer.id, true),
        {
          selectedStarterPlayer: selectedPlayer.id,
          selectedStarterPosition: { ...selectedPosition },
          proposedStarter: starter
        });
    });

    it('should set live player to ON with currentPosition', () => {
      const newState: LiveState = live(currentState, applyStarter());

      const newGame = getCurrentGame(newState)!;
      const newPlayer = getPlayer(newGame, selectedPlayer.id);
      expect(newPlayer).to.not.be.undefined;
      expect(newPlayer).to.deep.include({
        id: selectedPlayer.id,
        status: PlayerStatus.On,
        currentPosition: { ...selectedPosition }
      });
      expect(newPlayer!.selected, 'Player should no longer be selected').to.not.be.ok;
    });

    it('should clear selected starter player/position and proposed starter', () => {
      const newState = live(currentState, applyStarter());

      expect(newState.selectedStarterPlayer).to.be.undefined;
      expect(newState.selectedStarterPosition).to.be.undefined;
      expect(newState.proposedStarter).to.be.undefined;
    });

    it('should replace starter already in the position', () => {
      const existingStarter: LivePlayer = {
        ...getNewPlayer(),
        status: PlayerStatus.On,
        currentPosition: { ...selectedPosition }
      }
      const currentGame = getCurrentGame(currentState)!;
      currentGame!.players!.push(existingStarter);

      const newState: LiveState = live(currentState, applyStarter());
      const newGame = getCurrentGame(newState)!;

      expect(newGame.players).to.not.be.undefined;
      const newPlayers = newGame.players!;

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
    });

    it('should do nothing if proposed starter is missing', () => {
      currentState = currentState = buildLiveStateWithCurrentGame(
        buildLiveGameWithPlayersSelected(selectedPlayer.id, true));
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

      currentState = buildLiveStateWithCurrentGame(
        buildLiveGameWithPlayersSelected(selectedPlayer.id, true),
        {
          selectedStarterPlayer: selectedPlayer.id,
          selectedStarterPosition: { ...selectedPosition },
          proposedStarter: starter
        }
      );
    });

    it('should clear selected player/position and proposed starter', () => {
      const newState = live(currentState, cancelStarter());

      const newGame = getCurrentGame(newState)!;
      const cancelledPlayer = getPlayer(newGame, selectedPlayer.id);
      expect(cancelledPlayer).to.not.be.undefined;
      expect(cancelledPlayer!.selected, 'Player should no longer be selected').to.not.be.ok;

      expect(newState.selectedStarterPlayer).to.be.undefined;
      expect(newState.selectedStarterPosition).to.be.undefined;
      expect(newState.proposedStarter).to.be.undefined;
    });

    it('should do nothing if proposed starter is missing', () => {
      currentState = buildLiveStateWithCurrentGame(
        buildLiveGameWithPlayersSelected(selectedPlayer.id, true));

      const newState = live(currentState, cancelStarter());

      expect(newState).to.equal(currentState);
    });
  }); // describe('live/cancelStarter')

  describe('live/startersCompleted', () => {

    it('should update setup tasks to mark starters complete', () => {
      const game = buildLiveGameWithPlayers();
      const state = buildLiveStateWithCurrentGame(game);
      const updatedTasks = buildSetupTasks();
      updatedTasks[SetupSteps.Starters].status = SetupStatus.Complete;
      const expectedState = buildLiveStateWithCurrentGame(
        buildLiveGameWithSetupTasks(game.players, updatedTasks));

      const newState = live(state, startersCompleted());

      expect(newState).to.deep.include(expectedState);

      expect(newState).not.to.equal(state);
    });
  }); // describe('live/startersCompleted')

  describe('live/selectPlayer', () => {
    const selectedPlayerId = 'P0';
    let currentState: LiveState;
    let selectedPlayer: LivePlayer;

    beforeEach(() => {
      selectedPlayer = testlive.getLivePlayer();

      currentState = buildLiveStateWithCurrentGame(
        buildLiveGameWithPlayers());
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
          setPlayerStatus(getCurrentGame(currentState)!, selectedPlayer.id, status);
        });

        it(`should only set selectedPlayer with no other player selected`, () => {
          const newState = live(currentState, selectPlayer(selectedPlayer.id, true));

          const expectedState = buildLiveStateWithCurrentGame(
            buildLiveGameForSelected(status, true));
          setTrackedPlayer(expectedState, status);

          expect(newState).to.deep.include(expectedState);
        });

        it(`should clear selectedPlayer when de-selected`, () => {
          const state = buildLiveStateWithCurrentGame(
            buildLiveGameForSelected(status, true));
          setTrackedPlayer(state, status);

          const expectedState = buildLiveStateWithCurrentGame(
            buildLiveGameForSelected(status, false));

          const newState = live(state, selectPlayer(selectedPlayer.id, false));

          expect(newState).to.deep.include(expectedState);

          expect(newState).not.to.equal(state);
        });
      });
    } // for (const status of trackedStatuses)

    for (const status of flagOnlyStatuses) {

      describe(`Status: ${status}`, () => {
        beforeEach(async () => {
          setPlayerStatus(getCurrentGame(currentState)!, selectedPlayer.id, status);
        });

        it(`should select individual player only`, () => {
          const newState = live(currentState, selectPlayer(selectedPlayer.id, true));

          const expectedGame = buildLiveGameForSelected(status, true);

          expect(getCurrentGame(newState)).to.deep.include(expectedGame);
          expect(newState.selectedOffPlayer).to.be.undefined;
          expect(newState.selectedOnPlayer).to.be.undefined;
        });

        it(`should de-select individual player only`, () => {
          currentState.selectedOffPlayer = 'other off';
          currentState.selectedOnPlayer = 'other on';

          const newState = live(currentState, selectPlayer(selectedPlayer.id, false));

          const expectedGame = buildLiveGameForSelected(status, false);

          expect(getCurrentGame(newState)).to.deep.include(expectedGame);
          expect(newState).to.deep.include({
            selectedOffPlayer: 'other off',
            selectedOnPlayer: 'other on',
          });
        });
      });
    } // for (const status of flagOnlyStatuses)

    describe('Propose sub', () => {
      const offPlayerId = 'P1';
      const onPlayerId = 'P2';
      let offPlayer: LivePlayer;
      let onPlayer: LivePlayer;

      beforeEach(async () => {
        const game = getCurrentGame(currentState)!;
        offPlayer = getPlayer(game, offPlayerId)!;
        offPlayer.status = PlayerStatus.Off;
        onPlayer = getPlayer(game, onPlayerId)!;
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
      });
    }); // describe('Propose sub')

    describe('Propose swap', () => {
      const positionPlayerId = 'P1';
      const onPlayerId = 'P2';
      let positionPlayer: LivePlayer;
      let onPlayer: LivePlayer;

      beforeEach(async () => {
        const currentGame = getCurrentGame(currentState)!;
        positionPlayer = getPlayer(currentGame, positionPlayerId)!;
        positionPlayer.status = PlayerStatus.On;
        onPlayer = getPlayer(currentGame, onPlayerId)!;
        onPlayer.status = PlayerStatus.On;
      });

      it('should propose swap when ON player selected after other ON player already selected', () => {

        // Sets an already selected ON player.
        currentState.selectedOnPlayer = onPlayerId;
        onPlayer.selected = true;

        const newState = live(currentState, selectPlayer(positionPlayerId, true));

        expect(newState.proposedSwap).to.deep.include({
          ...onPlayer,
          nextPosition: positionPlayer.currentPosition,
          isSwap: true
        });
      });

    }); // describe('Propose swap')

  }); // describe('live/selectPlayer')

  describe('Proposed Subs', () => {
    const offPlayerId = 'P1';
    const onPlayerId = 'P2';
    const otherPositionPlayerId = 'P3';
    let offPlayer: LivePlayer;
    let onPlayer: LivePlayer;
    let otherPositionPlayer: LivePlayer;
    let currentState: LiveState;

    beforeEach(async () => {
      const game = buildLiveGameWithPlayers();
      offPlayer = getPlayer(game, offPlayerId)!;
      offPlayer.status = PlayerStatus.Off;
      offPlayer.selected = true;
      onPlayer = getPlayer(game, onPlayerId)!;
      onPlayer.status = PlayerStatus.On;
      onPlayer.selected = true;
      otherPositionPlayer = getPlayer(game, otherPositionPlayerId)!;

      const sub: LivePlayer = {
        ...offPlayer,
        currentPosition: { ...onPlayer.currentPosition! },
        replaces: onPlayer.id
      }


      currentState = buildLiveStateWithCurrentGame(
        game,
        {
          selectedOffPlayer: offPlayerId,
          selectedOnPlayer: onPlayerId,
          proposedSub: sub
        });
    });

    describe('live/confirmSub', () => {

      it('should set off player to Next with currentPosition', () => {
        const newState: LiveState = live(currentState, confirmSub());
        const newGame = getCurrentGame(newState)!;

        expect(newGame.players).to.not.be.undefined;
        const newPlayers = newGame.players!;
        expect(newPlayers).not.to.equal(getCurrentGame(currentState)?.players);

        const newPlayer = newPlayers.find(player => (player.id === offPlayerId));
        expect(newPlayer).to.not.be.undefined;
        expect(newPlayer).to.deep.include({
          status: PlayerStatus.Next,
          currentPosition: { ...onPlayer.currentPosition },
          replaces: onPlayerId
        });
        expect(newPlayer!.selected, 'Off player should no longer be selected').to.not.be.ok;
      });

      it('should set off player to Next with overridden position', () => {
        const newState: LiveState = live(currentState,
          confirmSub(otherPositionPlayer.currentPosition!));
        const newGame = getCurrentGame(newState)!;

        expect(newGame.players).to.not.be.undefined;
        const newPlayers = newGame.players!;
        expect(newPlayers).not.to.equal(getCurrentGame(currentState)?.players);

        const newPlayer = newPlayers.find(player => (player.id === offPlayerId));
        expect(newPlayer).to.not.be.undefined;
        expect(newPlayer).to.deep.include({
          status: PlayerStatus.Next,
          currentPosition: { ...otherPositionPlayer.currentPosition },
          replaces: onPlayerId
        });
        expect(newPlayer!.selected, 'Off player should no longer be selected').to.not.be.ok;
      });

      it('should clear selected players and proposed sub', () => {
        const newState = live(currentState, confirmSub());
        const newGame = getCurrentGame(newState)!;

        expect(newGame.players).to.not.be.undefined;

        const newPlayer = newGame.players?.find(player => (player.id === onPlayerId));
        expect(newPlayer).to.not.be.undefined;
        expect(newPlayer!.selected, 'On player should no longer be selected').to.not.be.ok;

        expect(newState.selectedOffPlayer).to.be.undefined;
        expect(newState.selectedOnPlayer).to.be.undefined;
        expect(newState.proposedSub).to.be.undefined;
      });

      it('should do nothing if proposed sub is missing', () => {
        currentState = buildLiveStateWithCurrentGame(
          buildLiveGameWithPlayers());
        const newState = live(currentState, confirmSub());

        expect(newState).to.equal(currentState);
      });

    }); // describe('live/confirmSub')

    describe('live/cancelSub', () => {

      it('should clear selected players and proposed sub', () => {
        const newState = live(currentState, cancelSub());
        const newGame = getCurrentGame(newState)!;

        const cancelledOffPlayer = newGame?.players?.find(player => (player.id === offPlayerId));
        expect(cancelledOffPlayer).to.not.be.undefined;
        expect(cancelledOffPlayer!.selected, 'Off player should no longer be selected').to.not.be.ok;

        const cancelledOnPlayer = newGame?.players?.find(player => (player.id === onPlayerId));
        expect(cancelledOnPlayer).to.not.be.undefined;
        expect(cancelledOnPlayer!.selected, 'On player should no longer be selected').to.not.be.ok;

        expect(newState.selectedOffPlayer).to.be.undefined;
        expect(newState.selectedOnPlayer).to.be.undefined;
        expect(newState.proposedSub).to.be.undefined;
      });

      it('should do nothing if proposed sub is missing', () => {
        currentState = buildLiveStateWithCurrentGame(
          buildLiveGameWithPlayers());

        const newState = live(currentState, cancelSub());

        expect(newState).to.equal(currentState);
      });

    }); // describe('live/cancelSub')
  }); // describe('Proposed Subs')

  describe('Proposed Swaps', () => {
    const positionPlayerId = 'P1';
    const onPlayerId = 'P2';
    const swapPlayerId = 'P2_swap';
    let positionPlayer: LivePlayer;
    let onPlayer: LivePlayer;
    let currentState: LiveState;

    beforeEach(async () => {
      const game = buildLiveGameWithPlayers();
      positionPlayer = getPlayer(game, positionPlayerId)!;
      positionPlayer.status = PlayerStatus.On;
      positionPlayer.selected = true;
      onPlayer = getPlayer(game, onPlayerId)!;
      onPlayer.status = PlayerStatus.On;
      onPlayer.selected = true;

      const swap = buildSwapPlayerPlaceholder(onPlayer, positionPlayer.currentPosition!);

      currentState = buildLiveStateWithCurrentGame(
        game,
        {
          selectedOnPlayer: onPlayerId,
          selectedOnPlayer2: positionPlayerId,
          proposedSwap: swap
        });
    });

    describe('live/confirmSwap', () => {

      it('should clone on player to Next as a swap', () => {
        const newState: LiveState = live(currentState, confirmSwap());
        const newGame = getCurrentGame(newState)!;

        expect(newGame.players).to.not.be.undefined;
        const newPlayers = newGame.players!;
        expect(newPlayers).not.to.equal(getCurrentGame(currentState)?.players);

        const newPlayer = getPlayer(newGame, onPlayerId);
        expect(newPlayer!.selected, 'On player should no longer be selected').to.not.be.ok;

        // Clone that is next to represent the swap
        const newNextPlayer = getPlayer(newGame, swapPlayerId);
        expect(newNextPlayer, 'Cloned player for swap').to.not.be.undefined;
        expect(newNextPlayer, 'Cloned player for swap').to.deep.include({
          status: PlayerStatus.Next,
          currentPosition: { ...onPlayer.currentPosition },
          nextPosition: { ...positionPlayer.currentPosition },
          isSwap: true,
          selected: false
        });

        const newPositionPlayer = getPlayer(newGame, positionPlayerId);
        expect(newPositionPlayer!.selected, 'Position player should no longer be selected').to.not.be.ok;
      });

      it('should clear selected players and proposed swap', () => {
        const newState = live(currentState, confirmSwap());
        const newGame = getCurrentGame(newState)!;

        expect(newGame.players).to.not.be.undefined;

        const newPlayer = newGame.players?.find(player => (player.id === onPlayerId));
        expect(newPlayer).to.not.be.undefined;
        expect(newPlayer!.selected, 'On player should no longer be selected').to.not.be.ok;

        expect(newState.selectedOnPlayer).to.be.undefined;
        expect(newState.selectedOnPlayer2).to.be.undefined;
        expect(newState.proposedSwap).to.be.undefined;
      });

      it('should do nothing if proposed swap is missing', () => {
        currentState = buildLiveStateWithCurrentGame(
          buildLiveGameWithPlayers());

        const newState = live(currentState, confirmSwap());

        expect(newState).to.equal(currentState);
      });

    }); // describe('live/confirmSwap')

    describe('live/cancelSwap', () => {

      it('should clear selected players and proposed swap', () => {
        const newState = live(currentState, cancelSwap());
        const newGame = getCurrentGame(newState)!;

        const cancelledOnPlayer = newGame?.players?.find(player => (player.id === onPlayerId));
        expect(cancelledOnPlayer).to.not.be.undefined;
        expect(cancelledOnPlayer!.selected, 'On player should no longer be selected').to.not.be.ok;

        const cancelledPositionPlayer = newGame?.players?.find(player => (player.id === positionPlayerId));
        expect(cancelledPositionPlayer).to.not.be.undefined;
        expect(cancelledPositionPlayer!.selected, 'Position player should no longer be selected').to.not.be.ok;

        expect(newState.selectedOnPlayer, 'selectedOnPlayer').to.be.undefined;
        expect(newState.selectedOnPlayer2, 'selectedOnPlayer2').to.be.undefined;
        expect(newState.proposedSwap, 'proposedSwap').to.be.undefined;
      });

      it('should do nothing if proposed swap is missing', () => {
        currentState = buildLiveStateWithCurrentGame(
          buildLiveGameWithPlayers());

        const newState = live(currentState, cancelSwap());

        expect(newState).to.equal(currentState);
      });

    }); // describe('live/cancelSwap')
  }); // describe('Proposed Swaps')

  describe('Next Subs', () => {
    const nextPlayerIds = ['P1', 'P2', 'P3'];
    const onPlayerIds = ['P4', 'P5', 'P6'];
    const swapPositionPlayerIds = ['P7', 'P8', 'P10'];
    // Use a mix of 1 and 2 digit IDs, to make sure the swap IDs are agnostic
    // to the ID contents.
    const swapOnPlayerIds = ['P9', 'P11', 'P12'];
    const swapNextPlayerIds = ['P9_swap', 'P11_swap', 'P12_swap'];
    let currentState: LiveState;

    interface SubIds {
      // Players in Next status
      next?: string[];
      // Players in On status
      on?: string[];
      // Players in Next, but not taking the On player's position
      nextOverrides?: Map<string, Position>;
      // Players whose position will be taken
      swapPosition?: string[];
      // Players who will be swapped into new positions
      swapOn?: string[];
      // Placeholders for players to be swapped
      swapNext?: string[];
    }

    function setupSubState(ids: SubIds, game?: LiveGame) {
      game = game || buildLiveGameWithPlayers();

      if (ids.next?.length !== ids.on?.length) {
        throw new Error('Invalid next vs on ids');
      }
      if (ids.swapPosition?.length !== ids.swapOn?.length ||
        ids.swapPosition?.length !== ids.swapNext?.length) {
        throw new Error('Invalid swap ids');
      }

      for (let i = 0; i < (ids.next?.length || 0); i++) {
        const nextId = ids.next![i];
        const nextPlayer = getPlayer(game, nextId)!;
        const onId = ids.on![i];
        const onPlayer = getPlayer(game, onId)!;

        onPlayer.status = PlayerStatus.On;

        nextPlayer.status = PlayerStatus.Next;
        nextPlayer.replaces = onPlayer.id;
        let position = ids.nextOverrides?.get(nextId) || onPlayer.currentPosition!;
        nextPlayer.currentPosition = { ...position };
      }

      for (let i = 0; i < (ids.swapOn?.length || 0); i++) {
        const onId = ids.swapOn![i];
        const onPlayer = getPlayer(game, onId)!;
        const positionPlayer = getPlayer(game, ids.swapPosition![i])!;

        onPlayer.status = PlayerStatus.On;

        const nextId = ids.swapNext![i];
        const nextPlayer: LivePlayer = {
          ...onPlayer,
          id: nextId,
          status: PlayerStatus.Next,
          nextPosition: { ...positionPlayer.currentPosition! },
          isSwap: true
        };
        game.players?.push(nextPlayer);
      }

      currentState = buildLiveStateWithCurrentGame(
        game,
        {
          shift: buildShiftWithTrackers(game.players, true)
        });
    }

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

    function getPlayersByIds(game: LiveGame, ids: string[]) {
      return game.players?.filter((player) => (ids.includes(player.id))) || [];
    }

    function expectPositionSwapsApplied(game: LiveGame,
      playerIds: string[], positionIds: string[],
      notSwappedIds?: string[]) {
      for (let i = 0; i < playerIds.length; i++) {
        const player = getPlayer(game, playerIds[i])!;
        const positionPlayer = getPlayer(game, positionIds[i])!;

        if (notSwappedIds?.includes(playerIds[i])) {
          expect(player.currentPosition).to.not.deep.equal(positionPlayer.currentPosition,
            `Not swapped [${player.id}], the currentPosition property`);
        } else {
          expect(player.currentPosition).to.deep.equal(positionPlayer.currentPosition,
            `Swapped [${player.id}], the currentPosition property`);
        }
      }
    }

    describe('live/applyPendingSubs', () => {

      it('should apply all next subs, when not selectedOnly', () => {
        setupSubState({
          next: nextPlayerIds,
          on: onPlayerIds
        });

        const newState: LiveState = live(currentState, applyPendingSubs(
          getPlayersByIds(getCurrentGame(currentState)!, nextPlayerIds)
        ));
        const newGame = getCurrentGame(newState)!;
        const newIds = getIdsByStatus(newGame);

        expect(newIds[PlayerStatus.On]).to.contain.members(nextPlayerIds, 'All next players should now be on');
        expect(newIds[PlayerStatus.Off]).to.contain.members(onPlayerIds, 'All replaced players should now be off');
        expect(newIds[PlayerStatus.Next], 'No next players should remain').to.be.empty;
      });

      it('should apply all the next swaps, when not selectedOnly', () => {
        setupSubState({
          swapPosition: swapPositionPlayerIds,
          swapOn: swapOnPlayerIds,
          swapNext: swapNextPlayerIds
        });

        const newState: LiveState = live(currentState, applyPendingSubs(
          /* subs */[]
        ));
        const newGame = getCurrentGame(newState)!;
        const newIds = getIdsByStatus(newGame);

        expectPositionSwapsApplied(newGame, swapOnPlayerIds, swapPositionPlayerIds);

        expect(newIds[PlayerStatus.Next], 'No next swaps should remain').to.be.empty;
      });

      it('should apply all next subs and swaps, when not selectedOnly', () => {
        // Setup a combination of a swap and sub, e.g.:
        //  - A replaces B, but in C's position
        //  - C swaps to D's position, and D swaps to B's position
        setupSubState({
          next: nextPlayerIds,
          on: onPlayerIds,
          swapPosition: swapPositionPlayerIds,
          swapOn: swapOnPlayerIds,
          swapNext: swapNextPlayerIds
        });

        const newState: LiveState = live(currentState, applyPendingSubs(
          getPlayersByIds(getCurrentGame(currentState)!, nextPlayerIds)
        ));
        const newGame = getCurrentGame(newState)!;
        const newIds = getIdsByStatus(newGame);

        expectPositionSwapsApplied(newGame, swapOnPlayerIds, swapPositionPlayerIds);

        expect(newIds[PlayerStatus.On]).to.contain.members(nextPlayerIds, 'All next players should now be on');
        expect(newIds[PlayerStatus.Off]).to.contain.members(onPlayerIds, 'All replaced players should now be off');
        expect(newIds[PlayerStatus.Next], 'No next players should remain').to.be.empty;
      });

      it('should apply only selected next subs', () => {
        setupSubState({
          next: nextPlayerIds,
          on: onPlayerIds
        });
        const currentGame = getCurrentGame(currentState)!;

        // Apply 2 of the 3 pending subs (> 1 to test it will actually sub multiple, not just first)
        const nowPlayingIds = ['P1', 'P3'];
        const stillNextIds = ['P2'];
        const subbedOffIds = ['P4', 'P6'];
        const stillOnIds = ['P5'];

        selectPlayers(currentGame, nowPlayingIds, true);

        const newState = live(currentState, applyPendingSubs(
          getPlayersByIds(currentGame, nowPlayingIds),
          /* selectedOnly */ true));
        const newGame = getCurrentGame(newState)!;
        const newIds = getIdsByStatus(newGame);

        expect(newIds[PlayerStatus.On]).to.contain.members(nowPlayingIds, 'Specified next players should now be on');
        expect(newIds[PlayerStatus.On]).to.contain.members(stillOnIds, 'Players not yet replaced should still be on');
        expect(newIds[PlayerStatus.Off]).to.contain.members(subbedOffIds, 'Specified replaced players should now be off');
        expect(newIds[PlayerStatus.Next]).to.have.members(stillNextIds, 'Next players not specified should remain');

        for (const onId of nowPlayingIds) {
          const player = getPlayer(newGame, onId)!;

          expect(player.replaces, `Now playing [${player.id}], the replaces property should be cleared`).to.not.be.ok;
          expect(player.currentPosition, `Now playing [${player.id}], the currentPosition property should still be set`).to.be.ok;
          expect(player.selected, `Now playing [${player.id}], the selected property should be false`).to.be.false;
        }

        for (const nextId of stillNextIds) {
          const player = getPlayer(newGame, nextId)!;

          expect(player.replaces).to.equal('P5', `Still next [${player.id}], the replaces property should still be set`);
          expect(player.currentPosition, `Still next [${player.id}], the currentPosition property should still be set`).to.be.ok;
        }

        for (const offId of subbedOffIds) {
          const player = getPlayer(newGame, offId)!;

          expect(player.currentPosition, `Now off [${player.id}], the currentPosition property should be cleared`).to.not.be.ok;
          expect(player.selected, `Now off [${player.id}], the selected property should be false`).to.not.be.ok;
        }
      });

      it('should apply only selected next swaps', () => {
        setupSubState({
          swapPosition: swapPositionPlayerIds,
          swapOn: swapOnPlayerIds,
          swapNext: swapNextPlayerIds
        });

        // Apply 2 of the 3 pending swaps (> 1 to test it will actually sub multiple, not just first)
        const nowSwappedIds = [swapOnPlayerIds[0], swapOnPlayerIds[2]];
        const onPendingSwapIds = [swapOnPlayerIds[1]];
        const swappedNextIds = [swapNextPlayerIds[0], swapNextPlayerIds[2]];
        const stillNextIds = [swapNextPlayerIds[1]];

        selectPlayers(getCurrentGame(currentState)!, swappedNextIds, true);

        const newState = live(currentState, applyPendingSubs(
          /* subs */[], /* selectedOnly */ true));
        const newGame = getCurrentGame(newState)!;
        const newIds = getIdsByStatus(newGame);

        expectPositionSwapsApplied(newGame, nowSwappedIds,
          [swapPositionPlayerIds[0], swapPositionPlayerIds[2]],
          /* notSwappedIds */onPendingSwapIds);

        expect(newIds[PlayerStatus.On]).to.contain.members(swapOnPlayerIds, 'On players should be unchanged');
        expect(newIds[PlayerStatus.Next]).to.have.members(stillNextIds, 'Next swaps not specified should remain');

        for (const onId of nowSwappedIds) {
          const player = getPlayer(newGame, onId)!;

          expect(player.selected, `Swapped [${player.id}], the selected property should be false`).to.not.be.ok;
        }
      });

      it('should apply only selected next subs and swaps', () => {
        // Apply 2 of the 3 pending subs and swaps (> 1 to test it will actually do multiple, not just first)
        const nowPlayingIds = [nextPlayerIds[0], nextPlayerIds[2]];
        const subbedOffIds = [onPlayerIds[0], onPlayerIds[2]];
        const stillNextIds = [nextPlayerIds[1]];
        const stillOnIds = [onPlayerIds[1]];
        const nowSwappedIds = [swapOnPlayerIds[0], swapOnPlayerIds[2]];
        const onPendingSwapIds = [swapOnPlayerIds[1]];
        const stillNextSwapIds = [swapNextPlayerIds[1]];
        const toBeSelected = nowPlayingIds.concat(swapNextPlayerIds[0], swapNextPlayerIds[2]);

        // Setup a combination of a swap and sub, e.g.:
        //  - A replaces B, but in C's position
        //  - C swaps to B's position
        // A = last next player to be subbed on
        // B = last on player to be replaced
        // C = first player to be swapped
        const game = buildLiveGameWithPlayers();
        const firstOnSwap = getPlayer(game, swapOnPlayerIds[0])!;
        // Set A to go into C's position.
        const nextOverrides = new Map<string, Position>();
        nextOverrides.set(nextPlayerIds[2], firstOnSwap.currentPosition!);
        // Set C to swap to B's position.
        const swapPositionIds = swapPositionPlayerIds.slice(0);
        swapPositionIds[0] = onPlayerIds[2];

        setupSubState({
          next: nextPlayerIds,
          on: onPlayerIds,
          nextOverrides: nextOverrides,
          swapPosition: swapPositionPlayerIds,
          swapOn: swapOnPlayerIds,
          swapNext: swapNextPlayerIds
        }, game);
        const currentGame = getCurrentGame(currentState)!;

        selectPlayers(currentGame, toBeSelected, true);

        const newState = live(currentState, applyPendingSubs(
          getPlayersByIds(currentGame, nowPlayingIds),
          /* selectedOnly */ true));
        const newGame = getCurrentGame(newState)!;
        const newIds = getIdsByStatus(newGame);

        expectPositionSwapsApplied(newGame, nowSwappedIds,
          [swapPositionPlayerIds[0], swapPositionPlayerIds[2]],
            /* notSwappedIds */onPendingSwapIds);

        expect(newIds[PlayerStatus.On]).to.contain.members(nowPlayingIds, 'Specified next players should now be on');
        expect(newIds[PlayerStatus.On]).to.contain.members(stillOnIds, 'Players not yet replaced should still be on');
        expect(newIds[PlayerStatus.Off]).to.contain.members(subbedOffIds, 'Specified replaced players should now be off');
        expect(newIds[PlayerStatus.Next]).to.have.members(stillNextIds.concat(stillNextSwapIds), 'Next players not specified should remain');

        for (const onId of nowPlayingIds) {
          const player = getPlayer(newGame, onId)!;

          expect(player.replaces, `Now playing [${player.id}], the replaces property should be cleared`).to.not.be.ok;
          expect(player.currentPosition, `Now playing [${player.id}], the currentPosition property should still be set`).to.be.ok;
          expect(player.selected, `Now playing [${player.id}], the selected property should be false`).to.be.false;
        }

        for (const nextId of stillNextIds) {
          const player = getPlayer(newGame, nextId)!;

          expect(player.replaces).to.equal('P5', `Still next [${player.id}], the replaces property should still be set`);
          expect(player.currentPosition, `Still next [${player.id}], the currentPosition property should still be set`).to.be.ok;
        }

        for (const offId of subbedOffIds) {
          const player = getPlayer(newGame, offId)!;

          expect(player.currentPosition, `Now off [${player.id}], the currentPosition property should be cleared`).to.not.be.ok;
          expect(player.selected, `Now off [${player.id}], the selected property should be false`).to.not.be.ok;
        }
      });

      it('should clear selected, when subbing all players (not selectedOnly)', () => {
        setupSubState({
          next: nextPlayerIds,
          on: onPlayerIds,
          swapPosition: swapPositionPlayerIds,
          swapOn: swapOnPlayerIds,
          swapNext: swapNextPlayerIds
        });
        const currentGame = getCurrentGame(currentState)!;

        const nowPlayingIds = ['P1', 'P2', 'P3'];
        const subbedOffIds = ['P4', 'P5', 'P6'];

        selectPlayers(currentGame, ['P1', 'P3'], true);
        selectPlayers(currentGame, ['P4', 'P6'], true);

        const newState: LiveState = live(currentState, applyPendingSubs(
          getPlayersByIds(currentGame, nowPlayingIds),
          /* selectedOnly */ false));
        const newGame = getCurrentGame(newState)!;
        const newIds = getIdsByStatus(newGame);

        expect(newIds[PlayerStatus.On]).to.contain.members(nowPlayingIds, 'All next players should now be on');
        expect(newIds[PlayerStatus.Off]).to.contain.members(subbedOffIds, 'All replaced players should now be off');

        for (const onId of nowPlayingIds) {
          const player = getPlayer(newGame, onId)!;

          expect(player.selected, `Now playing [${player.id}], the selected property should be false`).to.be.false;
        }

        for (const offId of subbedOffIds) {
          const player = getPlayer(newGame, offId)!;

          expect(player.selected, `Now off [${player.id}], the selected property should be false`).to.not.be.ok;
        }
      });

    }); // describe('live/applyPendingSubs')

    describe('live/discardPendingSubs', () => {

      it('should reset all next players to off, when not selectedOnly', () => {
        const nowOffIds = ['P1', 'P2', 'P3'];
        const stillOnIds = ['P4', 'P5', 'P6'];

        setupSubState({
          next: nextPlayerIds,
          on: onPlayerIds
        });

        const newState = live(currentState, discardPendingSubs());
        const newGame = getCurrentGame(newState)!;
        const newIds = getIdsByStatus(newGame);

        expect(newIds[PlayerStatus.On]).to.contain.members(stillOnIds, 'All to be replaced players should still be on');
        expect(newIds[PlayerStatus.Off]).to.contain.members(nowOffIds, 'All next players should now be off');
        expect(newIds[PlayerStatus.Next], 'No next players should remain').to.be.empty;
      });

      it('should reset only selected next players to off', () => {
        // Discard 2 of the 3 pending subs (> 1 to test it will actually sub multiple, not just first)
        const nowOffIds = ['P1', 'P3'];
        const stillNextIds = ['P2'];
        const stillOnIds = ['P4', 'P5', 'P6'];

        setupSubState({
          next: nextPlayerIds,
          on: onPlayerIds
        });

        selectPlayers(getCurrentGame(currentState)!, nowOffIds, true);

        const newState = live(currentState, discardPendingSubs(/* selectedOnly */ true));
        const newGame = getCurrentGame(newState)!;
        const newIds = getIdsByStatus(newGame);

        expect(newIds[PlayerStatus.On]).to.contain.members(stillOnIds, 'All to be replaced players should still be on');
        expect(newIds[PlayerStatus.Off]).to.contain.members(nowOffIds, 'Specified next players should now be off');
        expect(newIds[PlayerStatus.Next]).to.have.members(stillNextIds, 'Next players not specified should remain');

        for (const nextId of stillNextIds) {
          const player = getPlayer(newGame, nextId)!;

          expect(player.replaces).to.equal('P5', `Still next [${player.id}], the replaces property should still be set`);
          expect(player.currentPosition, `Still next [${player.id}], the currentPosition property should still be set`).to.be.ok;
        }

        for (const offId of nowOffIds) {
          const player = getPlayer(newGame, offId)!;

          expect(player.replaces, `Now off [${player.id}], the replaces property should be cleared`).to.not.be.ok;
          expect(player.currentPosition, `Now off [${player.id}], the currentPosition property should be cleared`).to.not.be.ok;
          expect(player.selected, `Now off [${player.id}], the selected property should be false`).to.not.be.ok;
        }
      });

      it('should remove all next swaps, when not selectedOnly', () => {
        setupSubState({
          swapPosition: swapPositionPlayerIds,
          swapOn: swapOnPlayerIds,
          swapNext: swapNextPlayerIds
        });

        const newState = live(currentState, discardPendingSubs());
        const newGame = getCurrentGame(newState)!;

        expectPositionSwapsApplied(newGame, swapOnPlayerIds, swapPositionPlayerIds,
          /* notSwappedIds */ swapOnPlayerIds);

        const newIds = getIdsByStatus(newGame);

        expect(newIds[PlayerStatus.Next], 'No next swaps should remain').to.be.empty;
      });

      it('should remove only selected next swaps', () => {
        setupSubState({
          swapPosition: swapPositionPlayerIds,
          swapOn: swapOnPlayerIds,
          swapNext: swapNextPlayerIds
        });

        // Discard 2 of the 3 pending swaps (> 1 to test it will actually do multiple, not just first)
        const discardedNextIds = [swapNextPlayerIds[0], swapNextPlayerIds[2]];
        const stillNextIds = [swapNextPlayerIds[1]];

        selectPlayers(getCurrentGame(currentState)!, discardedNextIds, true);

        const newState = live(currentState, discardPendingSubs(/* selectedOnly */ true));
        const newGame = getCurrentGame(newState)!;
        const newIds = getIdsByStatus(newGame);

        expect(newIds[PlayerStatus.Next]).to.have.members(stillNextIds, 'Next players not specified should remain');
      });

    }); // describe('live/discardPendingSubs')
  }); // describe('Next Subs')

  describe('Clock', () => {
    const startTime = new Date(2016, 0, 1, 14, 0, 0).getTime();
    let currentState: LiveState;
    let gameId: string;
    let fakeClock: sinon.SinonFakeTimers;

    beforeEach(() => {
      fakeClock = sinon.useFakeTimers({ now: startTime });
      const game = buildLiveGameWithPlayers();
      game.clock = buildClockWithTimer();
      currentState = buildLiveStateWithCurrentGame(
        game,
        {
          shift: buildShiftWithTrackers()
        });
      gameId = game.id;
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

    describe('live/startPeriod', () => {
      for (const status of startAllowedStatuses) {

        it(`should dispatch action allow start = true when game is in ${status} status`, async () => {
          getCurrentGame(currentState)!.status = status;

          const dispatchMock = sinon.stub();
          const getStateMock = mockGetState(currentState);

          await startGamePeriod()(dispatchMock, getStateMock, undefined);

          // The request action is dispatched, regardless.
          expect(dispatchMock).to.have.callCount(1);

          expect(dispatchMock.lastCall).to.have.been.calledWith(
            startPeriod(gameId, /* gameAllowsStart= */ true));
        });

        it(`should change game status from ${status} to Live`, () => {
          const currentGame = getCurrentGame(currentState)!;
          currentGame.status = status;

          const newState = live(currentState, startPeriod(currentGame.id, /*gameAllowsStart=*/true));

          const newGame = getCurrentGame(newState)!;
          expect(newGame.status).to.equal(GameStatus.Live);
          expect(newGame.clock?.periodStatus).to.equal(PeriodStatus.Running);
          expect(newState.shift?.trackerMap?.clockRunning).to.be.true;
        });

        it(`should dispatch action allow start = false when already at last period in ${status} status`, async () => {
          const currentGame = getCurrentGame(currentState)!;
          currentGame.status = status;
          currentGame.clock!.currentPeriod = 2;
          currentGame.clock!.totalPeriods = 2;

          const dispatchMock = sinon.stub();
          const getStateMock = mockGetState(currentState);

          await startGamePeriod()(dispatchMock, getStateMock, undefined);

          // The request action is dispatched, regardless.
          expect(dispatchMock).to.have.callCount(1);

          expect(dispatchMock.lastCall).to.have.been.calledWith(
            startPeriod(gameId, /* gameAllowsStart= */ false));
        });

      }

      const startInvalidStatuses = endAllowedStatuses.concat(otherStatuses);

      for (const status of startInvalidStatuses) {

        it(`should dispatch action allow start = false when game is in ${status} status`, async () => {
          getCurrentGame(currentState)!.status = status;

          const dispatchMock = sinon.stub();
          const getStateMock = mockGetState(currentState);

          await startGamePeriod()(dispatchMock, getStateMock, undefined);

          // The request action is dispatched, regardless.
          expect(dispatchMock).to.have.callCount(1);

          expect(dispatchMock.lastCall).to.have.been.calledWith(
            startPeriod(gameId, /* gameAllowsStart= */ false));
        });

        it(`should do nothing when game is in ${status} status`, () => {
          const currentGame = getCurrentGame(currentState)!;
          currentGame.status = status;

          const newState = live(currentState, startPeriod(currentGame.id, /*gameAllowsStart=*/false));

          expect(getCurrentGame(newState)?.status).to.equal(status);
          expect(newState).to.equal(currentState);
        });
      }
    });  // describe('live/startPeriod')

    describe('live/endPeriod', () => {

      it(`should change game status to Break for first period (first half)`, () => {
        const currentGame = getCurrentGame(currentState)!;
        currentGame.status = GameStatus.Live;
        currentGame.clock!.currentPeriod = 1;
        currentGame.clock!.periodStatus = PeriodStatus.Running;
        currentState.shift!.trackerMap!.clockRunning = true;

        const newState = live(currentState, endPeriod(currentGame.id));

        const newGame = getCurrentGame(newState)!;
        expect(newGame.status).to.equal(GameStatus.Break);
        expect(newGame.clock?.periodStatus).to.equal(PeriodStatus.Pending);
        expect(newState.shift?.trackerMap?.clockRunning).to.be.false;
      });

      it(`should change game status to Break for middle period`, () => {
        const currentGame = getCurrentGame(currentState)!;
        currentGame.status = GameStatus.Live;
        currentGame.clock!.totalPeriods = 3;
        currentGame.clock!.currentPeriod = 2;
        currentGame.clock!.periodStatus = PeriodStatus.Running;

        const newState = live(currentState, endPeriod(currentGame.id));

        expect(getCurrentGame(newState)?.status).to.equal(GameStatus.Break);
      });

      it(`should change game status to Done for last period (second half)`, () => {
        const currentGame = getCurrentGame(currentState)!;
        currentGame.status = GameStatus.Live;
        currentGame.clock!.currentPeriod = 2;
        currentGame.clock!.periodStatus = PeriodStatus.Running;

        const newState = live(currentState, endPeriod(currentGame.id));

        expect(getCurrentGame(newState)?.status).to.equal(GameStatus.Done);
      });

      const endInvalidStatuses = startAllowedStatuses.concat(otherStatuses);

      for (const status of endInvalidStatuses) {

        it(`should do nothing if game is in ${status} status`, () => {
          const currentGame = getCurrentGame(currentState)!;
          currentGame.status = status;

          const newState = live(currentState, endPeriod(currentGame.id));

          expect(getCurrentGame(newState)?.status).to.equal(status);
          expect(newState).to.equal(currentState);
        });
      }
    });  // describe('live/endPeriod')

  }); // describe('Clock')

  describe('live/gameCompleted', () => {
    let currentState: LiveState;

    beforeEach(() => {
      const game = buildLiveGameWithPlayers();
      game.clock = buildClockWithTimer();
      currentState = buildLiveStateWithCurrentGame(game);
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
      const currentGame = getCurrentGame(currentState)!;
      currentGame.status = GameStatus.Done;

      const newState = live(currentState, gameCompleted(currentGame.id));
      const newGame = getCurrentGame(newState)!;

      expect(newGame.status).to.equal(GameStatus.Done);
      expect(newGame.dataCaptured, 'liveGame.dataCaptured').to.be.true;
    });


    for (const status of otherStatuses) {

      it(`should do nothing when game is in ${status} status`, () => {
        const currentGame = getCurrentGame(currentState)!;
        currentGame.status = status;

        const newState = live(currentState, gameCompleted(currentGame.id));

        expect(getCurrentGame(newState)?.status).to.equal(status);
        expect(newState).to.equal(currentState);
      });
    }

  }); // describe('live/gameCompleted')

});
