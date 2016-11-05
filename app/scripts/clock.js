'use strict';

export class CurrentTimeProvider {
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
    // Calculate elapsed since last start and add to stored duration
    this.duration = this.addElapsed();
    this.startTime = null;
  }

  getElapsed() {
    if (!this.startTime) {
      return this.duration;
    }
    // Currently running, calculate as: time so far + stored duration
    return this.addElapsed();
  }

  getCurrentTime() {
    return this.provider.getCurrentTime();
  }

  addElapsed() {
    let stopTime = this.getCurrentTime();
    let elapsed = calculateElapsed(this.startTime, stopTime);

    // Added elapsed to accumulated duration
    let total = this.duration.slice(0);
    total[0] += elapsed[0];
    total[1] += elapsed[1];

    if (total[1] >= 60) {
      total[0] += 1;
      total[1] -= 60;
    }
    return total;
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
