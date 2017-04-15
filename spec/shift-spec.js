import {PlayerTimeTrackerMap} from '../app/scripts/shift.js';

/*
  function checkTracker(map, id, isOn) {
    let tracker = map.trackers.get(id);

    expect(tracker).not.toBe(null);
    expect(tracker.id).toBe(id);
    if (isOn) {
      expect(tracker.onTimer).not.toBe(null);
      expect(tracker.onTimer.isRunning).toBe(true);
      expect(tracker.offTimer).toBe(null);
    } else
      expect(tracker.offTimer).not.toBe(null);
      expect(tracker.offTimer.isRunning).toBe(true);
      expect(tracker.onTimer).toBe(null);
    }
  };*/

describe('PlayerTimeTrackerMap', () => {


  it('should be empty for new instance', () => {
    let map = new PlayerTimeTrackerMap();
    expect(map.trackers.size).toBe(0);
  });

  it('should have shift timers running after start', () => {
    let players = [
      {name: 1, status: 'ON'},
      {name: 2, status: 'OFF'}
    ];

    let map = new PlayerTimeTrackerMap();
    map.startShiftTimers(players);

    expect(map.trackers.size).toBe(2);
    let onTracker = map.trackers.get(players[0].name);
    let offTracker = map.trackers.get(players[1].name);

    expect(onTracker).not.toBe(null);
    expect(onTracker.id).toBe(players[0].name);
    expect(onTracker.onTimer).not.toBe(null);
    expect(onTracker.onTimer.isRunning).toBe(true);
    expect(onTracker.offTimer).toBe(null);

    expect(offTracker).not.toBe(null);
    expect(offTracker.id).toBe(players[1].name);
    expect(offTracker.onTimer).toBe(null);
    expect(offTracker.offTimer).not.toBe(null);
    expect(offTracker.offTimer.isRunning).toBe(true);
  });

  it('should have shift timers stopped after stop', () => {
    let players = [
      {name: 1, status: 'ON'},
      {name: 2, status: 'OFF'}
    ];

    let map = new PlayerTimeTrackerMap();
    map.startShiftTimers(players);

    expect(map.trackers.size).toBe(2);

    map.stopShiftTimers();

    let onTracker = map.trackers.get(players[0].name);
    let offTracker = map.trackers.get(players[1].name);

    expect(onTracker).not.toBe(null);
    expect(onTracker.id).toBe(players[0].name);
    expect(onTracker.onTimer).not.toBe(null);
    expect(onTracker.onTimer.isRunning).toBe(false);
    expect(onTracker.offTimer).toBe(null);

    expect(offTracker).not.toBe(null);
    expect(offTracker.id).toBe(players[1].name);
    expect(offTracker.onTimer).toBe(null);
    expect(offTracker.offTimer).not.toBe(null);
    expect(offTracker.offTimer.isRunning).toBe(false);
  });

  it('should have shift timers changed after sub', () => {
    let player1id = 1;
    let player2id = 2;
    let players = [
      {name: player1id, status: 'ON'},
      {name: player2id, status: 'OFF'}
    ];

    let map = new PlayerTimeTrackerMap();
    map.startShiftTimers(players);

    expect(map.trackers.size).toBe(2);

    // checkTracker(map, player1id, true);
    // checkTracker(map, player2id, false);
    let player1Tracker = map.trackers.get(player1id);
    let player2Tracker = map.trackers.get(player2id);

    expect(player1Tracker).not.toBe(null);
    expect(player1Tracker.id).toBe(players[0].name);
    expect(player1Tracker.onTimer).not.toBe(null);
    expect(player1Tracker.onTimer.isRunning).toBe(true);
    expect(player1Tracker.offTimer).toBe(null);

    expect(player2Tracker).not.toBe(null);
    expect(player2Tracker.id).toBe(players[1].name);
    expect(player2Tracker.onTimer).toBe(null);
    expect(player2Tracker.offTimer).not.toBe(null);
    expect(player2Tracker.offTimer.isRunning).toBe(true);

    map.substitutePlayer(player2id, player1id);

    // checkTracker(map, player1id, false);
    // checkTracker(map, player2id, true);
    expect(player1Tracker).not.toBe(null);
    expect(player1Tracker.id).toBe(players[0].name);
    expect(player1Tracker.offTimer).not.toBe(null);
    expect(player1Tracker.offTimer.isRunning).toBe(true);

    expect(player2Tracker).not.toBe(null);
    expect(player2Tracker.id).toBe(players[1].name);
    expect(player2Tracker.onTimer).not.toBe(null);
    expect(player2Tracker.onTimer.isRunning).toBe(true);
  });

});
