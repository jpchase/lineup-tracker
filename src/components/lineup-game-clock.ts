/** @format */

import '@material/mwc-button';
import '@material/mwc-dialog';
import { Dialog } from '@material/mwc-dialog';
import { MDCDialogCloseEventDetail } from '@material/mwc-dialog/mwc-dialog-base.js';
import '@material/mwc-icon';
import '@material/mwc-icon-button';
import '@material/mwc-icon-button-toggle';
import '@material/mwc-radio';
import { Radio } from '@material/mwc-radio';
import { html, LitElement } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { Timer, TimerData } from '../models/clock.js';
import { PeriodStatus } from '../models/live.js';
import { SharedStyles } from './shared-styles.js';
import { TimerController } from './timer-controller.js';

export interface ClockToggleDetail {
  isStarted: boolean;
}

export interface ClockEndPeriodDetail {
  extraMinutes?: number;
}

export interface ClockPeriodData {
  currentPeriod: number;
  periodLength: number;
  periodStatus: PeriodStatus;
}

const START_PERIOD_EVENT_NAME = 'clock-start-period';
export class ClockStartPeriodEvent extends CustomEvent<{}> {
  static eventName = START_PERIOD_EVENT_NAME;

  constructor() {
    super(ClockStartPeriodEvent.eventName, {
      detail: {},
      bubbles: true,
      composed: true,
    });
  }
}

const END_PERIOD_EVENT_NAME = 'clock-end-period';
export class ClockEndPeriodEvent extends CustomEvent<ClockEndPeriodDetail> {
  static eventName = END_PERIOD_EVENT_NAME;

  constructor(detail: ClockEndPeriodDetail) {
    super(ClockEndPeriodEvent.eventName, {
      detail,
      bubbles: true,
      composed: true,
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
      composed: true,
    });
  }
}

@customElement('lineup-game-clock')
export class LineupGameClock extends LitElement {
  override render() {
    const periodText = `Period: ${this.periodData?.currentPeriod || 1}`;
    let periodPending = false;
    let periodRunning = false;
    const periodOverdue = this.isPeriodOverdue();
    switch (this.periodData?.periodStatus) {
      case PeriodStatus.Pending:
        periodPending = true;
        break;

      case PeriodStatus.Overdue:
      case PeriodStatus.Running:
        periodRunning = true;
        break;

      default:
        break;
    }

    return html` ${SharedStyles}
      <style>
        :host {
          display: inline-block;
        }
        #period-overdue {
          color: red;
        }
        ul.fields {
          list-style-type: none;
        }
      </style>
      <span>
        <span id="game-period">${periodText}</span>
        <mwc-icon id="period-overdue" ?hidden="${!periodOverdue}">running_with_errors</mwc-icon>
        <span id="period-timer">${this.timer.text}</span>
        <mwc-icon-button-toggle
          id="toggle-button"
          ?on="${this.timer.timer?.isRunning}"
          onIcon="pause_circle_outline"
          offIcon="play_circle_outline"
          label="Start/pause the clock"
          ?hidden="${!periodRunning}"
          @icon-button-toggle-change="${this.toggleClock}"
        >
        </mwc-icon-button-toggle>
        <mwc-icon-button
          id="end-button"
          icon="stop"
          label="End period"
          @click="${this.endPeriod}"
          ?hidden="${!periodRunning}"
        >
        </mwc-icon-button>
        <mwc-button
          id="start-button"
          icon="not_started"
          @click="${this.startPeriod}"
          ?hidden="${!periodPending}"
          >Start</mwc-button
        >
      </span>
      <mwc-dialog
        id="end-overdue-dialog"
        heading="End Overdue Period"
        @closed="${this.endOverduePeriod}"
      >
        <ul class="fields">
          <li>
            <mwc-formfield label="End at current time">
              <mwc-radio id="overdue-current-radio" name="overdueOptions" value="current" checked>
              </mwc-radio>
            </mwc-formfield>
          </li>
          <li>
            <mwc-formfield label="Retroactive">
              <mwc-radio
                id="overdue-retro-radio"
                name="overdueOptions"
                value="retro"
                @change="${this.overdueRetroChanged}"
              >
              </mwc-radio>
            </mwc-formfield>
          </li>
          <li>
            <mwc-formfield id="overdue-minutes-field" alignend label="Extra Minutes">
              <input
                type="number"
                min="1"
                max="15"
                ?required=${this.endOverdueRetroactive}
                ?disabled=${!this.endOverdueRetroactive}
              />
            </mwc-formfield>
          </li>
        </ul>
        <mwc-button slot="primaryAction" dialogAction="save">End</mwc-button>
        <mwc-button slot="secondaryAction" dialogAction="close">Cancel</mwc-button>
      </mwc-dialog>`;
  }

  private timer = new TimerController(this);
  private _timerData?: TimerData;

  @property({ type: Object })
  get timerData(): TimerData | undefined {
    return this._timerData;
  }
  set timerData(value: TimerData | undefined) {
    const oldValue = this._timerData;
    this._timerData = value;
    if (value !== oldValue) {
      this.timer.timer = new Timer(this._timerData);
    }
    this.requestUpdate('timerData', oldValue);
  }

  @property({ type: Object })
  public periodData?: ClockPeriodData;

  @state()
  private endOverdueRetroactive = false;

  private isPeriodOverdue() {
    return this.periodData?.periodStatus === PeriodStatus.Overdue;
  }

  private toggleClock(e: CustomEvent) {
    this.dispatchEvent(new ClockToggleEvent({ isStarted: e.detail.isOn }));
  }

  private startPeriod() {
    this.dispatchEvent(new ClockStartPeriodEvent());
  }

  private async endPeriod() {
    if (this.isPeriodOverdue()) {
      const dialog = this.shadowRoot!.querySelector<Dialog>('#end-overdue-dialog');
      dialog!.show();
      this.requestUpdate();
      // await this.updateComplete;
      return;
    }
    this.dispatchEvent(new ClockEndPeriodEvent({}));
  }

  private overdueRetroChanged() {
    const retroRadio = this.shadowRoot!.querySelector('#overdue-retro-radio') as Radio;
    this.endOverdueRetroactive = retroRadio.checked;
  }

  private endOverduePeriod(e: CustomEvent<MDCDialogCloseEventDetail>) {
    if (e.detail.action !== 'save') {
      return;
    }
    let extraMinutes: number | undefined;
    if (this.endOverdueRetroactive) {
      const minutesField = this.shadowRoot!.querySelector(
        '#overdue-minutes-field > input',
      ) as HTMLInputElement;
      extraMinutes = minutesField.valueAsNumber;
    }
    this.dispatchEvent(new ClockEndPeriodEvent({ extraMinutes }));
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lineup-game-clock': LineupGameClock;
  }
}

declare global {
  interface HTMLElementEventMap {
    [END_PERIOD_EVENT_NAME]: ClockEndPeriodEvent;
    [START_PERIOD_EVENT_NAME]: ClockStartPeriodEvent;
    [TOGGLE_EVENT_NAME]: ClockToggleEvent;
  }
}
