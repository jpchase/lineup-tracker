function pad0(value: number, count: number): string {
  let result = value.toString();
  for (; result.length < count; --count) {
    result = '0' + result;
  }
  return result;
}

export class CurrentTimeProvider {
  isFrozen: boolean;
  frozenTime: number | undefined;

  constructor() {
    this.isFrozen = false;
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
  _elapsed: number;

  constructor(passedData?: DurationData) {
    let data: DurationData = passedData || {};
    this._elapsed = data.value || 0;
  }

  toJSON() {
    return {
      value: this._elapsed,
    };
  }

  getMinutes(): number {
    // remove seconds from the time
    const elapsedNoSeconds = Math.floor(this._elapsed / 60);

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
    return pad0(duration.getMinutes(), 2) + ':' + pad0(duration.getSeconds(), 2);
  }

  static add(duration1: Duration, duration2: Duration): Duration {
    return Duration.create(duration1._elapsed + duration2._elapsed);
  }

  static addToDate(date: number, duration: Duration): number {
    let result = new Date(date);
    result.setMinutes(result.getMinutes(),
      result.getSeconds() + duration._elapsed);
    return result.getTime();
  }

  static calculateElapsed(startTime: number, endTime: number): Duration {
    // Compute diff in seconds (convert from ms)
    let timeDiff = (endTime - startTime) / 1000;
    return Duration.create(timeDiff);
  }
}

export class ManualTimeProvider extends CurrentTimeProvider {
  currentTime: number | undefined;

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
  provider: CurrentTimeProvider;
  isRunning: boolean;
  startTime: number | undefined;
  duration: Duration;

  constructor(passedData?: TimerData, timeProvider?: CurrentTimeProvider) {
    let data: TimerData = passedData || {};
    this.provider = timeProvider || new CurrentTimeProvider();
    this.isRunning = data.isRunning || false;
    this.startTime = data.startTime;
    this.duration = new Duration(data.duration);
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

  start() {
    if (this.isRunning) {
      // Already started
      return;
    }
    this.isRunning = true;
    this.startTime = this.getCurrentTime();
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
    let stopTime = retroactiveStopTime ?? this.getCurrentTime();
    let elapsed = Duration.calculateElapsed(this.startTime!, stopTime);

    // Added elapsed to accumulated duration
    return Duration.add(this.duration, elapsed);
  }
}

export class TimerWidget {
  timer: Timer | undefined;
  display: HTMLElement;

  constructor(display: HTMLElement) {
    this.display = display;
  }

  attach(timer: Timer) {
    this.timer = timer;
    this.refresh();
  }

  refresh() {
    if (!this.timer || !this.timer.isRunning) {
      return;
    }
    this.print();
    requestAnimationFrame(this.refresh.bind(this));
  }

  print() {
    let text = '';
    if (this.timer) {
      text = Duration.format(this.timer.getElapsed());
    }
    this.display.innerText = text;
  }
}

export class DateFormatter {
  formatter: Intl.DateTimeFormat;

  constructor() {
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric', month: 'short', day: 'numeric', weekday: 'short', hour: 'numeric', minute: '2-digit'
    };
    this.formatter = new Intl.DateTimeFormat('default', options);
  }

  format(date: Date): string {
    return this.formatter.format(date);
  }
}
