/**
@license
*/

import '@material/mwc-button';
import '@material/mwc-icon-button';
import '@material/mwc-icon-button-toggle';
import { html, LitElement, PropertyValues } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import { Duration } from '../models/clock.js';
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
  override render() {
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
          <tr data-row-id="${row.id}">
            <td class="playerName mdl-data-table__cell--non-numeric">${row.name}</td>
            <td class="shiftCount">${row.tracker.shiftCount}</td>
            <td class="totalTime mdl-data-table__cell--non-numeric">${Duration.format(row.tracker.getTotalTime())}</td>
          </tr>
        `)}
        </tbody>
      </table>`
  }

  private trackerMap?: PlayerTimeTrackerMap;
  private timerId?: number;

  @property({ type: Object })
  public trackerData?: PlayerTimeTrackerMapData;

  @property({ type: Array })
  public players: LivePlayer[] = [];

  override disconnectedCallback() {
    super.disconnectedCallback()
    this.clearRefreshTimer();
  }

  override willUpdate(changedProperties: PropertyValues<this>) {
    if (!changedProperties.has('trackerData')) {
      return;
    }
    const oldValue = changedProperties.get('trackerData');
    if (this.trackerData === oldValue) {
      return;
    }

    this.trackerMap = new PlayerTimeTrackerMap(this.trackerData);
    if (this.trackerData?.clockRunning !== oldValue?.clockRunning) {
      this.resetRefreshTimer();
    }
  }

  private getShiftRows(): ShiftRow[] {
    if (!this.trackerMap?.trackers.length || !this.players.length) {
      return [];
    }

    const trackerMap = this.trackerMap!;

    return trackerMap.trackers?.map(tracker => {
      return {
        id: tracker.id,
        name: this.getPlayer(this.players, tracker.id)?.name!,
        tracker: tracker
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }

  private clearRefreshTimer() {
    window.clearInterval(this.timerId);
    this.timerId = undefined;
  }

  private resetRefreshTimer() {
    if (!this.trackerData?.clockRunning) {
      this.clearRefreshTimer();
      return;
    }
    // When the clock is running, update the shift times every 10 seconds.
    this.timerId = window.setInterval(() => {
      this.requestUpdate();
    }, 10000);
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
