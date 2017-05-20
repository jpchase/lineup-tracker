'use strict';

import {CurrentTimeProvider, Timer} from './clock.js';

function getCurrentTimer(tracker) {
  if (!tracker) {
    return undefined;
  }
  return (tracker.isOn) ? tracker.onTimer : tracker.offTimer;
}

export class PlayerTimeTracker {
  constructor(passedData, timeProvider) {
    let data = passedData || {};
    this.id = data.id;
    this.isOn = !!data.isOn;
    this.alreadyOn = !!data.alreadyOn;
    this.shiftCount = data.shiftCount || 0;
    this.resetShiftTime();
    if (data.onTimer) {
      this.onTimer = new Timer(data.onTimer, timeProvider);
    }
    if (data.offTimer) {
      this.offTimer = new Timer(data.offTimer, timeProvider);
    }
  }

  resetShiftTime() {
    this.onTimer = null;
    this.offTimer = null;
  }

  toDebugString() {
    return JSON.stringify({
      id: this.id,
      isOn: this.isOn
    });
  }

  getShiftTime() {
    let timer = getCurrentTimer(this);
    return timer ? timer.getElapsed() : [0, 0];
  }
}

export class PlayerTimeTrackerMap {
  constructor(passedData, timeProvider) {
    let data = passedData || {};
    this.timeProvider = timeProvider || new CurrentTimeProvider();
    this.trackers = null;
    this.clockRunning = data.clockRunning || false;
    if (data.trackers && data.trackers.length) {
      this.initialize(data.trackers, true);
    }
  }

  toJSON() {
    return {
      clockRunning: this.clockRunning,
      trackers: this.trackers,
    };
  }

  initialize(players, recreating) {
    if (!players || !players.length) {
      throw new Error('Players must be provided to initialize');
    }

    this.trackers = [];
    players.forEach(player => {
      // Use different data format, depending if recreating or initializing
      // from scratch with actual player objects.
      let tracker = new PlayerTimeTracker(recreating ?
        player : {id: player.id || player.name, isOn: (player.status === 'ON')},
        this.timeProvider);
      this.trackers.push(tracker);
    });
  }

  reset() {
    this.trackers = null;
    this.clockRunning = false;
  }

  get(id) {
    if (!this.trackers) {
      return undefined;
    }
    return this.trackers.find(tracker => tracker.id === id);
  }

  [Symbol.iterator]() {
    return this.trackers.values();
  }

  startShiftTimers() {
    if (!this.trackers) {
      throw new Error('Map is empty');
    }

    this.clockRunning = true;
    this.timeProvider.freeze();
    this.trackers.forEach(tracker => {
      this.startShift(tracker);
    });
    this.timeProvider.unfreeze();
  }

  startShift(tracker, reset) {
    if (reset) {
      let timer = getCurrentTimer(tracker);
      if (timer) {
        timer.reset();
      }
    }
    if (tracker.isOn) {
      tracker.onTimer = tracker.onTimer || new Timer(null, this.timeProvider);
      tracker.onTimer.start();
      if (!tracker.alreadyOn) {
        tracker.alreadyOn = true;
        tracker.shiftCount += 1;
      }
    } else {
      tracker.offTimer = tracker.offTimer || new Timer(null, this.timeProvider);
      tracker.offTimer.start();
    }
  }

  stopShiftTimers() {
    if (!this.trackers) {
      throw new Error('Map is empty');
    }

    this.clockRunning = false;
    this.timeProvider.freeze();
    this.trackers.forEach(tracker => {
      this.stopShift(tracker);
    });
    this.timeProvider.unfreeze();
  }

  stopShift(tracker) {
    let timer = getCurrentTimer(tracker);
    if (timer) {
      timer.stop();
    }
  }

  substitutePlayer(playerInId, playerOutId) {
    if (!this.trackers) {
      throw new Error('Map is empty');
    }

    let playerInTracker = this.get(playerInId);
    let playerOutTracker = this.get(playerOutId);

    if (!playerInTracker || !playerOutTracker ||
        playerInTracker.isOn || !playerOutTracker.isOn) {
      const inDebugString = playerInTracker ?
                              playerInTracker.toDebugString() :
                              undefined;
      const outDebugString = playerOutTracker ?
                              playerOutTracker.toDebugString() :
                              undefined;
      throw new Error('Invalid status to substitute, playerIn = ' +
                      inDebugString +
                      ', playerOut = ' +
                      outDebugString);
    }
    let unfreeze = false;
    if (this.clockRunning) {
      this.timeProvider.freeze();
      unfreeze = true;
    }
    this.stopShift(playerInTracker);
    this.stopShift(playerOutTracker);
    playerInTracker.isOn = true;
    playerOutTracker.isOn = false;
    playerOutTracker.alreadyOn = false;
    if (this.clockRunning) {
      this.startShift(playerInTracker, true);
      this.startShift(playerOutTracker, true);
    }
    if (unfreeze) {
      this.timeProvider.unfreeze();
    }
  }
}
