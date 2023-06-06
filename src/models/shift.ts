/** @format */

import { CurrentTimeProvider, Duration, DurationData, Timer, TimerData } from './clock.js';
import { LiveGame, LivePlayer } from './live.js';
import { PlayerStatus } from './player.js';

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
  readonly timeProvider?: CurrentTimeProvider;
  readonly id: string;
  private _isOn: boolean;
  private _alreadyOn: boolean;
  private _shiftCount: number;
  private totalTime: Duration;
  private _onTimer?: Timer;
  private _offTimer?: Timer;

  constructor(passedData: PlayerTimeTrackerData, timeProvider?: CurrentTimeProvider) {
    const data = passedData ?? {};
    this.id = data.id;
    this._isOn = data.isOn ?? false;
    this._alreadyOn = data.alreadyOn ?? false;
    this._shiftCount = data.shiftCount ?? 0;
    this.totalTime = new Duration(data.totalTime);
    this.timeProvider = timeProvider;
    if (data.onTimer) {
      this.onTimer = new Timer(data.onTimer, timeProvider);
    }
    if (data.offTimer) {
      this.offTimer = new Timer(data.offTimer, timeProvider);
    }
  }

  // Data properties are private writeable only.
  get isOn(): boolean {
    return this._isOn;
  }
  protected set isOn(value: boolean) {
    this._isOn = value;
  }

  get alreadyOn(): boolean {
    return this._alreadyOn;
  }
  protected set alreadyOn(value: boolean) {
    this._alreadyOn = value;
  }

  get shiftCount(): number {
    return this._shiftCount;
  }
  protected set shiftCount(value: number) {
    this._shiftCount = value;
  }

  get onTimer(): Timer | undefined {
    return this._onTimer;
  }
  protected set onTimer(value: Timer | undefined) {
    this._onTimer = value;
  }

  get offTimer(): Timer | undefined {
    return this._offTimer;
  }
  protected set offTimer(value: Timer | undefined) {
    this._offTimer = value;
  }

  // Synthetic properties.
  get currentTimer() {
    return this.isOn ? this.onTimer : this.offTimer;
  }

  get shiftTime() {
    return this.currentTimer?.getElapsed() || Duration.zero();
  }

  get totalOnTime() {
    if (this.isOn && this.onTimer) {
      return Duration.add(this.totalTime, this.onTimer.getElapsed());
    }
    return this.totalTime;
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
      isOn: this.isOn,
    });
  }

  resetShift() {
    this.currentTimer?.reset();
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

  stopShift(retroactiveStopTime?: number) {
    this.currentTimer?.stop(retroactiveStopTime);
  }

  substituteIn(clockRunning: boolean) {
    this.substituteInternal(/*goingOn=*/ true, clockRunning);
  }

  substituteOut(clockRunning: boolean) {
    this.substituteInternal(/*goingOn=*/ false, clockRunning);
  }

  private substituteInternal(goingOn: boolean, clockRunning: boolean) {
    if (goingOn === this.isOn) {
      throw new Error(`Invalid status to sub ${goingOn ? 'in' : 'out'}: ${this.toDebugString()}`);
    }

    // End the current on/off shift.
    this.stopShift();

    if (goingOn) {
      this.isOn = true;
    } else {
      // Update total time before flipping on flag.
      this.totalTime = Duration.add(this.totalTime, this.shiftTime);
      this.isOn = false;
      this.alreadyOn = false;
    }

    // If previously on/off, there could be a timer with accumulated values.
    this.resetShift();

    if (clockRunning) {
      this.startShift();
    }
  }
}

export interface PlayerTimeTrackerMapData {
  id: string;
  clockRunning?: boolean;
  trackers?: PlayerTimeTrackerData[];
}

export class PlayerTimeTrackerMap {
  timeProvider: CurrentTimeProvider;
  id: string;
  clockRunning: boolean;
  trackers: PlayerTimeTracker[];

  private constructor(data: PlayerTimeTrackerMapData, timeProvider?: CurrentTimeProvider) {
    this.timeProvider = timeProvider || new CurrentTimeProvider();
    this.id = data.id;
    this.trackers = [];
    this.clockRunning = data.clockRunning || false;
    if (data.trackers?.length) {
      this.initialize(data.trackers);
    }
  }

  static create(
    data: PlayerTimeTrackerMapData,
    timeProvider?: CurrentTimeProvider
  ): PlayerTimeTrackerMap {
    if (!data.id) {
      throw new Error('id must be provided');
    }
    return new PlayerTimeTrackerMap(data, timeProvider);
  }

  static createFromGame(game: LiveGame, timeProvider?: CurrentTimeProvider): PlayerTimeTrackerMap {
    if (!game) {
      throw new Error('game must be provided');
    }
    const trackerMap = this.create({ id: game.id }, timeProvider);
    if (game.players) {
      trackerMap.initialize(game.players);
    }
    return trackerMap;
  }

  toJSON() {
    return {
      id: this.id,
      clockRunning: this.clockRunning,
      trackers: this.trackers.map((tracker) => tracker.toJSON()),
    };
  }

  private initialize(players: PlayerTimeTrackerData[] | LivePlayer[]): PlayerTimeTrackerMap {
    if (!players || !players.length) {
      throw new Error('Players must be provided to initialize');
    }

    this.trackers = [];
    players.forEach((player) => {
      // Use different data format, depending if recreating or initializing
      // from scratch with actual player objects.
      let data: PlayerTimeTrackerData;
      if ('status' in player) {
        data = {
          id: player.id || player.name,
          isOn: player.status === PlayerStatus.On,
        };
      } else {
        data = player;
      }
      this.trackers.push(new PlayerTimeTracker(data, this.timeProvider));
    });
    return this;
  }

  reset() {
    this.trackers = [];
    this.clockRunning = false;
  }

  get(id: string) {
    if (!this.trackers) {
      return undefined;
    }
    return this.trackers.find((tracker) => tracker.id === id);
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
    this.trackers.forEach((tracker) => {
      tracker.startShift();
    });
    this.timeProvider.unfreeze();
  }

  stopShiftTimers(retroactiveStopTime?: number) {
    if (!this.trackers?.length) {
      throw new Error('Map is empty');
    }

    this.clockRunning = false;
    this.timeProvider.freeze();
    this.trackers.forEach((tracker) => {
      tracker.stopShift(retroactiveStopTime);
    });
    this.timeProvider.unfreeze();
  }

  substitutePlayer(playerInId: string, playerOutId: string) {
    this.substitutePlayers([{ in: playerInId, out: playerOutId }]);
  }

  substitutePlayers(subs: { in: string; out: string }[]) {
    if (!subs?.length) {
      throw new Error('No subs provided');
    }
    if (!this.trackers?.length) {
      throw new Error('Map is empty');
    }

    const subTrackers: [PlayerTimeTracker, PlayerTimeTracker][] = [];

    subs.forEach((pair) => {
      const playerInTracker = this.get(pair.in);
      const playerOutTracker = this.get(pair.out);

      if (!playerInTracker || !playerOutTracker || playerInTracker.isOn || !playerOutTracker.isOn) {
        throw new Error(
          `Invalid status to substitute, playerIn = ${playerInTracker?.toDebugString()}, playerOut = ${playerOutTracker?.toDebugString()}`
        );
      }

      subTrackers.push([playerInTracker, playerOutTracker]);
    });

    let unfreeze = false;
    if (this.clockRunning) {
      this.timeProvider.freeze();
      unfreeze = true;
    }

    subTrackers.forEach((pair) => {
      const [playerInTracker, playerOutTracker] = pair;

      playerInTracker.substituteIn(this.clockRunning);
      playerOutTracker.substituteOut(this.clockRunning);
    });

    if (unfreeze) {
      this.timeProvider.unfreeze();
    }
  }
}
