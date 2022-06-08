/**
@license
*/

import '@material/mwc-button';
import '@material/mwc-icon-button';
import '@material/mwc-icon-button-toggle';
import { html, LitElement } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { Duration, Timer, TimerData } from '../models/clock.js';
import { PeriodStatus } from '../models/live.js';
import { SharedStyles } from './shared-styles.js';

export interface ClockToggleDetail {
  isStarted: boolean;
}

export interface ClockPeriodData {
  currentPeriod: number;
  periodStatus: PeriodStatus;
}

// This element is *not* connected to the Redux store.
@customElement('lineup-game-clock')
export class LineupGameClock extends LitElement {
  override render() {
    const periodPending = this.periodData?.periodStatus === PeriodStatus.Pending;
    const periodRunning = this.periodData?.periodStatus === PeriodStatus.Running;
    const periodText = `Period: ${this.periodData?.currentPeriod || 1}`;

    return html`
      ${SharedStyles}
      <style>
        :host { display: inline-block; }
      </style>
      <span>
        <span id="gamePeriod">${periodText}</span>
        <span id="periodTimer">${this.timerText}</span>&nbsp;[<span id="gameTimer"></span>]
        <mwc-icon-button-toggle id="toggle-button" ?on="${this._timer?.isRunning}"
          onIcon="pause_circle_outline" offIcon="play_circle_outline" label="Start/pause the clock"
          ?hidden="${!periodRunning}"
          @icon-button-toggle-change="${this.toggleClock}"></mwc-icon-button-toggle>
        <mwc-icon-button id="end-button" icon="stop" label="End period"
          @click="${this.endPeriod}" ?hidden="${!periodRunning}"></mwc-icon-button>
        <mwc-button id="start-button" icon="not_started"
          @click="${this.startPeriod}" ?hidden="${!periodPending}">Start</mwc-button>
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

  @property({ type: Object })
  public periodData?: ClockPeriodData;

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

  private toggleClock(e: CustomEvent) {
    this.dispatchEvent(new ClockToggleEvent({ isStarted: e.detail.isOn }));
  }

  private startPeriod() {
    this.dispatchEvent(new ClockStartPeriodEvent());
  }

  private endPeriod() {
    this.dispatchEvent(new ClockEndPeriodEvent());
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lineup-game-clock': LineupGameClock;
  }
}

const START_PERIOD_EVENT_NAME = 'clock-start-period';
export class ClockStartPeriodEvent extends CustomEvent<{}> {
  static eventName = START_PERIOD_EVENT_NAME;

  constructor() {
    super(ClockStartPeriodEvent.eventName, {
      detail: {},
      bubbles: true,
      composed: true
    });
  }
}

const END_PERIOD_EVENT_NAME = 'clock-end-period';
export class ClockEndPeriodEvent extends CustomEvent<{}> {
  static eventName = END_PERIOD_EVENT_NAME;

  constructor() {
    super(ClockEndPeriodEvent.eventName, {
      detail: {},
      bubbles: true,
      composed: true
    });
  }
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
    [END_PERIOD_EVENT_NAME]: ClockEndPeriodEvent;
    [START_PERIOD_EVENT_NAME]: ClockStartPeriodEvent;
    [TOGGLE_EVENT_NAME]: ClockToggleEvent;
  }
}
