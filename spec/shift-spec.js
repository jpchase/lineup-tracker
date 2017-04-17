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
        map.startShiftTimers();
      }).toThrowError('Map is empty');
      expect(() => {
        map.stopShiftTimers();
      }).toThrowError('Map is empty');
      expect(() => {
        map.substitutePlayer(1, 2);
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

    it('should have shift timers running after start', () => {
      map.startShiftTimers();

      expect(map).toHaveSize(2);

      let onTracker = map.trackers.get(playerOnId);
      let offTracker = map.trackers.get(playerOffId);

      expect(onTracker).toBeOn(playerOnId);
      expect(onTracker).toBeRunning();
      expect(onTracker.offTimer).toBe(null);

      expect(offTracker).toBeOff(playerOffId);
      expect(offTracker).toBeRunning();
      expect(offTracker.onTimer).toBe(null);
    });

    it('should have shift timers stopped after stop', () => {
      map.startShiftTimers();

      expect(map).toHaveSize(2);

      let onTracker = map.trackers.get(playerOnId);
      let offTracker = map.trackers.get(playerOffId);

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
        map.startShiftTimers();

        expect(map).toHaveSize(2);

        let onTracker = map.trackers.get(playerOnId);
        let offTracker = map.trackers.get(playerOffId);

        map.substitutePlayer(playerOffId, playerOnId);

        expect(onTracker).toBeOff(playerOnId);
        expect(onTracker).toBeRunning();

        expect(offTracker).toBeOn(playerOffId);
        expect(offTracker).toBeRunning();
      });

      it('should have shift timers changed after sub with clock stopped, but not be running', () => {

        let onTracker = map.trackers.get(playerOnId);
        let offTracker = map.trackers.get(playerOffId);

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

      let onTracker = map.trackers.get(playerOnId);
      let offTracker = map.trackers.get(playerOffId);

      expect(onTracker).toBeOn(playerOnId);
      expect(onTracker).not.toBeRunning();

      expect(offTracker).toBeOff(playerOffId);
      expect(offTracker).not.toBeRunning();
    });

    it('should be initialized correctly from running data', () => {
      let expected = {
        clockRunning: true,
        trackers: [
          { id: playerOnId, isOn: true },
          { id: playerOffId, isOn: false },
        ],
      }
      map = new PlayerTimeTrackerMap(expected);

      expect(map).toHaveSize(2);
      expect(map.clockRunning).toBe(true);

      let onTracker = map.trackers.get(playerOnId);
      let offTracker = map.trackers.get(playerOffId);

      expect(onTracker).toBeOn(playerOnId);
      expect(onTracker).toBeRunning();

      expect(offTracker).toBeOff(playerOffId);
      expect(offTracker).toBeRunning();
    });

  }); // describe('Existing data')

});
