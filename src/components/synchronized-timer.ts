import { createContext } from '@lit-labs/context';

export interface SynchronizedTimer {
  timerUpdateRequested(): void;
}

export class SynchronizedTimerNotifier {
  private timers = new Set<SynchronizedTimer>();

  registerTimer(timer: SynchronizedTimer) {
    if (!timer) {
      return;
    }
    this.timers.add(timer);
  }
  // TODO: Do we need unregisterTimer/deleteTimer
  notifyTimers() {
    this.timers.forEach(timer => {
      timer.timerUpdateRequested();
    })
  }
}

export const synchronizedTimerContext = createContext<SynchronizedTimerNotifier>('synchronized-timer');
