import { Duration, Timer } from '../models/clock.js';
import { ReactiveController, ReactiveControllerHost } from 'lit';

export class TimerController implements ReactiveController {
  host: ReactiveControllerHost;

  text = '';
  private _timer?: Timer;

  constructor(host: ReactiveControllerHost) {
    (this.host = host).addController(this);
  }

  set timer(value: Timer | undefined) {
    this._timer = value;
    this.updateTimerText();
    this.refresh();
  }
  get timer() { return this._timer; }

  hostConnected() {
    this.refresh();
  }

  hostDisconnected() {
  }

  protected refresh() {
    if (!this.timer || !this.timer.isRunning) {
      return;
    }
    this.updateTimerText();
    // Update the host with new value
    this.host.requestUpdate();
    requestAnimationFrame(this.refresh.bind(this));
  }

  protected updateTimerText() {
    let text = '';
    if (this.timer) {
      text = Duration.format(this.timer.getElapsed());
    }
    this.text = text;
  }
}

export class SynchronizedTimerController extends TimerController {
  constructor(host: ReactiveControllerHost) {
    super(host);
  }

  override refresh() {
    if (!this.timer || !this.timer.isRunning) {
      return;
    }
    this.updateTimerText();
    // Update the host with new value
    this.host.requestUpdate();
  }

  timerUpdateRequested() {
    this.refresh();
  }
}

export interface SynchronizedTriggerHost extends ReactiveControllerHost {
  requestTimerUpdate(): void;
}

export class SynchronizedTriggerController implements ReactiveController {
  private host: SynchronizedTriggerHost;
  private timerId?: number;
  private _isRunning: boolean;
  timeout: number;

  constructor(host: SynchronizedTriggerHost, timeout: number) {
    this.host = host;
    this.timeout = timeout;
    this._isRunning = false;
    this.host.addController(this);
  }

  set isRunning(value: boolean) {
    this._isRunning = value;
    this.resetRefreshTimer();
  }
  get isRunning() { return this._isRunning; }

  hostConnected() {
    this.resetRefreshTimer();
  }

  hostDisconnected() {
    this.clearRefreshTimer();
  }

  private clearRefreshTimer() {
    window.clearInterval(this.timerId);
    this.timerId = undefined;
  }

  private resetRefreshTimer() {
    if (!this.isRunning) {
      this.clearRefreshTimer();
      return;
    }
    // When running, trigger an update at the provided interval.
    this.timerId = window.setInterval(() => {
      this.host.requestTimerUpdate();
    }, this.timeout);
  }

}
