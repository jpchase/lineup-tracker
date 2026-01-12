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
    return this.currentTimer?.getElapsed() ?? Duration.zero();
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

  // Public, but should only be used by PlayerTimeTrackerMap
  resetToOn() {
    if (this.isOn) {
      throw new Error('player must be off to reset to on');
    }
    this.isOn = true;
  }

  // Public, but should only be used by PlayerTimeTrackerMap
  resetToOff() {
    if (!this.isOn) {
      throw new Error('player must be on to reset to off');
    }
    this.isOn = false;
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

  startShift(startTime?: number) {
    if (this.isOn) {
      this.onTimer = this.onTimer ?? new Timer(undefined, this.timeProvider);
      this.onTimer.start(startTime);
      if (!this.alreadyOn) {
        this.alreadyOn = true;
        this.shiftCount += 1;
      }
    } else {
      this.offTimer = this.offTimer ?? new Timer(undefined, this.timeProvider);
      this.offTimer.start(startTime);
    }
  }

  stopShift(retroactiveStopTime?: number) {
    this.currentTimer?.stop(retroactiveStopTime);
  }

  substituteIn(clockRunning: boolean, subTime?: number) {
    this.substituteInternal(/*goingOn=*/ true, clockRunning, subTime);
  }

  substituteOut(clockRunning: boolean, subTime?: number) {
    this.substituteInternal(/*goingOn=*/ false, clockRunning, subTime);
  }

  private substituteInternal(goingOn: boolean, clockRunning: boolean, subTime?: number) {
    if (goingOn === this.isOn) {
      throw new Error(`Invalid status to sub ${goingOn ? 'in' : 'out'}: ${this.toDebugString()}`);
    }

    // End the current on/off shift.
    this.stopShift(subTime);

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
      this.startShift(subTime);
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
    this.timeProvider = timeProvider ?? new CurrentTimeProvider();
    this.id = data.id;
    this.trackers = [];
    this.clockRunning = data.clockRunning ?? false;
    if (data.trackers?.length) {
      this.initialize(data.trackers);
    }
  }

  static create(
    data: PlayerTimeTrackerMapData,
    timeProvider?: CurrentTimeProvider,
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
    if (!players?.length) {
      throw new Error('Players must be provided to initialize');
    }

    this.trackers = [];
    players.forEach((player) => {
      // Use different data format, depending if recreating or initializing
      // from scratch with actual player objects.
      let data: PlayerTimeTrackerData;
      if ('status' in player) {
        data = {
          id: player.id ?? player.name,
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

  setStarters(starters: { id: string }[]) {
    if (!this.trackers?.length) {
      throw new Error('Map is empty');
    }
    if (
      this.clockRunning ||
      this.trackers.find((tracker) => tracker.totalOnTime.getTotalSeconds() > 0)
    ) {
      throw new Error('Clock was started, cannot set starters');
    }
    this.trackers.forEach((tracker) => {
      if (starters.find((player) => player.id === tracker.id)) {
        if (tracker.isOn) {
          // Already on, no change required.
          return;
        }
        tracker.resetToOn();
      } else {
        if (!tracker.isOn) {
          // Already off, no change required.
          return;
        }
        tracker.resetToOff();
      }
    });
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

  startShiftTimers(startTime?: number) {
    if (!this.trackers?.length) {
      throw new Error('Map is empty');
    }

    this.clockRunning = true;
    this.timeProvider.freeze();
    this.trackers.forEach((tracker) => {
      tracker.startShift(startTime);
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

  substitutePlayer(playerInId: string, playerOutId: string, subTime?: number) {
    this.substitutePlayers([{ in: playerInId, out: playerOutId }], subTime);
  }

  substitutePlayers(subs: { in: string; out: string }[], subTime?: number) {
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
          `Invalid status to substitute, playerIn = ${playerInTracker?.toDebugString()}, playerOut = ${playerOutTracker?.toDebugString()}`,
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

      playerInTracker.substituteIn(this.clockRunning, subTime);
      playerOutTracker.substituteOut(this.clockRunning, subTime);
    });

    if (unfreeze) {
      this.timeProvider.unfreeze();
    }
  }
}
