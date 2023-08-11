/**
 * @format
 */

import { consume } from '@lit/context';
import '@material/mwc-button';
import { Dialog } from '@material/mwc-dialog';
import { MDCDialogCloseEventDetail } from '@material/mwc-dialog/mwc-dialog-base.js';
import '@material/mwc-icon-button';
import '@material/mwc-icon-button-toggle';
import '@material/mwc-formfield';
import { Radio } from '@material/mwc-radio';
import '@material/mwc-radio/mwc-radio.js';
import { html, LitElement, nothing, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import { Duration, TimeFormatter } from '../models/clock.js';
import { EventBase, EventCollection, EventCollectionData } from '../models/events.js';
import {
  GameEvent,
  GameEventType,
  PeriodEndEvent,
  PeriodStartEvent,
  PositionSwapEvent,
  SubInEvent,
} from '../models/live.js';
import { PlayerResolver, playerResolverContext } from './player-resolver.js';
import { SharedStyles } from './shared-styles.js';

interface EventItem {
  id: string;
  selected: boolean;
  event: EventBase;
}

enum EditTimeOptions {
  Custom = 'custom',
  Existing = 'existing',
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
    const selectionCount = this.eventsSelectedIds.length;

    return html`
      ${SharedStyles}
      <style>
        :host {
          display: inline-block;
        }

        .relative {
          margin-left: 0.5em;
        }

        tr[selected] {
          background-color: var(--mdc-theme-primary);
        }

        ul.fields {
          list-style-type: none;
        }
      </style>
      <table class="mdl-data-table mdl-js-data-table is-upgraded">
        <thead id="events-header">
          ${this.renderListHeader(selectionCount)}
        </thead>
        <tbody id="events-list">
          ${repeat(
            items,
            (item: EventItem) => item.id,
            (item: EventItem /*, index: number*/) => html`
              <tr
                data-event-id="${item.id}"
                ?selected="${item.selected}"
                @click="${this.itemClicked}"
              >
                <td class="mdl-data-table__cell--non-numeric">
                  ${this.renderEventTime(item.event as GameEvent, timeFormatter)}
                </td>
                <td class="eventType mdl-data-table__cell--non-numeric">
                  ${getEventTypeText(item.event.type as GameEventType)}
                </td>
                <td class="details">${this.renderEventDetails(item.event as GameEvent)}</td>
              </tr>
            `
          )}
        </tbody>
      </table>
      ${this.renderEditDialog(selectionCount)}
    `;
  }

  private renderListHeader(selectionCount: number) {
    if (selectionCount > 0) {
      // Render the event selection toolbar
      const selectedText = selectionCount === 1 ? '1 event' : `${selectionCount} events`;
      return html`<tr>
        <th class="" colspan="3">
          <mwc-icon-button
            id="cancel-selection-button"
            icon="close"
            label="Cancel selection"
            @click="${this.cancelSelection}"
          ></mwc-icon-button>
          <span id="selection-count">${selectedText}</span>
          <mwc-icon-button
            id="edit-selection-button"
            icon="edit"
            label="Edit selected events"
            @click="${this.editSelection}"
          ></mwc-icon-button>
        </th>
      </tr>`;
    }

    return html`<tr>
      <th class="mdl-data-table__cell--non-numeric">Time</th>
      <th class="mdl-data-table__cell--non-numeric">Type</th>
      <th class="mdl-data-table__cell--non-numeric">Details</th>
    </tr>`;
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

  private renderEditDialog(selectionCount: number) {
    if (!selectionCount) {
      return nothing;
    }

    const editTimeCustom = this.editTimeOption === EditTimeOptions.Custom;

    let customTime: Date | null = null;
    if (selectionCount === 1) {
      const selectedEvent = this.events?.get(this.eventsSelectedIds[0])!;
      customTime = new Date(selectedEvent.timestamp!);
      customTime.setMilliseconds(0);
    }

    return html`<mwc-dialog
      id="edit-dialog"
      heading="Edit event dates"
      @closed="${this.applyEventUpdates}"
    >
      <ul class="fields">
        <li>
          <mwc-formfield label="Custom">
            <mwc-radio
              id="time-custom-radio"
              name="editTimeOptions"
              value="${EditTimeOptions.Custom}"
              checked
              @change="${this.timeRadioChanged}"
            >
            </mwc-radio>
          </mwc-formfield>
        </li>
        <li>
          <mwc-formfield id="custom-time-field" alignend label="Set event time">
            <input
              type="time"
              step="1"
              .valueAsDate=${customTime}
              ?required=${editTimeCustom}
              ?disabled=${!editTimeCustom}
            />
          </mwc-formfield>
        </li>
        <li>
          <mwc-formfield label="Existing">
            <mwc-radio
              id="time-existing-radio"
              name="editTimeOptions"
              value="${EditTimeOptions.Existing}"
              @change="${this.timeRadioChanged}"
            >
            </mwc-radio>
          </mwc-formfield>
        </li>
        <li>
          <mwc-formfield id="existing-time-field" alignend label="From existing event">
          </mwc-formfield>
        </li>
      </ul>
      <mwc-button slot="primaryAction" dialogAction="save">Save</mwc-button>
      <mwc-button slot="secondaryAction" dialogAction="close">Cancel</mwc-button>
    </mwc-dialog> `;
  }

  private events?: EventCollection;
  private periods?: { periodNumber: number; startTime: number }[];

  @consume({ context: playerResolverContext, subscribe: true })
  @property({ attribute: false })
  playerResolver!: PlayerResolver;

  @property({ type: Object })
  public eventData?: EventCollectionData;

  @property({ type: Array })
  public eventsSelectedIds: string[] = [];

  @state()
  private editTimeOption = EditTimeOptions.Custom;

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
      for (const event of this.events) {
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
    if (!this.events?.size) {
      return [];
    }

    const selectedIds = this.eventsSelectedIds ?? [];
    const items: EventItem[] = [];
    for (const event of this.events) {
      // Ignore sub out events, as the sub in event will show all the detail.
      if (event.type === GameEventType.SubOut) {
        continue;
      }
      items.push({
        id: event.id!,
        selected: selectedIds.includes(event.id!),
        event,
      });
    }
    // Return events with most recent first (reverse chronological order).
    return items.sort((a, b) => b.event.timestamp! - a.event.timestamp!);
  }

  private lookupPlayer(playerId: string) {
    return this.playerResolver.getPlayer(playerId);
  }

  private itemClicked(e: Event) {
    const item = e.currentTarget as HTMLTableRowElement;
    const eventId = item.dataset.eventId!;
    // eslint-disable-next-line no-console
    console.log(`Row clicked for event: ${eventId}, ${item.tagName}`);
    const isSelected = item.hasAttribute('selected');
    this.dispatchEvent(new EventSelectedEvent({ eventId, selected: !isSelected }));
  }

  private cancelSelection() {
    // eslint-disable-next-line no-console
    console.log(`Cancel selection`);
  }

  private async editSelection() {
    // eslint-disable-next-line no-console
    console.log(`Edit selection`);
    const dialog = this.shadowRoot!.querySelector<Dialog>('#edit-dialog');
    // this.editTimeCustom = true;
    dialog!.show();
    this.requestUpdate();
    // await this.updateComplete;
  }

  private timeRadioChanged(e: UIEvent) {
    const radio = e.target as Radio;
    this.editTimeOption = radio.value as EditTimeOptions;
  }

  private applyEventUpdates(e: CustomEvent<MDCDialogCloseEventDetail>) {
    if (e.detail.action !== 'save') {
      // return;
    }
    /*
    let extraMinutes: number | undefined;
    if (this.endOverdueRetroactive) {
      const minutesField = this.shadowRoot!.querySelector(
        '#overdue-minutes-field > input'
      ) as HTMLInputElement;
      extraMinutes = minutesField.valueAsNumber;
    }
    this.dispatchEvent(new ClockEndPeriodEvent({ extraMinutes }));
    */
  }
}

export interface EventSelectedDetail {
  selected: boolean;
  eventId: string;
}

const EVENT_SELECTED_EVENT_NAME = 'event-selected';
export class EventSelectedEvent extends CustomEvent<EventSelectedDetail> {
  static eventName = EVENT_SELECTED_EVENT_NAME;

  constructor(detail: EventSelectedDetail) {
    super(EventSelectedEvent.eventName, {
      detail,
      bubbles: true,
      composed: true,
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lineup-game-events': LineupGameEvents;
  }
}

declare global {
  interface HTMLElementEventMap {
    [EVENT_SELECTED_EVENT_NAME]: EventSelectedEvent;
  }
}
