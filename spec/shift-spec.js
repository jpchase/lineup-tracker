import {CurrentTimeProvider} from '../app/scripts/clock.js';
import {PlayerTimeTrackerMap} from '../app/scripts/shift.js';

describe('PlayerTimeTracker', () => {
});

describe('PlayerTimeTrackerMap', () => {
  const playerOnId = 1;
  const playerOffId = 2;

  let map;

  beforeEach(() => {
    map = new PlayerTimeTrackerMap();

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
      toBeOff: function () {
        return {
          compare: function (actual, expected) {
            let tracker = actual;

            return {
              pass: tracker && tracker.id === expected && !tracker.isOn
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
      }
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
      expect(() => {
        map.get();
      }).toThrowError('Map is empty');
      expect(() => {
        map.startShiftTimers();
      }).toThrowError('Map is empty');
      expect(() => {
        map.stopShiftTimers();
      }).toThrowError('Map is empty');
      expect(() => {
        map.substitutePlayer(playerOffId, playerOnId);
      }).toThrowError('Map is empty');
    });

  });

  describe('initialized', () => {

    beforeEach(() => {
      const players = [
        {name: playerOnId, status: 'ON'},
        {name: playerOffId, status: 'OFF'}
      ];

      map.initialize(players);
    });

    it('should not get trackers for non-existent ids', () => {
      expect(map).toHaveSize(2);

      let tracker = map.get(playerOnId + 'X');

      expect(tracker).toBe(undefined);
    });

    it('should have trackers with correct values', () => {
      map.startShiftTimers();

      expect(map).toHaveSize(2);

      let onTracker = map.get(playerOnId);
      let offTracker = map.get(playerOffId);

      expect(onTracker).toBeOn(playerOnId);
      expect(offTracker).toBeOff(playerOffId);
    });

    it('should have shift timers running after start', () => {
      expect(map).toHaveSize(2);

      let onTracker = map.get(playerOnId);
      let offTracker = map.get(playerOffId);

      map.startShiftTimers();

      expect(onTracker).toBeRunning();
      expect(onTracker.offTimer).toBe(null);

      expect(offTracker).toBeRunning();
      expect(offTracker.onTimer).toBe(null);
    });

    it('should have shift timers stopped after stop', () => {
      expect(map).toHaveSize(2);

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
        expect(map).toHaveSize(2);

        let onTracker = map.get(playerOnId);
        let offTracker = map.get(playerOffId);

        map.startShiftTimers();
        map.substitutePlayer(playerOffId, playerOnId);

        expect(onTracker).toBeOff(playerOnId);
        expect(onTracker).toBeRunning();

        expect(offTracker).toBeOn(playerOffId);
        expect(offTracker).toBeRunning();
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

  describe('Existing data', () => {
    const startTime = new Date(2016, 0, 1, 14, 0, 0);
    const time1 = new Date(2016, 0, 1, 14, 0, 5);

    function mockTimeProvider(t0, t1, t2, t3) {
      let provider = new CurrentTimeProvider();
      spyOn(provider, 'getCurrentTime').and.returnValues(t0, t1, t2, t3);
      return provider;
    }

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
          { id: playerOnId, isOn: true },
          { id: playerOffId, isOn: false },
        ],
      }
      map = new PlayerTimeTrackerMap(expected);

      expect(map).toHaveSize(2);
      expect(map.clockRunning).toBe(false);

      let onTracker = map.get(playerOnId);
      let offTracker = map.get(playerOffId);

      expect(onTracker).toBeOn(playerOnId);
      expect(onTracker).not.toBeRunning();

      expect(offTracker).toBeOff(playerOffId);
      expect(offTracker).not.toBeRunning();
    });

    it('should be initialized correctly from stopped data, with duration', () => {
      let expected = {
        clockRunning: false,
        trackers: [
          { id: playerOnId, isOn: true,
            onTimer: {
              isRunning: false, duration: [0,5]
            }
          },
          { id: playerOffId, isOn: false,
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
      expect(onTracker.onTimer.getElapsed()).toEqual([0, 5]);

      expect(offTracker).toBeOff(playerOffId);
      expect(offTracker).not.toBeRunning();
      expect(offTracker.offTimer.getElapsed()).toEqual([0, 5]);
    });

    it('should be initialized correctly from running data', () => {
      let expected = {
        clockRunning: true,
        trackers: [
          { id: playerOnId, isOn: true,
            onTimer: {
              isRunning: true, startTime: startTime, duration: [0,5]
            }
          },
          { id: playerOffId, isOn: false,
            offTimer: {
              isRunning: true, startTime: startTime, duration: [0,5]
            }
          },
        ],
      }
      const provider = mockTimeProvider(time1, time1);

      map = new PlayerTimeTrackerMap(expected, provider);

      expect(map).toHaveSize(2);
      expect(map.clockRunning).toBe(true);

      let onTracker = map.get(playerOnId);
      let offTracker = map.get(playerOffId);

      expect(onTracker).toBeOn(playerOnId);
      expect(onTracker).toBeRunning();
      expect(onTracker.onTimer.getElapsed()).toEqual([0, 10]);

      expect(offTracker).toBeOff(playerOffId);
      expect(offTracker).toBeRunning();
      expect(offTracker.offTimer.getElapsed()).toEqual([0, 10]);
    });

  }); // describe('Existing data')

});
