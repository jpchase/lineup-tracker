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

export class Duration {
  static zero(): number[] {
    return [0, 0];
  }

  static format(elapsed: number[]): string {
    return pad0(elapsed[0], 2) + ':' + pad0(elapsed[1], 2);
  }

  static add(duration1: number[], duration2: number[]): number[] {
    let total = duration1.slice(0);
    total[0] += duration2[0];
    total[1] += duration2[1];

    if (total[1] >= 60) {
      total[0] += 1;
      total[1] -= 60;
    }
    return total;
  }

  static addToDate(date: number, duration: number[]): number {
    let result = new Date(date);
    result.setMinutes(result.getMinutes() + duration[0],
                      result.getSeconds() + duration[1]);
    return result.getTime();
  }
}

export class ManualTimeProvider extends CurrentTimeProvider {
  currentTime: number | undefined;

  setCurrentTime(newTime: number) {
    this.currentTime = newTime;
  }

  incrementCurrentTime(duration: number[]) {
    this.currentTime = Duration.addToDate(this.getTimeInternal(), duration);
  }

  getTimeInternal() {
    return this.currentTime || super.getTimeInternal();
  }
}

export class Timer {
  provider: CurrentTimeProvider;
  isRunning: boolean;
  startTime: number | null;
  duration: number[];

  constructor(passedData?: any, timeProvider?: CurrentTimeProvider) {
    let data = passedData || {};
    this.provider = timeProvider || new CurrentTimeProvider();
    this.isRunning = data.isRunning || false;
    this.startTime = data.startTime || null;
    this.duration = data.duration || [0, 0];
  }

  reset() {
    this.isRunning = false;
    this.duration = [0, 0];
    this.startTime = null;
  }

  toJSON() {
    return {
      isRunning: this.isRunning,
      startTime: this.startTime,
      duration: this.duration,
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

  stop() {
    if (!this.isRunning) {
      // Already stopped
      return;
    }
    this.isRunning = false;
    // Calculate elapsed since last start and add to stored duration
    this.duration = this.addElapsed();
    this.startTime = null;
  }

  getElapsed() {
    if (!this.isRunning) {
      return this.duration;
    }
    // Currently running, calculate as: time so far + stored duration
    return this.addElapsed();
  }

  getCurrentTime() {
    return this.provider.getCurrentTime();
  }

  private addElapsed() {
    let stopTime = this.getCurrentTime();
    let elapsed = calculateElapsed(this.startTime!, stopTime);

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

function calculateElapsed(startTime: number, endTime: number) {
  let elapsed = [0, 0];
  // Compute diff in seconds (convert from ms)
  let timeDiff = (endTime - startTime) / 1000;

  // get seconds
  elapsed[1] = Math.round(timeDiff % 60);

  // remove seconds from the time
  timeDiff = Math.floor(timeDiff / 60);

  // get minutes
  elapsed[0] = Math.round(timeDiff % 100);

  return elapsed;
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
