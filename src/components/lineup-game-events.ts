/**
 * @format
 */

import { contextProvided } from '@lit-labs/context';
import '@material/mwc-button';
import '@material/mwc-icon-button';
import '@material/mwc-icon-button-toggle';
import { html, LitElement, nothing, PropertyValues } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import { Duration, TimeFormatter } from '../models/clock.js';
import { EventBase, EventCollection, EventCollectionData } from '../models/events.js';
import {
  GameEvent,
  GameEventType,
  LivePlayer,
  PeriodEndEvent,
  PeriodStartEvent,
  PositionSwapEvent,
  SubInEvent,
} from '../models/live.js';
import { PlayerResolver, playerResolverContext } from './player-resolver.js';
import { SharedStyles } from './shared-styles.js';

interface EventItem {
  id: string;
  event: EventBase;
}

function getEventTypeText(eventType: GameEventType): string {
  switch (eventType) {
    case GameEventType.PeriodEnd:
      return 'Period completed';
    case GameEventType.PeriodStart:
      return 'Period started';
    case GameEventType.Setup:
      return 'Setup completed';
    case GameEventType.SubIn:
      return 'Substitution';
    case GameEventType.Swap:
      return 'Position changed';

    // TODO: Add formatted text for these event types.
    case GameEventType.SubOut:
      return eventType;

    default:
      throw new TypeError(`Unknown event type: ${eventType}`);
  }
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

        .relative {
          margin-left: 0.5em;
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
                <td class="mdl-data-table__cell--non-numeric">
                  ${this.renderEventTime(item.event as GameEvent, timeFormatter)}
                </td>
                <td class="playerName mdl-data-table__cell--non-numeric">
                  ${getEventTypeText(item.event.type as GameEventType)}
                </td>
                <td class="details">${this.renderEventDetails(item.event as GameEvent)}</td>
              </tr>
            `
          )}
        </tbody>
      </table>`;
  }

  private renderEventTime(event: GameEvent, formatter: TimeFormatter) {
    let showRelativeTime = false;
    switch (event.type) {
      case GameEventType.PeriodStart:
      case GameEventType.PeriodEnd:
      case GameEventType.SubIn:
      case GameEventType.Swap:
        showRelativeTime = true;
        break;

      default:
    }

    const eventTime = event.timestamp!;
    let relativeText = '';
    if (showRelativeTime && this.periods?.length) {
      // Get the start time for the period containing this event.
      let containingPeriod = this.periods[0];
      for (let index = 1; index < this.periods.length; index++) {
        const period = this.periods[index];
        if (period.startTime > eventTime) {
          break;
        }
        containingPeriod = period;
      }
      const elapsed = Duration.calculateElapsed(containingPeriod.startTime, eventTime);
      relativeText = Duration.format(elapsed);
    }

    return html`<span class="absolute">${formatter.format(new Date(eventTime))}</span
      >${showRelativeTime ? html`<span class="relative">[${relativeText}]</span>` : nothing}`;
  }

  private renderEventDetails(event: GameEvent) {
    switch (event.type) {
      case GameEventType.PeriodStart: {
        const startEvent = event as PeriodStartEvent;
        // TODO: Show "First half" or "game started", "Second half"?
        return html`Start of period ${startEvent.data.clock.currentPeriod}`;
      }
      case GameEventType.PeriodEnd: {
        const startEvent = event as PeriodEndEvent;
        // TODO: Period end, show "halftime", or "final whistle" or <something else>
        return html`End of period ${startEvent.data.clock.currentPeriod}`;
      }

      case GameEventType.SubIn: {
        const subInEvent = event as SubInEvent;
        const inPlayer = this.lookupPlayer(subInEvent.playerId);
        const outPlayer = this.lookupPlayer(subInEvent.data.replaced);
        return html`${inPlayer?.name} replaced ${outPlayer?.name}, at ${subInEvent.data.position}`;
      }

      case GameEventType.Swap: {
        const swapEvent = event as PositionSwapEvent;
        const player = this.lookupPlayer(swapEvent.playerId);
        return html`${player?.name} moved to ${swapEvent.data.position} (from
        ${swapEvent.data.previousPosition})`;
      }

      default:
        return html`${JSON.stringify(event.data)}`;
    }
  }

  private events?: EventCollection;
  private periods?: { periodNumber: number; startTime: number }[];

  @contextProvided({ context: playerResolverContext, subscribe: true })
  @property({ attribute: false })
  playerResolver!: PlayerResolver;

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

    if (this.eventData) {
      this.events = EventCollection.create(this.eventData);
      this.periods = [];
      for (const event of this.events.events) {
        if (event.type !== GameEventType.PeriodStart) {
          continue;
        }
        const periodStart = event as PeriodStartEvent;
        this.periods.push({
          periodNumber: periodStart.data.clock.currentPeriod,
          startTime: periodStart.data.clock.startTime,
        });
      }
      // Ensure periods are sorted in ascending order of start time.
      this.periods.sort((a, b) => a.startTime - b.startTime);
    } else {
      this.events = undefined;
      this.periods = undefined;
    }
  }

  private getEventItems(): EventItem[] {
    if (!this.events?.events.length || !this.players.length) {
      return [];
    }

    const events = this.events!;

    // Return events with most recent first (reverse chronological order).
    return (
      events.events
        // Ignore sub out events, as the sub in event will show all the detail.
        .filter((event) => event.type !== GameEventType.SubOut)
        .map((event) => {
          return {
            id: event.id!,
            type: event.type,
            // name: this.getPlayer(this.players, tracker.id)?.name!,
            event,
          };
        })
        .sort((a, b) => b.event.timestamp! - a.event.timestamp!)
    );
  }

  private lookupPlayer(playerId: string) {
    return this.playerResolver.getPlayer(playerId);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lineup-game-events': LineupGameEvents;
  }
}
