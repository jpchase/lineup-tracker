'use strict';

export class Timer {
  constructor() {
    this.isRunning = false;
    this.duration = [0, 0];
  }

  start() {
    this.isRunning = true;
  }

  stop() {
    this.isRunning = false;
  }

  getElapsed() {
    return this.duration;
  }
}
