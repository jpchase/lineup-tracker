import {CurrentTimeProvider, ManualTimeProvider} from '../app/scripts/clock.js';
import {PlayerTimeTracker, PlayerTimeTrackerMap} from '../app/scripts/shift.js';

function isElapsedEqual(actual, expected) {
  if (!actual || !expected)
    return false;

  if (!actual.length || !expected.length ||
      expected.length !== 2 ||
      actual.length < expected.length)
    return false;

  for (var i = 0; i < expected.length; i++) {
    if (expected[i] != actual[i])
      return false;
  }
  return true;
}

function getTimingMatchers() {
  return {
    toHaveShiftTime: function () {
      return {
        compare: function (actual, expected) {
          let tracker = actual;
          let elapsed = tracker ? tracker.getShiftTime() : null;

          return {
            pass: elapsed && isElapsedEqual(elapsed, expected)
          };
        }
      };
    },
    toHaveTotalTime: function () {
      return {
        compare: function (actual, expected) {
          let tracker = actual;
          let elapsed = tracker ? tracker.getTotalTime() : null;

          return {
            pass: elapsed && isElapsedEqual(elapsed, expected)
          };
        }
      };
    },
    toHaveShiftCount: function () {
      return {
        compare: function (actual, expected) {
          let tracker = actual;

          return {
            pass: tracker && tracker.shiftCount === expected
          };
        }
      };
    },
  };
}

describe('PlayerTimeTracker', () => {
  let tracker;

  beforeEach(() => {
    jasmine.addMatchers(getTimingMatchers());
  });

  it('should have correct total time after shift reset', () => {
    let expected = {
      id: 1, isOn: true, alreadyOn: true, shiftCount: 1,
      totalTime: [0,0],
      onTimer: {
        isRunning: false, duration: [0,5]
      }
    };

    tracker = new PlayerTimeTracker(expected);

    expect(tracker).toHaveShiftCount(1);
    expect(tracker).toHaveShiftTime([0, 5]);
    expect(tracker).toHaveTotalTime([0, 5]);

    tracker.addShiftToTotal();

    tracker.resetShiftTimes();

    expect(tracker).toHaveShiftCount(1);
    expect(tracker).toHaveShiftTime([0, 0]);
    expect(tracker).toHaveTotalTime([0, 5]);
  });
});

describe('PlayerTimeTrackerMap', () => {
  const playerOnId = 1;
  const playerOffId = 2;
  const playerAltId = 3;
  const players = [
    {name: playerOnId, status: 'ON'},
    {name: playerOffId, status: 'OFF'},
    {name: playerAltId, status: 'OFF'}
  ];
  const startTime = new Date(2016, 0, 1, 14, 0, 0);
  const time1 = new Date(2016, 0, 1, 14, 0, 5);
  const time2 = new Date(2016, 0, 1, 14, 0, 10);
  const time3 = new Date(2016, 0, 1, 14, 0, 20);
  const time4 = new Date(2016, 0, 1, 14, 0, 35);
  const time5 = new Date(2016, 0, 1, 14, 0, 45);

  let map;

  function mockTimeProvider(t0, t1, t2, t3) {
    let provider = new CurrentTimeProvider();
    spyOn(provider, 'getTimeInternal').and.returnValues(t0, t1, t2, t3);
    return provider;
  }

  function manualTimeProvider(currentTime) {
    let provider = new ManualTimeProvider();
    if (currentTime) {
      provider.setCurrentTime(currentTime);
    }
    return provider;
  }

  beforeEach(() => {
    map = new PlayerTimeTrackerMap();

    jasmine.addMatchers(getTimingMatchers());
    jasmine.addMatchers({
      toBeInitialized: function () {
        return {
          compare: function (actual, expected) {
            let map = actual;

            return {
              pass: map && !map.clockRunning && !map.trackers
            };
          }
        };
      },
      toHaveSize: function () {
        return {
          compare: function (actual, expected) {
            let map = actual;

            return {
              pass: map && map.trackers && map.trackers.length === expected
            };
          }
        };
      },
      toBeOn: function () {
        return {
          compare: function (actual, expected) {
            let tracker = actual;

            return {
              pass: tracker && tracker.id === expected && tracker.isOn
            };
          }
        };
      },
      toBeAlreadyOn: function () {
        return {
          compare: function (actual, expected) {
            let tracker = actual;

            return {
              pass: tracker && tracker.isOn && tracker.alreadyOn
            };
          }
        };
      },
      toBeOff: function () {
        return {
          compare: function (actual, expected) {
            let tracker = actual;

            return {
              pass: tracker && tracker.id === expected && !tracker.isOn && !tracker.alreadyOn
            };
          }
        };
      },
      toBeRunning: function () {
        return {
          compare: function (actual, expected) {
            let tracker = actual;

            return {
              pass: tracker &&
                    (tracker.isOn ? tracker.onTimer : tracker.offTimer) &&
                    (tracker.isOn ?
                        tracker.onTimer.isRunning :
                        tracker.offTimer.isRunning)
            };
          }
        };
      },
    });

  });

  describe('uninitialized', () => {

    it('should be empty', () => {
      expect(map).toBeInitialized();
    });

    it('should throw when no players to initialize', () => {
      expect(() => {
        map.initialize();
      }).toThrowError('Players must be provided to initialize');
      expect(() => {
        map.initialize([]);
      }).toThrowError('Players must be provided to initialize');
    });

    it('should throw for operations', () => {
      const tracker = map.get();
      expect(tracker).toBe(undefined);
      expect(() => {
        map.startShiftTimers();
      }).toThrowError('Map is empty');
      expect(() => {
        map.stopShiftTimers();
      }).toThrowError('Map is empty');
      expect(() => {
        map.totalShiftTimers();
      }).toThrowError('Map is empty');
      expect(() => {
        map.substitutePlayer(playerOffId, playerOnId);
      }).toThrowError('Map is empty');
    });

  });

  describe('initialized', () => {

    beforeEach(() => {
      map.initialize(players);
    });

    it('should be empty after reset', () => {
      map.reset();
      expect(map).toBeInitialized();
    });

    it('should not get trackers for non-existent ids', () => {
      let tracker = map.get(playerOnId + 'X');

      expect(tracker).toBe(undefined);
    });

    it('should have trackers with correct values', () => {
      expect(map).toHaveSize(3);

      let onTracker = map.get(playerOnId);
      let offTracker = map.get(playerOffId);
      let altTracker = map.get(playerAltId);

      expect(onTracker).toBeOn(playerOnId);
      expect(offTracker).toBeOff(playerOffId);
      expect(altTracker).toBeOff(playerAltId);
    });

    it('should have shift timers running after start', () => {
      let onTracker = map.get(playerOnId);
      let offTracker = map.get(playerOffId);
      let altTracker = map.get(playerAltId);

      map.startShiftTimers();

      expect(onTracker).toBeRunning();
      expect(onTracker.offTimer).toBe(null);
      expect(onTracker).toHaveShiftCount(1);

      expect(offTracker).toBeRunning();
      expect(offTracker.onTimer).toBe(null);
      expect(offTracker).toHaveShiftCount(0);

      expect(altTracker).toHaveShiftCount(0);

    });

    it('should have shift timers stopped after stop', () => {
      let onTracker = map.get(playerOnId);
      let offTracker = map.get(playerOffId);

      map.startShiftTimers();
      map.stopShiftTimers();

      expect(onTracker).toBeOn(playerOnId);
      expect(onTracker).not.toBeRunning();

      expect(offTracker).toBeOff(playerOffId);
      expect(offTracker).not.toBeRunning();
    });

    describe('substitutions', () => {

      it('should throw if players are invalid', () => {
        expect(() => {
          map.substitutePlayer(playerOffId + 'X', playerOnId + 'X');
        }).toThrowError('Invalid status to substitute, playerIn = undefined, playerOut = undefined');
        expect(() => {
          map.substitutePlayer(playerOnId, playerOnId);
        }).toThrowError('Invalid status to substitute, playerIn = {"id":1,"isOn":true}, playerOut = {"id":1,"isOn":true}');
      });

      it('should have shift timers changed after sub', () => {
        let onTracker = map.get(playerOnId);
        let offTracker = map.get(playerOffId);
        let altTracker = map.get(playerAltId);

        map.startShiftTimers();
        map.substitutePlayer(playerOffId, playerOnId);

        expect(onTracker).toBeOff(playerOnId);
        expect(onTracker).toBeRunning();

        expect(offTracker).toBeOn(playerOffId);
        expect(offTracker).toBeRunning();

        expect(altTracker).toBeOff(playerAltId);
        expect(altTracker).toBeRunning();
      });

      it('should have shift counts changed after sub', () => {
        expect(map).toHaveSize(3);

        let onTracker = map.get(playerOnId);
        let offTracker = map.get(playerOffId);
        let altTracker = map.get(playerAltId);

        map.startShiftTimers();
        map.substitutePlayer(playerOffId, playerOnId);

        expect(onTracker).toHaveShiftCount(1);
        expect(offTracker).toHaveShiftCount(1);
        expect(altTracker).toHaveShiftCount(0);
      });

      it('should have shift timers changed after sub with clock stopped, but not be running', () => {
        let onTracker = map.get(playerOnId);
        let offTracker = map.get(playerOffId);

        // Verify substitution before starting the clock
        map.substitutePlayer(playerOffId, playerOnId);

        expect(onTracker).toBeOff(playerOnId);
        expect(onTracker).not.toBeRunning();

        expect(offTracker).toBeOn(playerOffId);
        expect(offTracker).not.toBeRunning();

        map.startShiftTimers();

        map.stopShiftTimers();

        // Verify substitution after starting and stopping the clock
        map.substitutePlayer(playerOnId, playerOffId);

        expect(onTracker).toBeOn(playerOnId);
        expect(onTracker).not.toBeRunning();

        expect(offTracker).toBeOff(playerOffId);
        expect(offTracker).not.toBeRunning();
      });
    }); // describe('substitutions')

  }); // describe('initialized')

  describe('Shift timing', () => {

    function initMapWithProvider(provider) {
      map = new PlayerTimeTrackerMap(null, provider);
      map.initialize(players);
      expect(map).toHaveSize(3);
    }

    function initMapWithTime(t0, t1, t2, t3) {
      const provider = mockTimeProvider(t0, t1, t2, t3);
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

      expect(onTracker).toHaveShiftTime([0, 0]);
      expect(offTracker).toHaveShiftTime([0, 0]);
    });

    it('should have zero total time before starting', () => {
      initMapWithTime();

      let onTracker = map.get(playerOnId);
      let offTracker = map.get(playerOffId);

      expect(onTracker).toHaveTotalTime([0, 0]);
      expect(offTracker).toHaveTotalTime([0, 0]);
    });

    it('should have zero shift counts before starting', () => {
      initMapWithTime();

      let onTracker = map.get(playerOnId);
      let offTracker = map.get(playerOffId);

      expect(onTracker).toHaveShiftCount(0);
      expect(offTracker).toHaveShiftCount(0);
    });

    it('should have correct shift time after start', () => {
      const provider = initMapWithTime(startTime, time1);

      let onTracker = map.get(playerOnId);
      let offTracker = map.get(playerOffId);

      map.startShiftTimers();

      provider.freeze();
      expect(onTracker).toHaveShiftTime([0, 5]);
      expect(offTracker).toHaveShiftTime([0, 5]);
    });

    it('should have correct total time after start', () => {
      const provider = initMapWithTime(startTime, time1);

      let onTracker = map.get(playerOnId);
      let offTracker = map.get(playerOffId);

      map.startShiftTimers();

      provider.freeze();
      expect(onTracker).toHaveTotalTime([0, 5]);
      expect(offTracker).toHaveTotalTime([0, 0]);
    });

    it('should have correct shift counts after start', () => {
      const provider = initMapWithTime(startTime, time1);

      let onTracker = map.get(playerOnId);
      let offTracker = map.get(playerOffId);

      map.startShiftTimers();

      expect(onTracker).toHaveShiftCount(1);
      expect(onTracker).toBeAlreadyOn();
      expect(offTracker).toHaveShiftCount(0);
    });

    it('should have correct shift time after stop', () => {
      const provider = initMapWithTime(startTime, time1, time2);

      let onTracker = map.get(playerOnId);
      let offTracker = map.get(playerOffId);

      map.startShiftTimers();
      map.stopShiftTimers();

      provider.freeze();
      expect(onTracker).toHaveShiftTime([0, 5]);
      expect(offTracker).toHaveShiftTime([0, 5]);
    });

    it('should have correct total time after stop', () => {
      const provider = initMapWithTime(startTime, time1, time2);

      let onTracker = map.get(playerOnId);
      let offTracker = map.get(playerOffId);

      map.startShiftTimers();
      map.stopShiftTimers();

      provider.freeze();
      expect(onTracker).toHaveTotalTime([0, 5]);
      expect(offTracker).toHaveTotalTime([0, 0]);
    });

    it('should have correct shift counts after stop', () => {
      const provider = initMapWithTime(startTime, time1, time2);

      let onTracker = map.get(playerOnId);
      let offTracker = map.get(playerOffId);

      map.startShiftTimers();
      map.stopShiftTimers();

      expect(onTracker).toHaveShiftCount(1);
      expect(onTracker).toBeAlreadyOn();
      expect(offTracker).toHaveShiftCount(0);
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
      expect(onTracker).toHaveTotalTime([0, 5]);
      expect(offTracker).toHaveTotalTime([0, 0]);
      provider.unfreeze();

      // Start/stop with no time elapsed
      provider.setCurrentTime(time2);
      map.startShiftTimers();
      map.stopShiftTimers();

      // Total time should be unchanged
      provider.freeze();
      expect(onTracker).toHaveTotalTime([0, 5]);
      expect(offTracker).toHaveTotalTime([0, 0]);
      provider.unfreeze();

      // Advance time
      provider.setCurrentTime(time3);
      map.startShiftTimers();

      provider.setCurrentTime(time4);
      map.stopShiftTimers();

      provider.freeze();
      expect(onTracker).toHaveTotalTime([0, 20]);
      expect(offTracker).toHaveTotalTime([0, 0]);
      provider.unfreeze();

      map.totalShiftTimers();

      provider.freeze();
      expect(onTracker).toHaveTotalTime([0, 20]);
      expect(offTracker).toHaveTotalTime([0, 0]);
      provider.unfreeze();

    });

    it('should have correct shift counts after multiple start/stop', () => {
      const provider = initMapWithTime(startTime, time1, time2, time3, time4);

      let onTracker = map.get(playerOnId);
      let offTracker = map.get(playerOffId);

      map.startShiftTimers();
      map.stopShiftTimers();

      expect(onTracker).toHaveShiftCount(1);
      expect(onTracker).toBeAlreadyOn();
      expect(offTracker).toHaveShiftCount(0);

      map.startShiftTimers();
      map.stopShiftTimers();

      expect(onTracker).toHaveShiftCount(1);
      expect(onTracker).toBeAlreadyOn();
      expect(offTracker).toHaveShiftCount(0);

      map.startShiftTimers();
      map.stopShiftTimers();

      expect(onTracker).toHaveShiftCount(1);
      expect(onTracker).toBeAlreadyOn();
      expect(offTracker).toHaveShiftCount(0);
    });

    it('should have shift times restarted after sub', () => {
      const provider = initMapWithTime(startTime, time1, time2);

      let onTracker = map.get(playerOnId);
      let offTracker = map.get(playerOffId);

      map.startShiftTimers();
      map.substitutePlayer(playerOffId, playerOnId);

      provider.freeze();
      expect(onTracker).toHaveShiftTime([0, 5]);
      expect(offTracker).toHaveShiftTime([0, 5]);
    });

    it('should have total times restarted after sub', () => {
      const provider = initMapWithTime(startTime, time1, time2);

      let onTracker = map.get(playerOnId);
      let offTracker = map.get(playerOffId);

      map.startShiftTimers();
      map.substitutePlayer(playerOffId, playerOnId);

      provider.freeze();
      expect(onTracker).toHaveTotalTime([0, 5]);
      expect(offTracker).toHaveTotalTime([0, 5]);
    });

    it('should have shift counts incremented after sub', () => {
      const provider = initMapWithTime(startTime, time1, time2);

      let onTracker = map.get(playerOnId);
      let offTracker = map.get(playerOffId);

      map.startShiftTimers();
      map.substitutePlayer(playerOffId, playerOnId);

      expect(onTracker).toHaveShiftCount(1);
      expect(onTracker).not.toBeAlreadyOn();
      expect(offTracker).toHaveShiftCount(1);
      expect(offTracker).toBeAlreadyOn();
    });

    it('should have shift times at zero after sub with clock stopped', () => {
      const provider = initMapWithTime(startTime, time1, time2);

      let onTracker = map.get(playerOnId);
      let offTracker = map.get(playerOffId);

      // Verify substitution before starting the clock
      map.substitutePlayer(playerOffId, playerOnId);

      expect(onTracker).toHaveShiftTime([0, 0]);
      expect(offTracker).toHaveShiftTime([0, 0]);

      map.startShiftTimers();
      map.stopShiftTimers();

      provider.freeze();
      expect(onTracker).toHaveShiftTime([0, 5]);
      expect(offTracker).toHaveShiftTime([0, 5]);
      provider.unfreeze();

      // Verify substitution after starting and stopping the clock
      map.substitutePlayer(playerOnId, playerOffId);

      expect(onTracker).toHaveShiftTime([0, 0]);
      expect(offTracker).toHaveShiftTime([0, 0]);
    });

    it('should have total times at zero after sub with clock stopped', () => {
      const provider = initMapWithTime(startTime, time1, time2);

      let onTracker = map.get(playerOnId);
      let offTracker = map.get(playerOffId);

      // Verify substitution before starting the clock
      map.substitutePlayer(playerOffId, playerOnId);

      expect(onTracker).toHaveTotalTime([0, 0]);
      expect(offTracker).toHaveTotalTime([0, 0]);

      map.startShiftTimers();
      map.stopShiftTimers();

      provider.freeze();
      expect(onTracker).toHaveTotalTime([0, 0]);
      expect(offTracker).toHaveTotalTime([0, 5]);
      provider.unfreeze();

      // Verify substitution after starting and stopping the clock
      map.substitutePlayer(playerOnId, playerOffId);

      provider.freeze();
      expect(onTracker).toHaveTotalTime([0, 0]);
      expect(offTracker).toHaveTotalTime([0, 5]);
    });

    it('should have shift counts at zero after sub with clock stopped', () => {
      const provider = initMapWithTime(startTime, time1, time2, time2, time2);

      let onTracker = map.get(playerOnId);
      let offTracker = map.get(playerOffId);

      // Verify substitution before starting the clock
      map.substitutePlayer(playerOffId, playerOnId);

      expect(onTracker).toHaveShiftCount(0);
      expect(onTracker).not.toBeAlreadyOn();
      expect(offTracker).toHaveShiftCount(0);
      expect(offTracker).not.toBeAlreadyOn();

      map.startShiftTimers();
      map.stopShiftTimers();

      provider.freeze();
      expect(onTracker).toHaveShiftCount(0);
      expect(offTracker).toHaveShiftCount(1);
      provider.unfreeze();

      // Verify substitution after starting and stopping the clock
      map.substitutePlayer(playerOnId, playerOffId);

      expect(onTracker).toHaveShiftCount(0);
      expect(onTracker).not.toBeAlreadyOn();
      expect(offTracker).toHaveShiftCount(1);

      map.startShiftTimers();

      expect(onTracker).toHaveShiftCount(1);
      expect(offTracker).toHaveShiftCount(1);
    });

    it('should have correct shift time after subs with clock running then stopped', () => {
      const provider = initMapWithManualTime();

      let onTracker = map.get(playerOnId);
      let offTracker = map.get(playerOffId);

      provider.setCurrentTime(startTime);
      map.startShiftTimers();

      // First substitution, clock running
      provider.incrementCurrentTime([0,5]);

      expect(onTracker).toHaveShiftTime([0, 5]);
      expect(offTracker).toHaveShiftTime([0, 5]);

      map.substitutePlayer(playerOffId, playerOnId);

      provider.incrementCurrentTime([0,5]);

      expect(onTracker).toHaveShiftTime([0, 5]);
      expect(offTracker).toHaveShiftTime([0, 5]);

      // Second substitution, clock stopped
      map.stopShiftTimers();

      expect(onTracker).toHaveShiftTime([0, 5]);
      expect(offTracker).toHaveShiftTime([0, 5]);

      map.substitutePlayer(playerOnId, playerOffId);

      expect(onTracker).toHaveShiftTime([0, 0]);
      expect(offTracker).toHaveShiftTime([0, 0]);

      provider.incrementCurrentTime([0, 15]);

      expect(onTracker).toHaveShiftTime([0, 0]);
      expect(offTracker).toHaveShiftTime([0, 0]);

      map.startShiftTimers();

      provider.incrementCurrentTime([0, 20]);

      expect(onTracker).toHaveShiftTime([0, 20]);
      expect(offTracker).toHaveShiftTime([0, 20]);
    });


    it('should have correct total time after multiple subs', () => {
      const provider = initMapWithManualTime();

      let onTracker = map.get(playerOnId);
      let offTracker = map.get(playerOffId);

      provider.setCurrentTime(startTime);
      map.startShiftTimers();

      // First substitution
      provider.incrementCurrentTime([0,5]);

      expect(onTracker).toHaveTotalTime([0, 5]);
      expect(offTracker).toHaveTotalTime([0, 0]);

      map.substitutePlayer(playerOffId, playerOnId);

      provider.incrementCurrentTime([0,5]);

      expect(onTracker).toHaveTotalTime([0, 5]);
      expect(offTracker).toHaveTotalTime([0, 5]);

      // Second substitution
      provider.incrementCurrentTime([0,10]);

      expect(onTracker).toHaveTotalTime([0, 5]);
      expect(offTracker).toHaveTotalTime([0, 15]);

      map.substitutePlayer(playerOnId, playerOffId);

      provider.incrementCurrentTime([0,15]);

      expect(onTracker).toHaveTotalTime([0, 20]);
      expect(offTracker).toHaveTotalTime([0, 15]);

      // Third substitution
      provider.incrementCurrentTime([0,10]);

      expect(onTracker).toHaveTotalTime([0, 30]);
      expect(offTracker).toHaveTotalTime([0, 15]);

      map.substitutePlayer(playerOffId, playerOnId);

      provider.incrementCurrentTime([0,25]);

      expect(onTracker).toHaveTotalTime([0, 30]);
      expect(offTracker).toHaveTotalTime([0, 40]);
    });

  }); // describe('Shift timing')

  describe('Existing data', () => {

    it('should not have the time provider serialized', () => {
      let data = {
        trackers: [
          { id: playerOnId, isOn: true },
          { id: playerOffId, isOn: false },
        ],
      }
      map = new PlayerTimeTrackerMap(data);

      expect(map).toHaveSize(2);
      expect(map.clockRunning).toBe(false);
      expect(map.timeProvider).not.toBe(undefined);
      map.trackers.forEach(tracker => {
        expect(tracker.timeProvider).not.toBe(undefined);
      });

      const serialized = JSON.stringify(map);
      let mapData = JSON.parse(serialized);

      expect(mapData.clockRunning).toBe(false);
      expect(mapData.trackers).not.toBe(undefined);
      expect(mapData.trackers.length).toBe(2);
      expect(mapData.timeProvider).toBe(undefined);
      mapData.trackers.forEach(tracker => {
        expect(tracker.timeProvider).toBe(undefined);
      });
    });

    it('should be initialized correctly for null data', () => {
      map = new PlayerTimeTrackerMap(null);
      expect(map).toBeInitialized();
    });

    it('should be initialized correctly for empty data', () => {
      map = new PlayerTimeTrackerMap({});
      expect(map).toBeInitialized();
    });

    it('should be initialized correctly from stopped data', () => {
      let expected = {
        clockRunning: false,
        trackers: [
          { id: playerOnId, isOn: true, alreadyOn: true, shiftCount: 1 },
          { id: playerOffId, isOn: false },
        ],
      }
      map = new PlayerTimeTrackerMap(expected);

      expect(map).toHaveSize(2);
      expect(map.clockRunning).toBe(false);

      let onTracker = map.get(playerOnId);
      let offTracker = map.get(playerOffId);

      expect(onTracker).toBeOn(playerOnId);
      expect(onTracker).toBeAlreadyOn();
      expect(onTracker).not.toBeRunning();
      expect(onTracker).toHaveShiftCount(1);

      expect(offTracker).toBeOff(playerOffId);
      expect(offTracker).not.toBeRunning();
      expect(offTracker).toHaveShiftCount(0);
    });

    it('should be initialized correctly from stopped data, with duration', () => {
      let expected = {
        clockRunning: false,
        trackers: [
          { id: playerOnId, isOn: true, alreadyOn: true, shiftCount: 1,
            totalTime: [0,0],
            onTimer: {
              isRunning: false, duration: [0,5]
            }
          },
          { id: playerOffId, isOn: false, alreadyOn: false, shiftCount: 0,
            totalTime: [0,0],
            offTimer: {
              isRunning: false, duration: [0,5]
            }
          },
        ],
      }
      map = new PlayerTimeTrackerMap(expected);

      expect(map).toHaveSize(2);
      expect(map.clockRunning).toBe(false);

      let onTracker = map.get(playerOnId);
      let offTracker = map.get(playerOffId);

      expect(onTracker).toBeOn(playerOnId);
      expect(onTracker).not.toBeRunning();
      expect(onTracker).toBeAlreadyOn();
      expect(onTracker).toHaveShiftCount(1);
      expect(onTracker).toHaveShiftTime([0, 5]);
      expect(onTracker).toHaveTotalTime([0, 5]);

      expect(offTracker).toBeOff(playerOffId);
      expect(offTracker).not.toBeRunning();
      expect(offTracker).toHaveShiftCount(0);
      expect(offTracker).toHaveShiftTime([0, 5]);
      expect(offTracker).toHaveTotalTime([0, 0]);
    });

    it('should be initialized correctly from running data', () => {
      let expected = {
        clockRunning: true,
        trackers: [
          { id: playerOnId, isOn: true, alreadyOn: true, shiftCount: 2,
            totalTime: [0,5],
            onTimer: {
              isRunning: true, startTime: startTime, duration: [0,5]
            }
          },
          { id: playerOffId, isOn: false, alreadyOn: false, shiftCount: 1,
            totalTime: [0,5],
            offTimer: {
              isRunning: true, startTime: startTime, duration: [0,5]
            }
          },
        ],
      }
      // Current time is 5 seconds after the start time in saved data
      const provider = manualTimeProvider(time1);

      map = new PlayerTimeTrackerMap(expected, provider);

      expect(map).toHaveSize(2);
      expect(map.clockRunning).toBe(true);

      let onTracker = map.get(playerOnId);
      let offTracker = map.get(playerOffId);

      expect(onTracker).toBeOn(playerOnId);
      expect(onTracker).toBeRunning();
      expect(onTracker).toBeAlreadyOn();
      expect(onTracker).toHaveShiftCount(2);
      expect(onTracker).toHaveShiftTime([0, 10]);
      expect(onTracker).toHaveTotalTime([0, 15]);

      expect(offTracker).toBeOff(playerOffId);
      expect(offTracker).toBeRunning();
      expect(offTracker).toHaveShiftCount(1);
      expect(offTracker).toHaveShiftTime([0, 10]);
      expect(offTracker).toHaveTotalTime([0, 5]);
    });

  }); // describe('Existing data')

});
