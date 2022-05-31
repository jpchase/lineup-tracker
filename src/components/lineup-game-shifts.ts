/**
@license
*/

import '@material/mwc-button';
import '@material/mwc-icon-button';
import '@material/mwc-icon-button-toggle';
import { html, LitElement } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import { Duration, Timer, TimerData } from '../models/clock.js';
import { LivePlayer } from '../models/game.js';
import { PlayerTimeTracker, PlayerTimeTrackerMap, PlayerTimeTrackerMapData } from '../models/shift.js';
import { SharedStyles } from './shared-styles.js';

interface ShiftRow {
  id: string;
  name: string;
  tracker: PlayerTimeTracker
}

// This element is *not* connected to the Redux store.
@customElement('lineup-game-shifts')
export class LineupGameShifts extends LitElement {
  protected render() {
    const rows = this.getShiftRows();

    return html`
      ${SharedStyles}
      <style>
        :host { display: inline-block; }
      </style>
      <table class="mdl-data-table mdl-js-data-table is-upgraded">
        <thead>
          <tr>
            <th class="mdl-data-table__cell--non-numeric">Name</th>
            <th>Shifts</th>
            <th class="mdl-data-table__cell--non-numeric">Time</th>
          </tr>
        </thead>
        <tbody id="live-playing-time">
        ${repeat(rows, (row: ShiftRow) => row.id, (row: ShiftRow /*, index: number*/) => html`
          <tr>
            <td class="playerName mdl-data-table__cell--non-numeric">${row.name}</td>
            <td class="shiftCount">${row.tracker.shiftCount}</td>
            <td class="totalTime mdl-data-table__cell--non-numeric">${Duration.format(row.tracker.getTotalTime())}</td>
          </tr>
        `)}
        </tbody>
      </table>`
  }

  private _timer?: Timer;
  private _timerData?: TimerData;
  private timerId?: number;

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
  public trackerData?: PlayerTimeTrackerMapData;

  @property({ type: Array })
  public players: LivePlayer[] = [];

  @state()
  protected timerText: string = '';

  getShiftRows(): ShiftRow[] {
    if (!this.trackerData || !this.players.length) {
      return [];
    }

    const trackerMap = new PlayerTimeTrackerMap(this.trackerData);

    return trackerMap.trackers?.map(tracker => {
      return {
        id: tracker.id,
        name: this.getPlayer(this.players, tracker.id)?.name!,
        tracker: tracker
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }

  private refresh() {
    if (!this.trackerData?.clockRunning) {
      clearInterval(this.timerId);
      this.timerId = undefined;
      return;
    }
    /*
    this.timerId = setInterval(() => {
      // Update the host with new value
      this.host.requestUpdate();
    }, this.timeout);
    this.updateTimerText();
    TODO: use settimeout instead, or directive ?
      requestAnimationFrame(this.refresh.bind(this));
      */
  }

  private updateTimerText() {
    let text = '';
    if (this._timer) {
      text = Duration.format(this._timer.getElapsed());
    }
    this.timerText = text;
  }

  private getPlayer(players: LivePlayer[], playerId: string) {
    return players.find(p => (p.id === playerId))
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lineup-game-shifts': LineupGameShifts;
  }
}
