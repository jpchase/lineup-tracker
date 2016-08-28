'use strict';

import {CurrentTimeProvider,Timer} from './clock.js';

export class PlayerTimeTrackerMap {
  constructor(timeProvider) {
    this.provider = timeProvider;// || new CurrentTimeProvider();
    this.trackers = {};//new Map();
  }

  startShiftTimers(players) {
    players.forEach(player => {
      let tracker = this.trackers[player.name];
      if (!tracker) {
        tracker = new PlayerTimeTracker({id: player.name});
        this.trackers[player.name] = tracker;
      }

      if (player.status === 'ON') {
        tracker.onTimer = tracker.onTimer || new Timer(this.provider);
        tracker.onTimer.start();
      } else {
        tracker.offTimer = tracker.offTimer || new Timer(this.provider);
        tracker.offTimer.start();
      }
    });
  }

  stopShiftTimers(players) {
    players.forEach(player => {
      let tracker = this.trackers[player.name];
      let timer = (player.status === 'ON') ? tracker.onTimer : tracker.offTimer;
      if (timer) {
        timer.stop();
      }
    });
  }
}

export class PlayerTimeTracker {
  constructor(data) {
    this.playerId = data.id;
    this.onTimer = null;
    this.offTimer = null;
  }
}
