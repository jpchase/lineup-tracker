'use strict';

import {CurrentTimeProvider, Duration, Timer} from './clock.js';

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
    this.isOn = Boolean(data.isOn);
    this.alreadyOn = Boolean(data.alreadyOn);
    this.shiftCount = data.shiftCount || 0;
    this.totalTime = data.totalTime || Duration.zero();
    this.timeProvider = timeProvider;
    this.resetShiftTimes();
    if (data.onTimer) {
      this.onTimer = new Timer(data.onTimer, timeProvider);
    }
    if (data.offTimer) {
      this.offTimer = new Timer(data.offTimer, timeProvider);
    }
  }

  toJSON() {
    const dataToSerialize = {
      id: this.id,
      isOn: this.isOn,
      alreadyOn: this.alreadyOn,
      shiftCount: this.shiftCount,
      totalTime: this.totalTime,
    };
    if (this.onTimer) {
      dataToSerialize.onTimer = this.onTimer;
    }
    if (this.offTimer) {
      dataToSerialize.offTimer = this.offTimer;
    }
    return dataToSerialize;
  }

  resetShiftTimes() {
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
    return timer ? timer.getElapsed() : Duration.zero();
  }

  getTotalTime() {
    if (this.isOn && this.onTimer) {
      return Duration.add(this.totalTime, this.onTimer.getElapsed());
    }
    return this.totalTime;
  }

  resetShift() {
    let timer = getCurrentTimer(this);
    if (timer) {
      timer.reset();
    }
  }

  startShift() {
    if (this.isOn) {
      this.onTimer = this.onTimer || new Timer(null, this.timeProvider);
      this.onTimer.start();
      if (!this.alreadyOn) {
        this.alreadyOn = true;
        this.shiftCount += 1;
      }
    } else {
      this.offTimer = this.offTimer || new Timer(null, this.timeProvider);
      this.offTimer.start();
    }
  }

  stopShift() {
    let timer = getCurrentTimer(this);
    if (timer) {
      timer.stop();
    }
  }

  addShiftToTotal() {
    if (!this.isOn) {
      return;
    }
    this.totalTime = Duration.add(this.totalTime, this.getShiftTime());
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
      tracker.startShift();
    });
    this.timeProvider.unfreeze();
  }

  stopShiftTimers() {
    if (!this.trackers) {
      throw new Error('Map is empty');
    }

    this.clockRunning = false;
    this.timeProvider.freeze();
    this.trackers.forEach(tracker => {
      tracker.stopShift();
    });
    this.timeProvider.unfreeze();
  }

  totalShiftTimers() {
    if (!this.trackers) {
      throw new Error('Map is empty');
    }

    this.timeProvider.freeze();
    this.trackers.forEach(tracker => {
      tracker.addShiftToTotal();
      tracker.resetShiftTimes();
    });
    this.timeProvider.unfreeze();
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

    playerInTracker.stopShift();
    playerOutTracker.stopShift();
    playerInTracker.isOn = true;

    playerOutTracker.addShiftToTotal();
    playerOutTracker.isOn = false;
    playerOutTracker.alreadyOn = false;

    playerInTracker.resetShift();
    playerOutTracker.resetShift();

    if (this.clockRunning) {
      playerInTracker.startShift();
      playerOutTracker.startShift();
    }
    if (unfreeze) {
      this.timeProvider.unfreeze();
    }
  }
}
