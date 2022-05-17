import { CurrentTimeProvider, Duration, DurationData, Timer, TimerData } from './clock.js';
import { LivePlayer } from './game.js';
import { PlayerStatus } from './player.js';

function getCurrentTimer(tracker: PlayerTimeTracker) {
  if (!tracker) {
    return undefined;
  }
  return (tracker.isOn) ? tracker.onTimer : tracker.offTimer;
}

export interface PlayerTimeTrackerData {
  id: string;
  isOn?: boolean;
  alreadyOn?: boolean;
  shiftCount?: number;
  totalTime?: DurationData;
  onTimer?: TimerData;
  offTimer?: TimerData;
}

export class PlayerTimeTracker {
  timeProvider?: CurrentTimeProvider;
  id: string;
  isOn: boolean;
  alreadyOn: boolean;
  shiftCount: number;
  totalTime: Duration;
  onTimer?: Timer;
  offTimer?: Timer;

  constructor(passedData: PlayerTimeTrackerData, timeProvider?: CurrentTimeProvider) {
    let data = passedData || {};
    this.id = data.id;
    this.isOn = data.isOn || false;
    this.alreadyOn = data.alreadyOn || false;
    this.shiftCount = data.shiftCount || 0;
    this.totalTime = new Duration(data.totalTime);
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
    const dataToSerialize: PlayerTimeTrackerData = {
      id: this.id,
      isOn: this.isOn,
      alreadyOn: this.alreadyOn,
      shiftCount: this.shiftCount,
      totalTime: this.totalTime.toJSON(),
    };
    if (this.onTimer) {
      dataToSerialize.onTimer = this.onTimer.toJSON();
    }
    if (this.offTimer) {
      dataToSerialize.offTimer = this.offTimer.toJSON();
    }
    return dataToSerialize;
  }

  resetShiftTimes() {
    this.onTimer = undefined;
    this.offTimer = undefined;
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
      this.onTimer = this.onTimer || new Timer(undefined, this.timeProvider);
      this.onTimer.start();
      if (!this.alreadyOn) {
        this.alreadyOn = true;
        this.shiftCount += 1;
      }
    } else {
      this.offTimer = this.offTimer || new Timer(undefined, this.timeProvider);
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

export interface PlayerTimeTrackerMapData {
  clockRunning?: boolean;
  trackers?: PlayerTimeTrackerData[];
}

export class PlayerTimeTrackerMap {
  timeProvider: CurrentTimeProvider;
  clockRunning: boolean;
  trackers: PlayerTimeTracker[];

  constructor(passedData?: PlayerTimeTrackerMapData, timeProvider?: CurrentTimeProvider) {
    let data = passedData || {};
    this.timeProvider = timeProvider || new CurrentTimeProvider();
    this.trackers = [];
    this.clockRunning = data.clockRunning || false;
    if (data.trackers && data.trackers.length) {
      this.initialize(data.trackers);
    }
  }

  toJSON() {
    return {
      clockRunning: this.clockRunning,
      trackers: this.trackers,
    };
  }

  initialize(players: PlayerTimeTrackerData[] | LivePlayer[]) {
    if (!players || !players.length) {
      throw new Error('Players must be provided to initialize');
    }

    this.trackers = [];
    players.forEach(player => {
      // Use different data format, depending if recreating or initializing
      // from scratch with actual player objects.
      let data: PlayerTimeTrackerData;
      if ('status' in player) {
        data = {
          id: player.id || player.name,
          isOn: (player.status === PlayerStatus.On)
        };
      } else {
        data = player;
      }
      let tracker = new PlayerTimeTracker(data, this.timeProvider);
      this.trackers.push(tracker);
    });
  }

  reset() {
    this.trackers = [];
    this.clockRunning = false;
  }

  get(id: string) {
    if (!this.trackers) {
      return undefined;
    }
    return this.trackers.find(tracker => tracker.id === id);
  }

  [Symbol.iterator]() {
    return this.trackers.values();
  }

  startShiftTimers() {
    if (!this.trackers?.length) {
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
    if (!this.trackers?.length) {
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
    if (!this.trackers?.length) {
      throw new Error('Map is empty');
    }

    this.timeProvider.freeze();
    this.trackers.forEach(tracker => {
      tracker.addShiftToTotal();
      tracker.resetShiftTimes();
    });
    this.timeProvider.unfreeze();
  }

  substitutePlayer(playerInId: string, playerOutId: string) {
    if (!this.trackers?.length) {
      throw new Error('Map is empty');
    }

    let playerInTracker = this.get(playerInId);
    let playerOutTracker = this.get(playerOutId);

    if (!playerInTracker || !playerOutTracker ||
      playerInTracker.isOn || !playerOutTracker.isOn) {
      throw new Error('Invalid status to substitute, playerIn = ' +
        playerInTracker?.toDebugString() +
        ', playerOut = ' +
        playerOutTracker?.toDebugString());
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
