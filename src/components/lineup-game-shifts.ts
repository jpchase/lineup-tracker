/**
 * @format
 * @license
 */

import { ContextConsumer } from '@lit-labs/context';
import '@material/mwc-button';
import '@material/mwc-icon-button';
import '@material/mwc-icon-button-toggle';
import { html, LitElement, PropertyValues } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import { Duration } from '../models/clock.js';
import { LivePlayer } from '../models/live.js';
import {
  PlayerTimeTracker,
  PlayerTimeTrackerMap,
  PlayerTimeTrackerMapData,
} from '../models/shift.js';
import { SharedStyles } from './shared-styles.js';
import { synchronizedTimerContext } from './synchronized-timer.js';

interface ShiftRow {
  id: string;
  name: string;
  tracker: PlayerTimeTracker;
}

// This element is *not* connected to the Redux store.
@customElement('lineup-game-shifts')
export class LineupGameShifts extends LitElement {
  override render() {
    const rows = this.getShiftRows();

    return html` ${SharedStyles}
      <style>
        :host {
          display: inline-block;
        }
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
          ${repeat(
            rows,
            (row: ShiftRow) => row.id,
            (row: ShiftRow /*, index: number*/) => html`
              <tr data-row-id="${row.id}">
                <td class="playerName mdl-data-table__cell--non-numeric">${row.name}</td>
                <td class="shiftCount">${row.tracker.shiftCount}</td>
                <td class="totalTime mdl-data-table__cell--non-numeric">
                  ${Duration.format(row.tracker.totalOnTime)}
                </td>
              </tr>
            `
          )}
        </tbody>
      </table>`;
  }

  private trackerMap?: PlayerTimeTrackerMap;

  protected timerNotifier = new ContextConsumer(
    this,
    synchronizedTimerContext,
    (notifier /*, dispose*/) => {
      // TODO: implement dispose to unregister from notifications
      notifier.registerTimer(this);
    },
    true // we want updates when the notifier changes
  );

  @property({ type: Object })
  public trackerData?: PlayerTimeTrackerMapData;

  @property({ type: Array })
  public players: LivePlayer[] = [];

  // TODO: unsubscribe from notifier?
  /*
  override disconnectedCallback() {
    super.disconnectedCallback();
  }
  */

  override willUpdate(changedProperties: PropertyValues<this>) {
    if (!changedProperties.has('trackerData')) {
      return;
    }
    const oldValue = changedProperties.get('trackerData');
    if (this.trackerData === oldValue) {
      return;
    }

    this.trackerMap = this.trackerData ? PlayerTimeTrackerMap.create(this.trackerData) : undefined;
  }

  private getShiftRows(): ShiftRow[] {
    if (!this.trackerMap?.trackers.length || !this.players.length) {
      return [];
    }

    const trackerMap = this.trackerMap!;

    return trackerMap.trackers
      ?.map((tracker) => {
        return {
          id: tracker.id,
          name: this.getPlayer(this.players, tracker.id)?.name!,
          tracker,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  public timerUpdateRequested() {
    this.requestUpdate();
  }

  private getPlayer(players: LivePlayer[], playerId: string) {
    return players.find((p) => p.id === playerId);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lineup-game-shifts': LineupGameShifts;
  }
}
