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

  private refresh() {
    if (!this.timer || !this.timer.isRunning) {
      return;
    }
    this.updateTimerText();
    // Update the host with new value
    this.host.requestUpdate();
    requestAnimationFrame(this.refresh.bind(this));
  }

  private updateTimerText() {
    let text = '';
    if (this.timer) {
      text = Duration.format(this.timer.getElapsed());
    }
    this.text = text;
  }
}
