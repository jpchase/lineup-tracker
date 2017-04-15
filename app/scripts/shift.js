'use strict';

import {Timer} from './clock.js';

export class PlayerTimeTracker {
  constructor(data) {
    this.id = data.id;
    this.isOn = data.isOn;
    this.reset();
  }

  reset() {
    this.onTimer = null;
    this.offTimer = null;
  }

  toDebugString() {
    return JSON.stringify({
      id: this.id,
      isOn: this.isOn
    });
  }
}

export class PlayerTimeTrackerMap {
  constructor(timeProvider) {
    this.provider = timeProvider;
    this.trackers = null;
    this.clockRunning = false;
  }

  initialize(players) {
    if (!players || !players.length) {
      throw new Error('Players must be provided to initialize');
    }

    this.trackers = new Map();
    players.forEach(player => {
      let tracker = new PlayerTimeTracker({
        id: player.name,
        isOn: (player.status === 'ON')
      });
      this.trackers.set(tracker.id, tracker);
    });
  }

  startShiftTimers(players) {
    if (!this.trackers) {
      throw new Error('Map is empty');
    }

    this.clockRunning = true;
    this.trackers.forEach(tracker => {
      this.startShift(tracker);
    });
  }

  startShift(tracker) {
    if (tracker.isOn) {
      tracker.onTimer = tracker.onTimer || new Timer(this.provider);
      tracker.onTimer.start();
    } else {
      tracker.offTimer = tracker.offTimer || new Timer(this.provider);
      tracker.offTimer.start();
    }
  }

  stopShiftTimers() {
    if (!this.trackers) {
      throw new Error('Map is empty');
    }

    this.clockRunning = false;
    this.trackers.forEach(tracker => {
      this.stopShift(tracker);
    });
  }

  stopShift(tracker) {
    let timer = (tracker.isOn) ? tracker.onTimer : tracker.offTimer;
    if (timer) {
      timer.stop();
    }
  }

  substitutePlayer(playerInId, playerOutId) {
    if (!this.trackers) {
      throw new Error('Map is empty');
    }

    let playerInTracker = this.trackers.get(playerInId);
    let playerOutTracker = this.trackers.get(playerOutId);

    if (!playerInTracker || !playerOutTracker ||
        playerInTracker.isOn || !playerOutTracker.isOn) {
      const inDebugString = playerInTracker ? playerInTracker.toDebugString() : undefined;
      const outDebugString = playerOutTracker ? playerOutTracker.toDebugString() : undefined;
      throw new Error('Invalid status to substitute, playerIn = ' +
                      inDebugString +
                      ', playerOut = ' +
                      outDebugString);
    }
    this.stopShift(playerInTracker);
    this.stopShift(playerOutTracker);
    playerInTracker.isOn = true;
    playerOutTracker.isOn = false;
    if (this.clockRunning) {
      this.startShift(playerInTracker);
      this.startShift(playerOutTracker);
    }
  }
}
