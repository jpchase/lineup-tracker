import { Duration } from '@app/models/clock.js';
import { LivePlayer } from '@app/models/game.js';
import { PlayerStatus } from '@app/models/player.js';
import { PlayerTimeTrackerMap } from '@app/models/shift.js';
import { endPeriod, startPeriod } from '@app/slices/live/clock-slice.js';
import { applyPendingSubs, gameSetupCompleted } from '@app/slices/live/live-slice.js';
import { shift, ShiftState } from '@app/slices/live/shift-slice.js';
import { expect } from '@open-wc/testing';
import sinon from 'sinon';
import { mockTimeProvider } from '../../helpers/test-clock-data.js';
import * as testlive from '../../helpers/test-live-game-data.js';
import { buildPlayerTracker } from '../../helpers/test-shift-data.js';

export const SHIFT_INITIAL_STATE: ShiftState = {
  trackerMap: undefined,
};

export function buildShiftWithTrackers(existingPlayers?: LivePlayer[]): ShiftState {
  let players;
  if (existingPlayers) {
    players = existingPlayers.slice(0);
  } else {
    players = testlive.getLivePlayers(18);
  }
  players.forEach((player, index) => {
    player.status = (index < 11) ? PlayerStatus.On : PlayerStatus.Off;
  });

  return {
    ...SHIFT_INITIAL_STATE,
    trackerMap: new PlayerTimeTrackerMap().initialize(players).toJSON()
  };
}

describe('Shift slice', () => {
  const startTime = new Date(2016, 0, 1, 14, 0, 0).getTime();
  const time1 = new Date(2016, 0, 1, 14, 0, 5).getTime();
  // const time2 = new Date(2016, 0, 1, 14, 0, 10).getTime();
  // const time3 = new Date(2016, 0, 1, 14, 1, 55).getTime();
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
      const expectedMap = new PlayerTimeTrackerMap();
      expectedMap.initialize(rosterPlayers);

      expect(currentState.trackerMap, 'trackerMap should be empty').to.not.be.ok;

      const newState = shift(currentState,
        gameSetupCompleted(game.id, game));

      expect(newState).to.deep.include({
        trackerMap: expectedMap.toJSON()
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

    before(() => {
      rosterPlayers = testlive.getLivePlayers(18);
    });

    beforeEach(() => {
      currentState = buildShiftWithTrackers(rosterPlayers);
    });

    it('should set the clock running and capture the start time', () => {
      mockCurrentTime(startTime);

      const newState = shift(currentState, startPeriod(/*gameAllowsStart=*/true));

      // Only need to check the first player tracker.
      const expectedTracker = buildPlayerTracker(rosterPlayers[0]);
      expectedTracker.alreadyOn = true;
      expectedTracker.onTimer = {
        isRunning: true,
        startTime: startTime,
        duration: Duration.zero().toJSON()
      }

      const firstTracker = newState.trackerMap?.trackers?.find(
        (tracker) => (tracker.id === expectedTracker.id));
      expect(firstTracker, `Should find tracker with id = ${expectedTracker.id}`).to.be.ok;
      expect(firstTracker).to.deep.include(expectedTracker);

      expect(newState.trackerMap?.clockRunning, 'trackerMap.clockRunning').to.be.true;
      expect(newState.trackerMap).not.to.equal(currentState.trackerMap);

      expect(newState).not.to.equal(currentState);
    });

    it('should do nothing if game does not allow period to be started', () => {
      mockCurrentTime(startTime);

      const newState = shift(currentState, startPeriod(/*gameAllowsStart=*/false));

      expect(newState.trackerMap?.clockRunning, 'trackerMap.clockRunning').to.be.false;
      expect(newState.trackerMap).to.equal(currentState.trackerMap);

      expect(newState).to.equal(currentState);
    });

  }); // describe('clock/startPeriod')

  describe('clock/endPeriod', () => {
    let currentState: ShiftState = SHIFT_INITIAL_STATE;
    let rosterPlayers: LivePlayer[];

    before(() => {
      rosterPlayers = testlive.getLivePlayers(18);
    });

    beforeEach(() => {
      currentState = buildShiftWithTrackers(rosterPlayers);
    });

    it('should stop the clock and capture the end time', () => {
      // Set the start time for starting shifts.
      const timeProvider = mockTimeProvider(startTime);
      const trackerMap = new PlayerTimeTrackerMap(currentState.trackerMap, timeProvider);
      trackerMap.startShiftTimers();
      currentState.trackerMap = trackerMap.toJSON();

      // Now, mock the underlying time, to be used when stopping
      // the shifts by the reducer.
      mockCurrentTime(time1);

      const newState = shift(currentState, endPeriod());

      // Only need to check the first player tracker.
      const expectedTracker = buildPlayerTracker(rosterPlayers[0]);
      expectedTracker.alreadyOn = true;
      expectedTracker.onTimer = {
        isRunning: false,
        startTime: undefined,
        duration: Duration.create(5).toJSON()
      }

      const firstTracker = newState.trackerMap?.trackers?.find(
        (tracker) => (tracker.id === expectedTracker.id));
      expect(firstTracker, `Should find tracker with id = ${expectedTracker.id}`).to.be.ok;
      expect(firstTracker).to.deep.include(expectedTracker);

      expect(newState.trackerMap?.clockRunning, 'trackerMap.clockRunning').to.be.false;
      expect(newState.trackerMap).not.to.equal(currentState.trackerMap);

      expect(newState).not.to.equal(currentState);
    });

    it('should do nothing if game does not allow period to be ended', () => {
      mockCurrentTime(startTime);

      const newState = shift(currentState, endPeriod());

      expect(newState.trackerMap?.clockRunning, 'trackerMap.clockRunning').to.be.false;
      expect(newState.trackerMap).to.equal(currentState.trackerMap);

      expect(newState).to.equal(currentState);
    });

  }); // describe('clock/endPeriod')

  describe('live/applyPendingSubs', () => {
    const nextPlayerIds = ['P12', 'P13', 'P14'];
    const onPlayerIds = ['P4', 'P5', 'P6'];
    let currentState: ShiftState;
    let players: LivePlayer[];
    let subs: LivePlayer[] = [];

    beforeEach(() => {
      players = testlive.getLivePlayers(18);
      subs = [];
      for (let i = 0; i < nextPlayerIds.length; i++) {
        const nextId = nextPlayerIds[i];
        const nextPlayer = players.find(p => (p.id === nextId))!;
        const onId = onPlayerIds[i];
        const onPlayer = players.find(p => (p.id === onId))!;

        onPlayer.status = PlayerStatus.On;

        nextPlayer.status = PlayerStatus.Next;
        nextPlayer.currentPosition = { ...onPlayer.currentPosition! };
        nextPlayer.replaces = onPlayer.id;
        subs.push(nextPlayer);
      }
      currentState = buildShiftWithTrackers(players);
    });

    function getTrackersByIds(state: ShiftState, ids: string[]) {
      return state.trackerMap?.trackers?.filter((player) => (ids.includes(player.id))) || [];
    }

    it('should sub all next players, when not selectedOnly', () => {
      // Set the start time for starting shifts.
      const timeProvider = mockTimeProvider(startTime);
      const trackerMap = new PlayerTimeTrackerMap(currentState.trackerMap, timeProvider);
      trackerMap.startShiftTimers();
      currentState.trackerMap = trackerMap.toJSON();

      // Now, mock the underlying time, to be used when changing
      // the shifts by the reducer.
      mockCurrentTime(time1);

      const newState = shift(currentState, applyPendingSubs(subs));

      // Check that the next players are now on, with timer running
      const newOnTrackers = getTrackersByIds(newState, nextPlayerIds);
      expect(newOnTrackers).to.have.length(nextPlayerIds.length, 'Number of subs');
      newOnTrackers.forEach(tracker => {
        expect(tracker).to.deep.include({
          isOn: true,
          shiftCount: 1,
          onTimer: {
            isRunning: true,
            startTime: time1,
            duration: Duration.zero().toJSON()
          }
        });
      });

      const newOffTrackers = getTrackersByIds(newState, onPlayerIds);
      expect(newOffTrackers).to.have.length(nextPlayerIds.length, 'Number of replaced');
      newOffTrackers.forEach(tracker => {
        expect(tracker).to.deep.include({
          isOn: false,
          shiftCount: 1,
          offTimer: {
            isRunning: true,
            startTime: time1,
            duration: Duration.zero().toJSON()
          }
        });
      });

      expect(newState).not.to.equal(currentState);
      expect(newState.trackerMap).not.to.equal(currentState.trackerMap);
    });

  }); // describe('live/applyPendingSubs')

}); // describe('Shift slice')
