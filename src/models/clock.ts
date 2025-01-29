/** @format */

export function pad0(value: number, count: number): string {
  return value.toString().padStart(count, '0');
}

export class CurrentTimeProvider {
  private _isFrozen: boolean;
  private frozenTime: number | undefined;

  constructor() {
    this._isFrozen = false;
  }

  // Data properties are private writeable only.
  get isFrozen(): boolean {
    return this._isFrozen;
  }
  protected set isFrozen(value: boolean) {
    this._isFrozen = value;
  }

  getTimeInternal(): number {
    return Date.now();
  }

  getCurrentTime(): number {
    if (this.isFrozen && this.frozenTime) {
      return this.frozenTime;
    }
    return this.getTimeInternal();
  }

  // Stop using the current time, so that consecutive calls to getCurrentTime()
  // will all return the same value (e.g. when using in a loop).
  freeze() {
    if (this.isFrozen) {
      throw new Error('Cannot freeze when already frozen');
    }
    this.frozenTime = this.getTimeInternal();
    this.isFrozen = true;
  }

  // Resume normal operation of providing the current time.
  unfreeze() {
    if (!this.isFrozen) {
      throw new Error('Cannot unfreeze when not frozen');
    }
    this.isFrozen = false;
    this.frozenTime = undefined;
  }
}

export interface DurationData {
  value?: number;
}

export class Duration {
  // Number of seconds
  private _elapsed: number;

  constructor(passedData?: DurationData) {
    const data: DurationData = passedData ?? {};
    this._elapsed = data.value ?? 0;
  }

  toJSON() {
    return {
      value: this._elapsed,
    };
  }

  getMinutes(): number {
    // Remove seconds from the time.
    const truncateFunc = this._elapsed > 0 ? Math.floor : Math.ceil;
    const elapsedNoSeconds = truncateFunc(this._elapsed / 60);

    // get minutes
    return Math.round(elapsedNoSeconds % 100);
  }

  getSeconds(): number {
    return Math.round(this._elapsed % 60);
  }

  getTotalSeconds(): number {
    return this._elapsed;
  }

  static create(elapsedSeconds: number): Duration {
    return new Duration({ value: elapsedSeconds });
  }

  static zero(): Duration {
    return new Duration();
  }

  static format(duration: Duration): string {
    return `${pad0(duration.getMinutes(), 2)}:${pad0(duration.getSeconds(), 2)}`;
  }

  static add(duration1: Duration, duration2: Duration): Duration {
    return Duration.create(duration1._elapsed + duration2._elapsed);
  }

  static addToDate(date: number, duration: Duration): number {
    const result = new Date(date);
    result.setMinutes(result.getMinutes(), result.getSeconds() + duration._elapsed);
    return result.getTime();
  }

  static calculateElapsed(startTime: number, endTime: number): Duration {
    // Compute diff in seconds (convert from ms)
    const timeDiff = (endTime - startTime) / 1000;
    return Duration.create(timeDiff);
  }
}

export class ManualTimeProvider extends CurrentTimeProvider {
  private currentTime: number | undefined;

  setCurrentTime(newTime: number) {
    this.currentTime = newTime;
  }

  incrementCurrentTime(duration: Duration) {
    this.currentTime = Duration.addToDate(this.getTimeInternal(), duration);
  }

  override getTimeInternal() {
    return this.currentTime || super.getTimeInternal();
  }
}

export interface TimerData {
  isRunning?: boolean;
  startTime?: number;
  duration?: DurationData;
}

export class Timer {
  readonly provider: CurrentTimeProvider;
  private _isRunning: boolean;
  private _startTime?: number;
  private _duration: Duration;

  constructor(passedData?: TimerData, timeProvider?: CurrentTimeProvider) {
    const data: TimerData = passedData ?? {};
    this.provider = timeProvider ?? new CurrentTimeProvider();
    this._isRunning = data.isRunning ?? false;
    this._startTime = data.startTime;
    this._duration = new Duration(data.duration);
  }

  // Data properties are private writeable only.
  get isRunning(): boolean {
    return this._isRunning;
  }
  protected set isRunning(value: boolean) {
    this._isRunning = value;
  }

  get startTime(): number | undefined {
    return this._startTime;
  }
  protected set startTime(value: number | undefined) {
    this._startTime = value;
  }

  get duration(): Duration {
    return this._duration;
  }
  protected set duration(value: Duration) {
    this._duration = value;
  }

  reset() {
    this.isRunning = false;
    this.duration = Duration.zero();
    this.startTime = undefined;
  }

  toJSON() {
    return {
      isRunning: this.isRunning,
      startTime: this.startTime,
      duration: this.duration.toJSON(),
    };
  }

  start(startTime?: number) {
    if (this.isRunning) {
      // Already started
      return;
    }
    this.isRunning = true;
    this.startTime = startTime ?? this.getCurrentTime();
  }

  stop(retroactiveStopTime?: number) {
    if (!this.isRunning) {
      // Already stopped
      return;
    }
    this.isRunning = false;
    // Calculate elapsed since last start and add to stored duration
    this.duration = this.addElapsed(retroactiveStopTime);
    this.startTime = undefined;
  }

  getElapsed(): Duration {
    if (!this.isRunning) {
      return this.duration;
    }
    // Currently running, calculate as: time so far + stored duration
    return this.addElapsed();
  }

  getCurrentTime() {
    return this.provider.getCurrentTime();
  }

  private addElapsed(retroactiveStopTime?: number): Duration {
    const stopTime = retroactiveStopTime ?? this.getCurrentTime();
    const elapsed = Duration.calculateElapsed(this.startTime!, stopTime);

    // Added elapsed to accumulated duration
    return Duration.add(this.duration, elapsed);
  }
}

export class DateFormatter {
  private formatter: Intl.DateTimeFormat;

  constructor() {
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      weekday: 'short',
      hour: 'numeric',
      minute: '2-digit',
    };
    this.formatter = new Intl.DateTimeFormat('default', options);
  }

  format(date: Date): string {
    return this.formatter.format(date);
  }
}

export class TimeFormatter {
  private formatter: Intl.DateTimeFormat;

  constructor() {
    const options: Intl.DateTimeFormatOptions = {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
    };
    this.formatter = new Intl.DateTimeFormat('default', options);
  }

  format(date: Date): string {
    return this.formatter.format(date);
  }
}
