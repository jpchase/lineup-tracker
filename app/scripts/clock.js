'use strict';

export class CurrentTimeProvider {
  constructor() {
  }

  getCurrentTime() {
    return Date.now();
  }
}

export class Timer {
  constructor(timeProvider) {
    this.provider = timeProvider || new CurrentTimeProvider();
    this.isRunning = false;
    this.startTime = null;
    this.duration = [0, 0];
  }

  start() {
    this.isRunning = true;
    this.startTime = this.getCurrentTime();
  }

  stop() {
    this.isRunning = false;
  }

  getElapsed() {
    if (!this.startTime) {
      return this.duration;
    }
    return calculateElapsed(this.startTime, this.getCurrentTime());
  }

  getCurrentTime() {
    return this.provider.getCurrentTime();
  }
}

function calculateElapsed(startTime, endTime) {
  let elapsed = [0, 0];
  // Compute diff in seconds (convert from ms)
  let timeDiff = (endTime - startTime) / 1000;

  // get seconds
  elapsed[1] = Math.round(timeDiff % 60);

  // remove seconds from the time
  timeDiff = Math.floor(timeDiff / 60);

  // get minutes
  elapsed[0] = Math.round(timeDiff % 60);

  return elapsed;
}