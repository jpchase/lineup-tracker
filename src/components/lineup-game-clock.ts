/**
@license
*/

import '@material/mwc-icon-button-toggle';
import { html, LitElement } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { Duration, Timer, TimerData } from '../models/clock';
import { SharedStyles } from './shared-styles';

export interface ClockToggleDetail {
  isStarted: boolean;
}

const TOGGLE_EVENT_NAME = 'clock-toggled';
export class ClockToggleEvent extends CustomEvent<ClockToggleDetail> {
  static eventName = TOGGLE_EVENT_NAME;

  constructor(detail: ClockToggleDetail) {
    super(ClockToggleEvent.eventName, {
      detail,
      bubbles: true,
      composed: true
    });
  }
}

declare global {
  interface HTMLElementEventMap {
    [TOGGLE_EVENT_NAME]: ClockToggleEvent;
  }
}

// This element is *not* connected to the Redux store.
@customElement('lineup-game-clock')
export class LineupGameClock extends LitElement {
  protected render() {
    return html`
      ${SharedStyles}
      <style>
        :host { display: inline-block; }
      </style>
      <span>
        <span id="gamePeriod">Period: 1</span>
        <mwc-icon-button-toggle id="clockToggle" ?on="${this._timer?.isRunning}"
          onIcon="pause_circle_outline" offIcon="play_circle_outline" label="Start/stop the clock"
          @icon-button-toggle-change="${this._toggleClock}"></mwc-icon-button-toggle>
        <span id="periodTimer">${this.timerText}</span>&nbsp;[<span id="gameTimer"></span>]
      </span>`
  }

  private _timer?: Timer;
  private _timerData?: TimerData;

  @property({ type: Object })
  get timerData(): TimerData | undefined {
    return this._timerData;
  }
  set timerData(value: TimerData | undefined) {
    const oldValue = this._timerData;
    this._timerData = value;
    if (value !== oldValue) {
      this._timer = new Timer(this._timerData);
      this.updateTimerText();
      this.refresh();
    }
    this.requestUpdate('timerData', oldValue);
  }

  @state()
  protected timerText: string = '';

  private refresh() {
    if (!this._timer || !this._timer.isRunning) {
      return;
    }
    this.updateTimerText();
    requestAnimationFrame(this.refresh.bind(this));
  }

  private updateTimerText() {
    let text = '';
    if (this._timer) {
      text = Duration.format(this._timer.getElapsed());
    }
    this.timerText = text;
  }

  private _toggleClock(e: CustomEvent) {
    this.dispatchEvent(new ClockToggleEvent({ isStarted: e.detail.isOn }));
  }
}
