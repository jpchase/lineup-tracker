'use strict';

export class Rotation {
  constructor() {
    this.events = [];
  }

  initialize(players) {
    if (!players || !players.length) {
      throw new Error('Players must be provided to initialize');
    }
  }
}
