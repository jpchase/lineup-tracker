import { CurrentTimeProvider, ManualTimeProvider } from '@app/models/clock.js';
import { LiveGame, LivePlayer } from '@app/models/live.js';
import { PlayerStatus } from '@app/models/player.js';
import { PlayerTimeTracker, PlayerTimeTrackerMap, PlayerTimeTrackerMapData } from '@app/models/shift.js';
import { Assertion } from '@esm-bundle/chai';
import { expect } from '@open-wc/testing';
import { addDurationAssertion, buildDuration, manualTimeProvider, mockTimeProvider } from '../helpers/test-clock-data.js';

declare global {
  export namespace Chai {
    interface Assertion {
      // PlayerTimeTracker
      shiftCount(expected: number): Assertion;
      shiftTime(expected: number[]): Assertion;
      totalTime(expected: number[]): Assertion;
      on(expected: string): Assertion;
      off(expected: string): Assertion;
      alreadyOn(): Assertion;
      running(): Assertion;
      // PlayerTimeTrackerMap
      initialized(): Assertion;
      size(expected: number): Assertion;
    }
  }
}

function addTimingMatchers() {
  addDurationAssertion<PlayerTimeTracker>('shiftTime', 'tracker shiftTime',
    (tracker) => (tracker ? tracker.getShiftTime() : null));
  addDurationAssertion<PlayerTimeTracker>('totalTime', 'tracker totalTime',
    (tracker) => (tracker ? tracker.getTotalTime() : null));

  Assertion.addMethod('shiftCount', function (this, expected: number) {
    const tracker = this._obj as PlayerTimeTracker;
    this.assert(
      tracker?.shiftCount === expected,
      'expected tracker shiftCount #{act} to be #{exp}',
      'expected tracker shiftCount #{act} to not be #{exp}',
      expected,
      tracker?.shiftCount,
      /*showDiff=*/false
    );
  });
}

describe('PlayerTimeTracker', () => {
  let tracker;

  addTimingMatchers();

  it('should have correct total time after shift reset', () => {
    let expected = {
      id: '1', isOn: true, alreadyOn: true, shiftCount: 1,
      totalTime: buildDuration(0, 0).toJSON(),
      onTimer: {
        isRunning: false, duration: buildDuration(0, 5).toJSON()
      }
    };

    tracker = new PlayerTimeTracker(expected);

    expect(tracker).to.have.shiftCount(1);
    expect(tracker).to.have.shiftTime([0, 5]);
    expect(tracker).to.have.totalTime([0, 5]);

    tracker.resetShiftTimes();

    expect(tracker).to.have.shiftCount(1);
    expect(tracker).to.have.shiftTime([0, 0]);
    expect(tracker).to.have.totalTime([0, 0]);
  });
});

describe('PlayerTimeTrackerMap', () => {
  const playerOnId = '1';
  const playerOffId = '2';
  const playerAltOnId = '3';
  const playerAltOffId = '4';
  const players = [
    { name: playerOnId, status: PlayerStatus.On },
    { name: playerOffId, status: PlayerStatus.Off },
    { name: playerAltOnId, status: PlayerStatus.On },
    { name: playerAltOffId, status: PlayerStatus.Off }
  ] as LivePlayer[];
  const startTime = new Date(2016, 0, 1, 14, 0, 0).getTime();
  const time1 = new Date(2016, 0, 1, 14, 0, 5).getTime();
  const time2 = new Date(2016, 0, 1, 14, 0, 10).getTime();
  const time3 = new Date(2016, 0, 1, 14, 0, 20).getTime();
  const time4 = new Date(2016, 0, 1, 14, 0, 35).getTime();

  let map: PlayerTimeTrackerMap;

  addTimingMatchers();

  Assertion.addMethod('initialized', function (this) {
    const map = this._obj as PlayerTimeTrackerMap;
    const pass = map && map.id.length && !map.clockRunning && (!map.trackers || !map.trackers.length);

    let expected = '', actual = '';
    if (!pass && map) {
      expected = JSON.stringify(PlayerTimeTrackerMap.create({ id: map.id }).toJSON());
      actual = JSON.stringify(map.toJSON());
    }

    this.assert(
      pass,
      `expected map to have clock stopped, without any trackers`,
      `expected map to have clock running, with trackers`,
      expected,
      actual
    );
  });

  Assertion.addMethod('size', function (this, expected: number) {
    const map = this._obj as PlayerTimeTrackerMap;
    const pass = (map?.trackers?.length === expected);

    let actual = '';
    if (!pass && map) {
      actual = `trackers, length = ${map.trackers.length}`;
    }

    this.assert(
      pass,
      'expected #{act} to have size #{exp}',
      'expected #{act} to not have size #{exp}',
      expected,
      actual
    );
  });

  Assertion.addMethod('on', function (this, expected: string) {
    const tracker = this._obj as PlayerTimeTracker;
    this.assert(
      tracker && tracker.id === expected && tracker.isOn,
      'expected #{this} with id = #{exp} to be on',
      'expected #{this} with id = #{exp} to not be on',
      expected
    );
  });

  Assertion.addMethod('alreadyOn', function (this, expected: string) {
    const tracker = this._obj as PlayerTimeTracker;
    this.assert(
      tracker && tracker.isOn && tracker.alreadyOn,
      'expected #{this} to be already on',
      'expected #{this} to not be already on',
      expected
    );
  });

  Assertion.addMethod('off', function (this, expected: string) {
    const tracker = this._obj as PlayerTimeTracker;
    this.assert(
      tracker && tracker.id === expected && !tracker.isOn && !tracker.alreadyOn,
      'expected #{this} with id = #{exp} to be off',
      'expected #{this} with id = #{exp} to not be off',
      expected
    );
  });

  Assertion.addMethod('running', function (this, expected: string) {
    const tracker = this._obj as PlayerTimeTracker;
    this.assert(
      tracker &&
      (tracker.isOn ?
        tracker.onTimer?.isRunning :
        tracker.offTimer?.isRunning),
      'expected #{this} to be running',
      'expected #{this} to not be running',
      expected
    );
  });

  describe('uninitialized', () => {

    it('should throw when no players to initialize', () => {
      const game = {
        id: 'gameid',
        players: [] as LivePlayer[]
      } as LiveGame;

      expect(() => {
        map = PlayerTimeTrackerMap.createFromGame(game);
      }).to.throw('Players must be provided to initialize');
    });

    it('should throw for operations', () => {
      map = PlayerTimeTrackerMap.create({ id: 'nodataid' });

      const tracker = map.get('');
      expect(tracker, 'tracker should be undefined').to.not.be.ok;
      expect(() => {
        map.startShiftTimers();
      }, 'startShiftTimers').to.throw('Map is empty');
      expect(() => {
        map.stopShiftTimers();
      }, 'stopShiftTimers').to.throw('Map is empty');
      expect(() => {
        map.substitutePlayer(playerOffId, playerOnId);
      }, 'substituePlayer').to.throw('Map is empty');
    });

  });

  describe('initialized', () => {

    beforeEach(() => {
      const game = { id: 'gameid', players } as LiveGame;
      map = PlayerTimeTrackerMap.createFromGame(game);
    });

    it('should be empty after reset', () => {
      map.reset();
      expect(map).to.be.initialized();
    });

    it('should not get trackers for non-existent ids', () => {
      let tracker = map.get(playerOnId + 'X');

      expect(tracker, 'tracker should be undefined').to.not.be.ok;
    });

    it('should have trackers with correct values', () => {
      expect(map).to.have.size(4);

      let onTracker = map.get(playerOnId);
      let offTracker = map.get(playerOffId);
      let altOnTracker = map.get(playerAltOnId);
      let altOffTracker = map.get(playerAltOffId);

      expect(onTracker).to.be.on(playerOnId);
      expect(offTracker).to.be.off(playerOffId);
      expect(altOnTracker).to.be.on(playerAltOnId);
      expect(altOffTracker).to.be.off(playerAltOffId);
    });

    it('should have shift timers running after start', () => {
      let onTracker = map.get(playerOnId);
      let offTracker = map.get(playerOffId);
      let altTracker = map.get(playerAltOffId);

      map.startShiftTimers();

      expect(onTracker).to.be.running();
      expect(onTracker!.offTimer, 'offTimer should be undefined').to.not.be.ok;
      expect(onTracker).to.have.shiftCount(1);

      expect(offTracker).to.be.running();
      expect(offTracker!.onTimer, 'onTimer should be undefined').to.not.be.ok;
      expect(offTracker).to.have.shiftCount(0);

      expect(altTracker).to.have.shiftCount(0);

    });

    it('should have shift timers stopped after stop', () => {
      let onTracker = map.get(playerOnId);
      let offTracker = map.get(playerOffId);

      map.startShiftTimers();
      map.stopShiftTimers();

      expect(onTracker).to.be.on(playerOnId);
      expect(onTracker).not.to.be.running();

      expect(offTracker).to.be.off(playerOffId);
      expect(offTracker).not.to.be.running();
    });

    describe('substitutions', () => {

      it('should throw if players are invalid', () => {
        expect(() => {
          map.substitutePlayer(playerOffId + 'X', playerOnId + 'X');
        }).to.throw('Invalid status to substitute, playerIn = undefined, playerOut = undefined');
        expect(() => {
          map.substitutePlayer(playerOnId, playerOnId);
        }).to.throw('Invalid status to substitute, playerIn = {"id":"1","isOn":true}, playerOut = {"id":"1","isOn":true}');
      });

      it('should have shift timers changed after sub', () => {
        let onTracker = map.get(playerOnId);
        let offTracker = map.get(playerOffId);
        let altTracker = map.get(playerAltOffId);

        map.startShiftTimers();
        map.substitutePlayer(playerOffId, playerOnId);

        expect(onTracker).to.be.off(playerOnId);
        expect(onTracker).to.be.running();

        expect(offTracker).to.be.on(playerOffId);
        expect(offTracker).to.be.running();

        expect(altTracker).to.be.off(playerAltOffId);
        expect(altTracker).to.be.running();
      });

      it('should have shift timers with same time after multiple subs', () => {
        let onTracker = map.get(playerOnId);
        let offTracker = map.get(playerOffId);
        let altOnTracker = map.get(playerAltOnId);
        let altOffTracker = map.get(playerAltOffId);

        map.startShiftTimers();
        map.substitutePlayers([
          { in: playerOffId, out: playerOnId },
          { in: playerAltOffId, out: playerAltOnId }
        ]);

        expect(onTracker).to.be.off(playerOnId);
        expect(onTracker).to.be.running();

        expect(offTracker).to.be.on(playerOffId);
        expect(offTracker).to.be.running();

        expect(altOnTracker).to.be.off(playerAltOnId);
        expect(altOnTracker).to.be.running();

        expect(altOffTracker).to.be.on(playerAltOffId);
        expect(altOffTracker).to.be.running();

        expect(altOnTracker?.onTimer?.startTime).to.equal(
          onTracker?.onTimer?.startTime);
        expect(offTracker?.offTimer?.startTime).to.equal(
          onTracker?.onTimer?.startTime);
        expect(altOffTracker?.offTimer?.startTime).to.equal(
          onTracker?.onTimer?.startTime);
      });

      it('should have shift counts changed after sub', () => {
        expect(map).to.have.size(4);

        let onTracker = map.get(playerOnId);
        let offTracker = map.get(playerOffId);
        let altTracker = map.get(playerAltOffId);

        map.startShiftTimers();
        map.substitutePlayer(playerOffId, playerOnId);

        expect(onTracker).to.have.shiftCount(1);
        expect(offTracker).to.have.shiftCount(1);
        expect(altTracker).to.have.shiftCount(0);
      });

      it('should have shift timers changed after sub with clock stopped, but not be running', () => {
        let onTracker = map.get(playerOnId);
        let offTracker = map.get(playerOffId);

        // Verify substitution before starting the clock
        map.substitutePlayer(playerOffId, playerOnId);

        expect(onTracker).to.be.off(playerOnId);
        expect(onTracker).not.to.be.running();

        expect(offTracker).to.be.on(playerOffId);
        expect(offTracker).not.to.be.running();

        map.startShiftTimers();

        map.stopShiftTimers();

        // Verify substitution after starting and stopping the clock
        map.substitutePlayer(playerOnId, playerOffId);

        expect(onTracker).to.be.on(playerOnId);
        expect(onTracker).not.to.be.running();

        expect(offTracker).to.be.off(playerOffId);
        expect(offTracker).not.to.be.running();
      });
    }); // describe('substitutions')

  }); // describe('initialized')

  describe('Shift timing', () => {

    function initMapWithProvider(provider: CurrentTimeProvider | undefined) {
      const game = { id: 'gameid', players } as LiveGame;
      map = PlayerTimeTrackerMap.createFromGame(game, provider);
      expect(map).to.have.size(4);
    }

    function initMapWithTime(t0?: number, t1?: number, t2?: number, t3?: number) {
      const provider = mockTimeProvider(t0 || 0, t1, t2, t3);
      initMapWithProvider(provider);
      return provider;
    }

    function initMapWithManualTime() {
      const provider = new ManualTimeProvider();
      initMapWithProvider(provider);
      return provider;
    }

    it('should have zero shift time before starting', () => {
      initMapWithTime();

      let onTracker = map.get(playerOnId);
      let offTracker = map.get(playerOffId);

      expect(onTracker).to.have.shiftTime([0, 0]);
      expect(offTracker).to.have.shiftTime([0, 0]);
    });

    it('should have zero total time before starting', () => {
      initMapWithTime();

      let onTracker = map.get(playerOnId);
      let offTracker = map.get(playerOffId);

      expect(onTracker).to.have.totalTime([0, 0]);
      expect(offTracker).to.have.totalTime([0, 0]);
    });

    it('should have zero shift counts before starting', () => {
      initMapWithTime();

      let onTracker = map.get(playerOnId);
      let offTracker = map.get(playerOffId);

      expect(onTracker).to.have.shiftCount(0);
      expect(offTracker).to.have.shiftCount(0);
    });

    it('should have correct shift time after start', () => {
      const provider = initMapWithTime(startTime, time1);

      let onTracker = map.get(playerOnId);
      let offTracker = map.get(playerOffId);

      map.startShiftTimers();

      provider.freeze();
      expect(onTracker).to.have.shiftTime([0, 5]);
      expect(offTracker).to.have.shiftTime([0, 5]);
    });

    it('should have correct total time after start', () => {
      const provider = initMapWithTime(startTime, time1);

      let onTracker = map.get(playerOnId);
      let offTracker = map.get(playerOffId);

      map.startShiftTimers();

      provider.freeze();
      expect(onTracker).to.have.totalTime([0, 5]);
      expect(offTracker).to.have.totalTime([0, 0]);
    });

    it('should have correct shift counts after start', () => {
      initMapWithTime(startTime, time1);

      let onTracker = map.get(playerOnId);
      let offTracker = map.get(playerOffId);

      map.startShiftTimers();

      expect(onTracker).to.have.shiftCount(1);
      expect(onTracker).to.be.alreadyOn();
      expect(offTracker).to.have.shiftCount(0);
    });

    it('should have correct shift time after stop', () => {
      const provider = initMapWithTime(startTime, time1, time2);

      let onTracker = map.get(playerOnId);
      let offTracker = map.get(playerOffId);

      map.startShiftTimers();
      map.stopShiftTimers();

      provider.freeze();
      expect(onTracker).to.have.shiftTime([0, 5]);
      expect(offTracker).to.have.shiftTime([0, 5]);
    });

    it('should have correct total time after stop', () => {
      const provider = initMapWithTime(startTime, time1, time2);

      let onTracker = map.get(playerOnId);
      let offTracker = map.get(playerOffId);

      map.startShiftTimers();
      map.stopShiftTimers();

      provider.freeze();
      expect(onTracker).to.have.totalTime([0, 5]);
      expect(offTracker).to.have.totalTime([0, 0]);
    });

    it('should have correct shift counts after stop', () => {
      initMapWithTime(startTime, time1, time2);

      let onTracker = map.get(playerOnId);
      let offTracker = map.get(playerOffId);

      map.startShiftTimers();
      map.stopShiftTimers();

      expect(onTracker).to.have.shiftCount(1);
      expect(onTracker).to.be.alreadyOn();
      expect(offTracker).to.have.shiftCount(0);
    });

    it('should have correct total time after multiple start/stop', () => {
      const provider = initMapWithManualTime();

      let onTracker = map.get(playerOnId);
      let offTracker = map.get(playerOffId);

      provider.setCurrentTime(startTime);
      map.startShiftTimers();

      provider.setCurrentTime(time1);
      map.stopShiftTimers();

      provider.freeze();
      expect(onTracker).to.have.totalTime([0, 5]);
      expect(offTracker).to.have.totalTime([0, 0]);
      provider.unfreeze();

      // Start/stop with no time elapsed
      provider.setCurrentTime(time2);
      map.startShiftTimers();
      map.stopShiftTimers();

      // Total time should be unchanged
      provider.freeze();
      expect(onTracker).to.have.totalTime([0, 5]);
      expect(offTracker).to.have.totalTime([0, 0]);
      provider.unfreeze();

      // Advance time
      provider.setCurrentTime(time3);
      map.startShiftTimers();

      provider.setCurrentTime(time4);
      map.stopShiftTimers();

      provider.freeze();
      expect(onTracker).to.have.totalTime([0, 20]);
      expect(offTracker).to.have.totalTime([0, 0]);
      provider.unfreeze();
    });

    it('should have correct shift counts after multiple start/stop', () => {
      initMapWithTime(startTime, time1, time2, time3);

      let onTracker = map.get(playerOnId);
      let offTracker = map.get(playerOffId);

      map.startShiftTimers();
      map.stopShiftTimers();

      expect(onTracker).to.have.shiftCount(1);
      expect(onTracker).to.be.alreadyOn();
      expect(offTracker).to.have.shiftCount(0);

      map.startShiftTimers();
      map.stopShiftTimers();

      expect(onTracker).to.have.shiftCount(1);
      expect(onTracker).to.be.alreadyOn();
      expect(offTracker).to.have.shiftCount(0);

      map.startShiftTimers();
      map.stopShiftTimers();

      expect(onTracker).to.have.shiftCount(1);
      expect(onTracker).to.be.alreadyOn();
      expect(offTracker).to.have.shiftCount(0);
    });

    it('should have shift times restarted after sub', () => {
      const provider = initMapWithTime(startTime, time1, time2);

      let onTracker = map.get(playerOnId);
      let offTracker = map.get(playerOffId);

      map.startShiftTimers();
      map.substitutePlayer(playerOffId, playerOnId);

      provider.freeze();
      expect(onTracker).to.have.shiftTime([0, 5]);
      expect(offTracker).to.have.shiftTime([0, 5]);
    });

    it('should have total times restarted after sub', () => {
      const provider = initMapWithTime(startTime, time1, time2);

      let onTracker = map.get(playerOnId);
      let offTracker = map.get(playerOffId);

      map.startShiftTimers();
      map.substitutePlayer(playerOffId, playerOnId);

      provider.freeze();
      expect(onTracker).to.have.totalTime([0, 5]);
      expect(offTracker).to.have.totalTime([0, 5]);
    });

    it('should have shift counts incremented after sub', () => {
      initMapWithTime(startTime, time1, time2);

      let onTracker = map.get(playerOnId);
      let offTracker = map.get(playerOffId);

      map.startShiftTimers();
      map.substitutePlayer(playerOffId, playerOnId);

      expect(onTracker).to.have.shiftCount(1);
      expect(onTracker).not.to.be.alreadyOn();
      expect(offTracker).to.have.shiftCount(1);
      expect(offTracker).to.be.alreadyOn();
    });

    it('should have shift times at zero after sub with clock stopped', () => {
      const provider = initMapWithTime(startTime, time1, time2);

      let onTracker = map.get(playerOnId);
      let offTracker = map.get(playerOffId);

      // Verify substitution before starting the clock
      map.substitutePlayer(playerOffId, playerOnId);

      expect(onTracker).to.have.shiftTime([0, 0]);
      expect(offTracker).to.have.shiftTime([0, 0]);

      map.startShiftTimers();
      map.stopShiftTimers();

      provider.freeze();
      expect(onTracker).to.have.shiftTime([0, 5]);
      expect(offTracker).to.have.shiftTime([0, 5]);
      provider.unfreeze();

      // Verify substitution after starting and stopping the clock
      map.substitutePlayer(playerOnId, playerOffId);

      expect(onTracker).to.have.shiftTime([0, 0]);
      expect(offTracker).to.have.shiftTime([0, 0]);
    });

    it('should have total times at zero after sub with clock stopped', () => {
      const provider = initMapWithTime(startTime, time1, time2);

      let onTracker = map.get(playerOnId);
      let offTracker = map.get(playerOffId);

      // Verify substitution before starting the clock
      map.substitutePlayer(playerOffId, playerOnId);

      expect(onTracker).to.have.totalTime([0, 0]);
      expect(offTracker).to.have.totalTime([0, 0]);

      map.startShiftTimers();
      map.stopShiftTimers();

      provider.freeze();
      expect(onTracker).to.have.totalTime([0, 0]);
      expect(offTracker).to.have.totalTime([0, 5]);
      provider.unfreeze();

      // Verify substitution after starting and stopping the clock
      map.substitutePlayer(playerOnId, playerOffId);

      provider.freeze();
      expect(onTracker).to.have.totalTime([0, 0]);
      expect(offTracker).to.have.totalTime([0, 5]);
    });

    it('should have shift counts at zero after sub with clock stopped', () => {
      const provider = initMapWithTime(startTime, time1, time2, time2);

      let onTracker = map.get(playerOnId);
      let offTracker = map.get(playerOffId);

      // Verify substitution before starting the clock
      map.substitutePlayer(playerOffId, playerOnId);

      expect(onTracker).to.have.shiftCount(0);
      expect(onTracker).not.to.be.alreadyOn();
      expect(offTracker).to.have.shiftCount(0);
      expect(offTracker).not.to.be.alreadyOn();

      map.startShiftTimers();
      map.stopShiftTimers();

      provider.freeze();
      expect(onTracker).to.have.shiftCount(0);
      expect(offTracker).to.have.shiftCount(1);
      provider.unfreeze();

      // Verify substitution after starting and stopping the clock
      map.substitutePlayer(playerOnId, playerOffId);

      expect(onTracker).to.have.shiftCount(0);
      expect(onTracker).not.to.be.alreadyOn();
      expect(offTracker).to.have.shiftCount(1);

      map.startShiftTimers();

      expect(onTracker).to.have.shiftCount(1);
      expect(offTracker).to.have.shiftCount(1);
    });

    it('should have correct shift time after subs with clock running then stopped', () => {
      const provider = initMapWithManualTime();

      let onTracker = map.get(playerOnId);
      let offTracker = map.get(playerOffId);

      provider.setCurrentTime(startTime);
      map.startShiftTimers();

      // First substitution, clock running
      provider.incrementCurrentTime(buildDuration(0, 5));

      expect(onTracker).to.have.shiftTime([0, 5]);
      expect(offTracker).to.have.shiftTime([0, 5]);

      map.substitutePlayer(playerOffId, playerOnId);

      provider.incrementCurrentTime(buildDuration(0, 5));

      expect(onTracker).to.have.shiftTime([0, 5]);
      expect(offTracker).to.have.shiftTime([0, 5]);

      // Second substitution, clock stopped
      map.stopShiftTimers();

      expect(onTracker).to.have.shiftTime([0, 5]);
      expect(offTracker).to.have.shiftTime([0, 5]);

      map.substitutePlayer(playerOnId, playerOffId);

      expect(onTracker).to.have.shiftTime([0, 0]);
      expect(offTracker).to.have.shiftTime([0, 0]);

      provider.incrementCurrentTime(buildDuration(0, 15));

      expect(onTracker).to.have.shiftTime([0, 0]);
      expect(offTracker).to.have.shiftTime([0, 0]);

      map.startShiftTimers();

      provider.incrementCurrentTime(buildDuration(0, 20));

      expect(onTracker).to.have.shiftTime([0, 20]);
      expect(offTracker).to.have.shiftTime([0, 20]);
    });

    it('should have correct total time after multiple subs', () => {
      const provider = initMapWithManualTime();

      let onTracker = map.get(playerOnId);
      let offTracker = map.get(playerOffId);

      provider.setCurrentTime(startTime);
      map.startShiftTimers();

      // First substitution
      provider.incrementCurrentTime(buildDuration(0, 5));

      expect(onTracker).to.have.totalTime([0, 5]);
      expect(offTracker).to.have.totalTime([0, 0]);

      map.substitutePlayer(playerOffId, playerOnId);

      provider.incrementCurrentTime(buildDuration(0, 5));

      expect(onTracker).to.have.totalTime([0, 5]);
      expect(offTracker).to.have.totalTime([0, 5]);

      // Second substitution
      provider.incrementCurrentTime(buildDuration(0, 10));

      expect(onTracker).to.have.totalTime([0, 5]);
      expect(offTracker).to.have.totalTime([0, 15]);

      map.substitutePlayer(playerOnId, playerOffId);

      provider.incrementCurrentTime(buildDuration(0, 15));

      expect(onTracker).to.have.totalTime([0, 20]);
      expect(offTracker).to.have.totalTime([0, 15]);

      // Third substitution
      provider.incrementCurrentTime(buildDuration(0, 10));

      expect(onTracker).to.have.totalTime([0, 30]);
      expect(offTracker).to.have.totalTime([0, 15]);

      map.substitutePlayer(playerOffId, playerOnId);

      provider.incrementCurrentTime(buildDuration(0, 25));

      expect(onTracker).to.have.totalTime([0, 30]);
      expect(offTracker).to.have.totalTime([0, 40]);
    });

  }); // describe('Shift timing')

  describe('Existing data', () => {

    it('should not have the time provider serialized', () => {
      let data = {
        id: 'someid',
        trackers: [
          { id: playerOnId, isOn: true },
          { id: playerOffId, isOn: false },
        ],
      }
      map = PlayerTimeTrackerMap.create(data);

      expect(map).to.have.size(2);
      expect(map.clockRunning).to.be.false;
      expect(map.timeProvider).to.be.ok;
      map.trackers.forEach(tracker => {
        expect(tracker.timeProvider).to.be.ok;
      });

      const serialized = JSON.stringify(map);
      let mapData = JSON.parse(serialized);

      expect(mapData.clockRunning).to.be.false;
      expect(mapData.trackers).to.be.ok;
      expect(mapData.trackers.length).to.equal(2);
      expect(mapData.timeProvider).not.to.be.ok;
      mapData.trackers.forEach((tracker: any) => {
        expect(tracker.timeProvider).not.to.be.ok;
      });
    });

    it('should throw if no id provided in data', () => {
      expect(() => {
        map = PlayerTimeTrackerMap.create({} as PlayerTimeTrackerMapData);
      }).to.throw('id must be provided');
      expect(() => {
        map = PlayerTimeTrackerMap.create({ id: '' });
      }).to.throw('id must be provided');
    });

    it('should be initialized correctly for empty data', () => {
      map = PlayerTimeTrackerMap.create({ id: 'nodataid' });
      expect(map).to.be.initialized();
    });

    it('should be serialized correctly for empty data', () => {
      map = PlayerTimeTrackerMap.create({ id: 'nodataid' });
      const mapData = map.toJSON();
      expect(mapData).to.deep.equal({
        id: 'nodataid',
        clockRunning: false,
        trackers: []
      });
    });

    it('should be initialized correctly from live game', () => {
      const game = { id: 'thegameid', players } as LiveGame;
      map = PlayerTimeTrackerMap.createFromGame(game);

      expect(map.id).to.equal('thegameid');
      expect(map).to.have.size(4);
      expect(map.clockRunning).to.be.false;

      let onTracker = map.get(playerOnId);
      let offTracker = map.get(playerOffId);

      expect(onTracker).to.be.on(playerOnId);
      expect(onTracker).not.to.be.running();
      expect(onTracker).to.have.shiftCount(0);

      expect(offTracker).to.be.off(playerOffId);
      expect(offTracker).not.to.be.running();
      expect(offTracker).to.have.shiftCount(0);
    });

    it('should be initialized correctly from stopped data', () => {
      let expected = {
        id: 'stoppedgameid',
        clockRunning: false,
        trackers: [
          { id: playerOnId, isOn: true, alreadyOn: true, shiftCount: 1 },
          { id: playerOffId, isOn: false },
        ],
      }
      map = PlayerTimeTrackerMap.create(expected);

      expect(map).to.have.size(2);
      expect(map.clockRunning).to.be.false;

      let onTracker = map.get(playerOnId);
      let offTracker = map.get(playerOffId);

      expect(onTracker).to.be.on(playerOnId);
      expect(onTracker).to.be.alreadyOn();
      expect(onTracker).not.to.be.running();
      expect(onTracker).to.have.shiftCount(1);

      expect(offTracker).to.be.off(playerOffId);
      expect(offTracker).not.to.be.running();
      expect(offTracker).to.have.shiftCount(0);
    });

    it('should be initialized correctly from stopped data, with duration', () => {
      let expected = {
        id: 'stoppedgameid',
        clockRunning: false,
        trackers: [
          {
            id: playerOnId, isOn: true, alreadyOn: true, shiftCount: 1,
            totalTime: buildDuration(0, 0).toJSON(),
            onTimer: {
              isRunning: false, duration: buildDuration(0, 5).toJSON()
            }
          },
          {
            id: playerOffId, isOn: false, alreadyOn: false, shiftCount: 0,
            totalTime: buildDuration(0, 0).toJSON(),
            offTimer: {
              isRunning: false, duration: buildDuration(0, 5).toJSON()
            }
          },
        ],
      }
      map = PlayerTimeTrackerMap.create(expected);

      expect(map).to.have.size(2);
      expect(map.clockRunning).to.be.false;

      let onTracker = map.get(playerOnId);
      let offTracker = map.get(playerOffId);

      expect(onTracker).to.be.on(playerOnId);
      expect(onTracker).not.to.be.running();
      expect(onTracker).to.be.alreadyOn();
      expect(onTracker).to.have.shiftCount(1);
      expect(onTracker).to.have.shiftTime([0, 5]);
      expect(onTracker).to.have.totalTime([0, 5]);

      expect(offTracker).to.be.off(playerOffId);
      expect(offTracker).not.to.be.running();
      expect(offTracker).to.have.shiftCount(0);
      expect(offTracker).to.have.shiftTime([0, 5]);
      expect(offTracker).to.have.totalTime([0, 0]);
    });

    it('should be serialized correctly after starting and stopping', () => {
      let expected = {
        id: 'serializedgameid',
        clockRunning: false,
        trackers: [
          {
            id: playerOnId, isOn: true, alreadyOn: true, shiftCount: 1,
            totalTime: buildDuration(0, 0).toJSON(),
            onTimer: {
              isRunning: false, startTime: undefined, duration: buildDuration(0, 5).toJSON()
            }
          },
          {
            id: playerOffId, isOn: false, alreadyOn: false, shiftCount: 0,
            totalTime: buildDuration(0, 0).toJSON(),
            offTimer: {
              isRunning: false, startTime: undefined, duration: buildDuration(0, 5).toJSON()
            }
          },
        ],
      }
      map = PlayerTimeTrackerMap.create(expected);

      const mapData = map.toJSON();
      expect(mapData).to.deep.equal(expected);
    });

    it('should be initialized correctly from running data', () => {
      let expected = {
        id: 'runninggameid',
        clockRunning: true,
        trackers: [
          {
            id: playerOnId, isOn: true, alreadyOn: true, shiftCount: 2,
            totalTime: buildDuration(0, 5).toJSON(),
            onTimer: {
              isRunning: true, startTime: startTime, duration: buildDuration(0, 5).toJSON()
            }
          },
          {
            id: playerOffId, isOn: false, alreadyOn: false, shiftCount: 1,
            totalTime: buildDuration(0, 5).toJSON(),
            offTimer: {
              isRunning: true, startTime: startTime, duration: buildDuration(0, 5).toJSON()
            }
          },
        ],
      }
      // Current time is 5 seconds after the start time in saved data
      const provider = manualTimeProvider(time1);

      map = PlayerTimeTrackerMap.create(expected, provider);

      expect(map).to.have.size(2);
      expect(map.clockRunning).to.be.true;

      let onTracker = map.get(playerOnId);
      let offTracker = map.get(playerOffId);

      expect(onTracker).to.be.on(playerOnId);
      expect(onTracker).to.be.running();
      expect(onTracker).to.be.alreadyOn();
      expect(onTracker).to.have.shiftCount(2);
      expect(onTracker).to.have.shiftTime([0, 10]);
      expect(onTracker).to.have.totalTime([0, 15]);

      expect(offTracker).to.be.off(playerOffId);
      expect(offTracker).to.be.running();
      expect(offTracker).to.have.shiftCount(1);
      expect(offTracker).to.have.shiftTime([0, 10]);
      expect(offTracker).to.have.totalTime([0, 5]);
    });

    it('should be serialized correctly when running', () => {
      let expected = {
        id: 'runninggameid',
        clockRunning: true,
        trackers: [
          {
            id: playerOnId, isOn: true, alreadyOn: true, shiftCount: 2,
            totalTime: buildDuration(0, 5).toJSON(),
            onTimer: {
              isRunning: true, startTime: startTime, duration: buildDuration(0, 5).toJSON()
            }
          },
          {
            id: playerOffId, isOn: false, alreadyOn: false, shiftCount: 1,
            totalTime: buildDuration(0, 5).toJSON(),
            offTimer: {
              isRunning: true, startTime: startTime, duration: buildDuration(0, 5).toJSON()
            }
          },
        ],
      }
      // Current time is 5 seconds after the start time in saved data
      const provider = manualTimeProvider(time1);

      map = PlayerTimeTrackerMap.create(expected, provider);

      const mapData = map.toJSON();
      expect(mapData).to.deep.equal(expected);
    });

  }); // describe('Existing data')

});
