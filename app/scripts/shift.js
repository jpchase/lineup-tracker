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
}

export class PlayerTimeTrackerMap {
  constructor(timeProvider) {
    this.provider = timeProvider;
    this.trackers = new Map();
  }

  startShiftTimers(players) {
    players.forEach(player => {
      let tracker = this.trackers.get(player.name);
      if (!tracker) {
        tracker = new PlayerTimeTracker({
          id: player.name,
          isOn: (player.status === 'ON')
        });
        this.trackers.set(tracker.id, tracker);
      }

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
    let playerInTracker = this.trackers.get(playerInId);
    let playerOutTracker = this.trackers.get(playerOutId);

    if (!playerInTracker || !playerOutTracker ||
        playerInTracker.isOn || !playerOutTracker.isOn) {
      throw new Error('Invalid status to substitute, playerIn = ' +
                      JSON.stringify(playerInTracker) +
                      ', playerOut = ' +
                      JSON.stringify(playerOutTracker));
    }
    this.stopShift(playerInTracker);
    this.stopShift(playerOutTracker);
    playerInTracker.isOn = true;
    playerOutTracker.isOn = false;
    this.startShift(playerInTracker);
    this.startShift(playerOutTracker);
  }
}
