/** @format */

import { Duration } from '@app/models/clock.js';
import { GameStatus } from '@app/models/game.js';
import { getPlayer, LivePlayer } from '@app/models/live.js';
import { PlayerStatus } from '@app/models/player.js';
import { PlayerTimeTrackerMap } from '@app/models/shift.js';
import { actions } from '@app/slices/live/live-slice.js';
import { shift, ShiftState } from '@app/slices/live/shift-slice.js';
import { expect } from '@open-wc/testing';
import sinon from 'sinon';
import {
  buildShiftWithTrackers,
  buildShiftWithTrackersFromGame,
  getTrackerMap,
  SHIFT_INITIAL_STATE,
} from '../../helpers/live-state-setup.js';
import { mockTimeProvider } from '../../helpers/test-clock-data.js';
import * as testlive from '../../helpers/test-live-game-data.js';
import { buildPlayerTracker } from '../../helpers/test-shift-data.js';

const { applyPendingSubs, endPeriod, gameSetupCompleted, startPeriod } = actions;

describe('Shift slice', () => {
  const startTime = new Date(2016, 0, 1, 14, 0, 0).getTime();
  const timeStartPlus5 = new Date(2016, 0, 1, 14, 0, 5).getTime();
  const timeStartPlus10Minutes = new Date(2016, 0, 1, 14, 10, 0).getTime();
  const timeStartPlus15Minutes = new Date(2016, 0, 1, 14, 15, 0).getTime();
  let fakeClock: sinon.SinonFakeTimers;

  afterEach(async () => {
    sinon.restore();
    if (fakeClock) {
      fakeClock.restore();
    }
  });

  function mockCurrentTime(t0: number) {
    fakeClock = sinon.useFakeTimers({ now: t0 });
  }

  describe('live/gameSetupCompleted', () => {
    let currentState: ShiftState = SHIFT_INITIAL_STATE;

    beforeEach(() => {
      currentState = {
        ...SHIFT_INITIAL_STATE,
      };
    });

    it('should initialize trackers from live players', () => {
      const rosterPlayers = testlive.getLivePlayers(18);
      const game = testlive.getLiveGame(rosterPlayers);
      const expectedMap = PlayerTimeTrackerMap.createFromGame(game);

      expect(currentState.trackerMaps, 'trackerMap should be empty').to.not.be.ok;

      const newState = shift(currentState, gameSetupCompleted(game.id, game));

      expect(newState).to.deep.include({
        trackerMaps: { [expectedMap.id]: expectedMap.toJSON() },
      });
      expect(newState).not.to.equal(currentState);
    });

    it('should do nothing if the game has no players', () => {
      const game = testlive.getLiveGame();
      const newState = shift(currentState, gameSetupCompleted(game.id, game));

      expect(newState).to.equal(currentState);
    });
  }); // describe('live/gameSetupCompleted')

  describe('clock/startPeriod', () => {
    let currentState: ShiftState = SHIFT_INITIAL_STATE;
    let rosterPlayers: LivePlayer[];
    const gameId = 'somegameid';

    before(() => {
      rosterPlayers = testlive.getLivePlayers(18);
    });

    beforeEach(() => {
      currentState = buildShiftWithTrackers(gameId, rosterPlayers);
    });

    it('should set the clock running and capture the start time', () => {
      mockCurrentTime(startTime);

      const newState = shift(currentState, startPeriod(gameId, /*gameAllowsStart=*/ true));

      // Only need to check the first player tracker.
      const expectedTracker = buildPlayerTracker(rosterPlayers[0]);
      expectedTracker.alreadyOn = true;
      expectedTracker.onTimer = {
        isRunning: true,
        startTime,
        duration: Duration.zero().toJSON(),
      };

      const newTrackerMap = getTrackerMap(newState, gameId);
      const firstTracker = newTrackerMap?.trackers?.find(
        (tracker) => tracker.id === expectedTracker.id
      );
      expect(firstTracker, `Should find tracker with id = ${expectedTracker.id}`).to.be.ok;
      expect(firstTracker).to.deep.include(expectedTracker);

      expect(newTrackerMap?.clockRunning, 'trackerMap.clockRunning').to.be.true;
      expect(newTrackerMap).not.to.equal(getTrackerMap(currentState, gameId));

      expect(newState).not.to.equal(currentState);
    });

    it('should do nothing if game does not allow period to be started', () => {
      mockCurrentTime(startTime);

      const newState = shift(currentState, startPeriod(gameId, /*gameAllowsStart=*/ false));

      const newTrackerMap = getTrackerMap(newState, gameId);
      expect(newTrackerMap?.clockRunning, 'trackerMap.clockRunning').to.be.false;
      expect(newTrackerMap).to.equal(getTrackerMap(currentState, gameId));

      expect(newState).to.equal(currentState);
    });
  }); // describe('clock/startPeriod')

  describe('clock/endPeriod', () => {
    let currentState: ShiftState = SHIFT_INITIAL_STATE;
    let rosterPlayers: LivePlayer[];
    const gameId = 'somegameid';

    before(() => {
      rosterPlayers = testlive.getLivePlayers(18);
    });

    beforeEach(() => {
      currentState = buildShiftWithTrackers(gameId, rosterPlayers);
    });

    it('should stop the clock and capture the end time', () => {
      // Set the start time for starting shifts.
      const timeProvider = mockTimeProvider(startTime);
      let currentTrackerMapData = getTrackerMap(currentState, gameId);
      const trackerMap = PlayerTimeTrackerMap.create(currentTrackerMapData!, timeProvider);
      trackerMap.startShiftTimers();
      currentTrackerMapData = trackerMap.toJSON();
      currentState.trackerMaps![gameId] = currentTrackerMapData;

      // Now, mock the underlying time, to be used when stopping
      // the shifts by the reducer.
      mockCurrentTime(timeStartPlus5);

      const newState = shift(currentState, endPeriod(gameId));

      // Only need to check the first player tracker.
      const expectedTracker = buildPlayerTracker(rosterPlayers[0]);
      expectedTracker.alreadyOn = true;
      expectedTracker.onTimer = {
        isRunning: false,
        startTime: undefined,
        duration: Duration.create(5).toJSON(),
      };

      const newTrackerMap = getTrackerMap(newState, gameId);
      const firstTracker = newTrackerMap?.trackers?.find(
        (tracker) => tracker.id === expectedTracker.id
      );
      expect(firstTracker, `Should find tracker with id = ${expectedTracker.id}`).to.be.ok;
      expect(firstTracker).to.deep.include(expectedTracker);

      expect(newTrackerMap?.clockRunning, 'trackerMap.clockRunning').to.be.false;
      expect(newTrackerMap).not.to.equal(currentTrackerMapData);

      expect(newState).not.to.equal(currentState);
    });

    it('should stop the clock retroactively when running', () => {
      // Set the start time for starting shifts.
      const timeProvider = mockTimeProvider(startTime);
      let currentTrackerMapData = getTrackerMap(currentState, gameId);
      const trackerMap = PlayerTimeTrackerMap.create(currentTrackerMapData!, timeProvider);
      trackerMap.startShiftTimers();
      currentTrackerMapData = trackerMap.toJSON();
      currentState.trackerMaps![gameId] = currentTrackerMapData;

      // Now, mock the underlying time, to be used when stopping
      // the shifts by the reducer.
      mockCurrentTime(timeStartPlus15Minutes);

      const newState = shift(currentState, endPeriod(gameId, timeStartPlus10Minutes));

      // Only need to check the first player tracker.
      const expectedTracker = buildPlayerTracker(rosterPlayers[0]);
      expectedTracker.alreadyOn = true;
      expectedTracker.onTimer = {
        isRunning: false,
        startTime: undefined,
        duration: Duration.create(10 * 60).toJSON(),
      };

      const newTrackerMap = getTrackerMap(newState, gameId);
      const firstTracker = newTrackerMap?.trackers?.find(
        (tracker) => tracker.id === expectedTracker.id
      );
      expect(firstTracker, `Should find tracker with id = ${expectedTracker.id}`).to.be.ok;
      expect(firstTracker).to.deep.include(expectedTracker);

      expect(newTrackerMap?.clockRunning, 'trackerMap.clockRunning').to.be.false;
      expect(newTrackerMap).not.to.equal(currentTrackerMapData);

      expect(newState).not.to.equal(currentState);
    });

    it('should ignore the retroactive time when already stopped', () => {
      // Set the times for starting shifts.
      const timeProvider = mockTimeProvider(startTime, timeStartPlus15Minutes);
      let currentTrackerMapData = getTrackerMap(currentState, gameId);
      const trackerMap = PlayerTimeTrackerMap.create(currentTrackerMapData!, timeProvider);
      trackerMap.startShiftTimers();
      trackerMap.stopShiftTimers();
      currentTrackerMapData = trackerMap.toJSON();
      currentState.trackerMaps![gameId] = currentTrackerMapData;

      const newState = shift(currentState, endPeriod(gameId, timeStartPlus10Minutes));

      // The previous stop time should be kept, and the retroactive time
      // from the action ignored.
      // Only need to check the first player tracker.
      const expectedTracker = buildPlayerTracker(rosterPlayers[0]);
      expectedTracker.alreadyOn = true;
      expectedTracker.onTimer = {
        isRunning: false,
        startTime: undefined,
        duration: Duration.create(15 * 60).toJSON(),
      };

      const newTrackerMap = getTrackerMap(newState, gameId);
      const firstTracker = newTrackerMap?.trackers?.find(
        (tracker) => tracker.id === expectedTracker.id
      );
      expect(firstTracker, `Should find tracker with id = ${expectedTracker.id}`).to.be.ok;
      expect(firstTracker).to.deep.include(expectedTracker);

      expect(newTrackerMap?.clockRunning, 'trackerMap.clockRunning').to.be.false;
      expect(newTrackerMap).to.equal(currentTrackerMapData);
    });

    it('should do nothing if game does not allow period to be ended', () => {
      mockCurrentTime(startTime);

      const newState = shift(currentState, endPeriod(gameId));

      const newTrackerMap = getTrackerMap(newState, gameId);
      expect(newTrackerMap?.clockRunning, 'trackerMap.clockRunning').to.be.false;
      expect(newTrackerMap).to.equal(getTrackerMap(currentState, gameId));

      expect(newState).to.equal(currentState);
    });
  }); // describe('clock/endPeriod')

  describe('live/applyPendingSubs', () => {
    const nextPlayerIds = ['P12', 'P13', 'P14'];
    const onPlayerIds = ['P4', 'P5', 'P6'];
    let currentState: ShiftState;
    let players: LivePlayer[];
    let subs: LivePlayer[] = [];
    let gameId: string;

    beforeEach(() => {
      const game = testlive.getLiveGameWithPlayers();
      players = game.players!;
      subs = [];
      for (let i = 0; i < nextPlayerIds.length; i++) {
        const nextId = nextPlayerIds[i];
        const nextPlayer = players.find((p) => p.id === nextId)!;
        const onId = onPlayerIds[i];
        const onPlayer = players.find((p) => p.id === onId)!;

        onPlayer.status = PlayerStatus.On;

        nextPlayer.status = PlayerStatus.Next;
        nextPlayer.currentPosition = { ...onPlayer.currentPosition! };
        nextPlayer.replaces = onPlayer.id;
        subs.push(nextPlayer);
      }
      currentState = buildShiftWithTrackersFromGame(game);
      gameId = game.id;
    });

    function getTrackersByIds(state: ShiftState, trackerGameId: string, ids: string[]) {
      const trackerMap = getTrackerMap(state, trackerGameId);
      return trackerMap?.trackers?.filter((player) => ids.includes(player.id)) || [];
    }

    it('should sub all next players, when not selectedOnly', () => {
      // Set the start time for starting shifts.
      const timeProvider = mockTimeProvider(startTime);
      let currentTrackerMapData = getTrackerMap(currentState, gameId);
      const trackerMap = PlayerTimeTrackerMap.create(currentTrackerMapData!, timeProvider);
      trackerMap.startShiftTimers();
      currentTrackerMapData = trackerMap.toJSON();
      currentState.trackerMaps![gameId] = currentTrackerMapData;

      // Now, mock the underlying time, to be used when changing
      // the shifts by the reducer.
      mockCurrentTime(timeStartPlus5);

      const newState = shift(currentState, applyPendingSubs(gameId, subs));

      // Check that the next players are now on, with timer running
      const newOnTrackers = getTrackersByIds(newState, gameId, nextPlayerIds);
      expect(newOnTrackers).to.have.length(nextPlayerIds.length, 'Number of subs');
      newOnTrackers.forEach((tracker) => {
        expect(tracker).to.deep.include({
          isOn: true,
          shiftCount: 1,
          onTimer: {
            isRunning: true,
            startTime: timeStartPlus5,
            duration: Duration.zero().toJSON(),
          },
        });
      });

      const newOffTrackers = getTrackersByIds(newState, gameId, onPlayerIds);
      expect(newOffTrackers).to.have.length(nextPlayerIds.length, 'Number of replaced');
      newOffTrackers.forEach((tracker) => {
        expect(tracker).to.deep.include({
          isOn: false,
          shiftCount: 1,
          offTimer: {
            isRunning: true,
            startTime: timeStartPlus5,
            duration: Duration.zero().toJSON(),
          },
        });
      });

      const newTrackerMap = getTrackerMap(newState, gameId);
      expect(newTrackerMap).not.to.equal(currentTrackerMapData);
    });

    it('should ignore swaps', () => {
      const swapPlayer = getPlayer({ id: 'foo', status: GameStatus.Live, players }, 'P8');
      const swap = {
        ...swapPlayer,
        id: `${swapPlayer?.id}_swap`,
        isSwap: true,
      } as LivePlayer;
      players.push(swap);
      subs.push(swap);
      currentState = buildShiftWithTrackers(gameId, players);
      let currentTrackerMapData = getTrackerMap(currentState, gameId);

      // Set the start time for starting shifts.
      const timeProvider = mockTimeProvider(startTime);
      const trackerMap = PlayerTimeTrackerMap.create(currentTrackerMapData!, timeProvider);
      trackerMap.startShiftTimers();
      currentTrackerMapData = trackerMap.toJSON();
      currentState.trackerMaps![gameId] = currentTrackerMapData;

      // Now, mock the underlying time, to be used when changing
      // the shifts by the reducer.
      mockCurrentTime(timeStartPlus5);

      const newState = shift(currentState, applyPendingSubs(gameId, subs));

      // Check that the next players are now on, with timer running
      const newOnTrackers = getTrackersByIds(newState, gameId, nextPlayerIds);
      expect(newOnTrackers).to.have.length(nextPlayerIds.length, 'Number of subs');
      newOnTrackers.forEach((tracker) => {
        expect(tracker).to.deep.include({
          isOn: true,
          shiftCount: 1,
          onTimer: {
            isRunning: true,
            startTime: timeStartPlus5,
            duration: Duration.zero().toJSON(),
          },
        });
      });

      const newOffTrackers = getTrackersByIds(newState, gameId, onPlayerIds);
      expect(newOffTrackers).to.have.length(nextPlayerIds.length, 'Number of replaced');
      newOffTrackers.forEach((tracker) => {
        expect(tracker).to.deep.include({
          isOn: false,
          shiftCount: 1,
          offTimer: {
            isRunning: true,
            startTime: timeStartPlus5,
            duration: Duration.zero().toJSON(),
          },
        });
      });

      const newTrackerMap = getTrackerMap(newState, gameId);
      expect(newTrackerMap).not.to.equal(currentTrackerMapData);
    });
  }); // describe('live/applyPendingSubs')
}); // describe('Shift slice')
