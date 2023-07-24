/**
 * @format
 */

import '@material/mwc-button';
import '@material/mwc-icon-button';
import '@material/mwc-icon-button-toggle';
import { html, LitElement, PropertyValues } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import { TimeFormatter } from '../models/clock.js';
import { EventBase, EventCollection, EventCollectionData } from '../models/events.js';
import { LivePlayer } from '../models/live.js';
import { SharedStyles } from './shared-styles.js';

interface EventItem {
  id: string;
  event: EventBase;
}

// This element is *not* connected to the Redux store.
@customElement('lineup-game-events')
export class LineupGameEvents extends LitElement {
  override render() {
    const items = this.getEventItems();
    const timeFormatter = new TimeFormatter();

    return html` ${SharedStyles}
      <style>
        :host {
          display: inline-block;
        }
      </style>
      <table class="mdl-data-table mdl-js-data-table is-upgraded">
        <thead>
          <tr>
            <th class="mdl-data-table__cell--non-numeric">Time</th>
            <th class="mdl-data-table__cell--non-numeric">Type</th>
            <th class="mdl-data-table__cell--non-numeric">Details</th>
          </tr>
        </thead>
        <tbody id="events-list">
          ${repeat(
            items,
            (item: EventItem) => item.id,
            (item: EventItem /*, index: number*/) => html`
              <tr data-event-id="${item.id}">
                <td class=" mdl-data-table__cell--non-numeric">
                  ${this.renderEventTime(item.event.timestamp!, timeFormatter)}
                </td>
                <td class="playerName mdl-data-table__cell--non-numeric">${item.event.type}</td>
                <td class="details">${JSON.stringify(item.event.data)}</td>
              </tr>
            `
          )}
        </tbody>
      </table>`;
  }

  private renderEventTime(timestamp: number, formatter: TimeFormatter) {
    // TODO: Also show as offset from start of game period
    return html`${formatter.format(new Date(timestamp))}`;
  }

  private events?: EventCollection;

  @property({ type: Object })
  public eventData?: EventCollectionData;

  @property({ type: Array })
  public players: LivePlayer[] = [];

  override willUpdate(changedProperties: PropertyValues<this>) {
    if (!changedProperties.has('eventData')) {
      return;
    }
    const oldValue = changedProperties.get('eventData');
    if (this.eventData === oldValue) {
      return;
    }

    this.events = this.eventData ? EventCollection.create(this.eventData) : undefined;
  }

  private getEventItems(): EventItem[] {
    if (!this.events?.events.length || !this.players.length) {
      return [];
    }

    const events = this.events!;

    // Return events with most recent first (reverse chronological order).
    return events.events
      .map((event) => {
        return {
          id: event.id!,
          type: event.type,
          // name: this.getPlayer(this.players, tracker.id)?.name!,
          event,
        };
      })
      .sort((a, b) => b.event.timestamp! - a.event.timestamp!);
  }

  // private getPlayer(players: LivePlayer[], playerId: string) {
  //   return players.find((p) => p.id === playerId);
  // }
}

declare global {
  interface HTMLElementTagNameMap {
    'lineup-game-events': LineupGameEvents;
  }
}
