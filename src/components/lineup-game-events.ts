/**
 * @format
 */

import { consume } from '@lit/context';
import '@material/mwc-button';
import { Dialog } from '@material/mwc-dialog';
import { MDCDialogCloseEventDetail } from '@material/mwc-dialog/mwc-dialog-base.js';
import '@material/mwc-formfield';
import '@material/mwc-icon-button';
import '@material/mwc-icon-button-toggle';
import '@material/mwc-list/mwc-list-item.js';
import { Radio } from '@material/mwc-radio';
import '@material/mwc-radio/mwc-radio.js';
import '@material/mwc-select';
import { Select } from '@material/mwc-select';
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
    const timeFormatter = new TimeFormatter();
    const selectionCount = this.selectedItems.length;

    return html`
      ${SharedStyles}
      <style>
        :host {
          display: inline-block;
        }

        .relative {
          margin-left: 0.5em;
        }

        #events-list,
        .edit-events-list,
        .edit-events-list tbody {
          border: 1px solid;
          vertical-align: top;
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
          ${this.renderListItems(this.eventItems, timeFormatter)}
        </tbody>
      </table>
      ${this.renderEditDialog(timeFormatter)}
    `;
  }

  private renderListItems(
    items: EventItem[],
    timeFormatter: TimeFormatter,
    mode: string = 'default'
  ) {
    // Only handle selection in default rendering mode.
    const clickHandler = mode === 'default' ? this.itemClicked : null;
    const allowSelection = mode === 'default';
    return html`${repeat(
      items,
      (item: EventItem) => item.id + mode,
      (item: EventItem /*, index: number*/) => html`
        <tr
          data-event-id="${item.id}"
          ?selected="${allowSelection && item.selected}"
          @click="${clickHandler}"
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
    )}`;
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

  private renderEditDialog(timeFormatter: TimeFormatter) {
    const selectionCount = this.selectedItems.length;
    if (!selectionCount) {
      return nothing;
    }

    const editTimeCustom = this.editTimeOption === EditTimeOptions.Custom;

    const selectedEvent = this.selectedItems[0].event;
    const customTime = new Date(selectedEvent.timestamp!);
    customTime.setMilliseconds(0);

    return html`<mwc-dialog
      id="edit-dialog"
      heading="Edit event dates"
      @closed="${this.applyEventUpdates}"
    >
      <table class="edit-events-list" rules="all">
        <tbody>
          ${this.renderListItems(this.selectedItems, timeFormatter, 'edit')}
        </tbody>
      </table>
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
          <mwc-select
            id="existing-time-field"
            ?required=${!editTimeCustom}
            ?disabled=${editTimeCustom}
            ?fixedmenuposition=${true}
          >
            ${repeat(
              this.eventItems,
              (item: EventItem) => item.id,
              (item: EventItem /*, index: number*/) => html`
                <mwc-list-item data-event-id="${item.id}" value="${item.id}"
                  ><span>
                    <span> ${this.renderEventTime(item.event as GameEvent, timeFormatter)} </span>
                    <span class="eventType">
                      ${getEventTypeText(item.event.type as GameEventType)}
                    </span>
                    <span class="details"
                      >${this.renderEventDetails(item.event as GameEvent)}</span
                    ></span
                  >
                </mwc-list-item>
              `
            )}
          </mwc-select>
        </li>
      </ul>
      <mwc-button slot="primaryAction" dialogAction="save">Save</mwc-button>
      <mwc-button slot="secondaryAction" dialogAction="close">Cancel</mwc-button>
    </mwc-dialog> `;
  }

  private eventItems: EventItem[] = [];
  private selectedItems: EventItem[] = [];
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
    if (!changedProperties.has('eventData') && !changedProperties.has('eventsSelectedIds')) {
      return;
    }
    const eventDataChanged = this.eventData !== changedProperties.get('eventData');
    const selectedChanged = this.eventsSelectedIds !== changedProperties.get('eventsSelectedIds');
    if (!eventDataChanged && !selectedChanged) {
      return;
    }

    if (eventDataChanged) {
      const events = this.eventData ? EventCollection.create(this.eventData) : undefined;
      this.eventItems = [];
      this.selectedItems = [];
      this.periods = undefined;

      if (!events?.size) {
        return;
      }
      this.periods = [];
      const selectedIds = this.eventsSelectedIds ?? [];
      for (const event of events) {
        // Ignore sub out events, as the sub in event will show all the detail.
        if (event.type === GameEventType.SubOut) {
          continue;
        }
        // Map the event into the UI model.
        const item: EventItem = {
          id: event.id!,
          selected: selectedIds.includes(event.id!),
          event,
        };
        this.eventItems.push(item);
        if (item.selected) {
          this.selectedItems.push(item);
        }

        // Populate the list of periods, from any period start events.
        if (event.type !== GameEventType.PeriodStart) {
          continue;
        }
        const periodStart = event as PeriodStartEvent;
        this.periods.push({
          periodNumber: periodStart.data.clock.currentPeriod,
          startTime: periodStart.data.clock.startTime,
        });
      }
      // Ensure events are most recent first (reverse chronological order).
      this.eventItems.sort((a, b) => b.event.timestamp! - a.event.timestamp!);
      // Ensure periods are sorted in ascending order of start time.
      this.periods.sort((a, b) => a.startTime - b.startTime);
      return;
    }
    // Only the selected events have changed. The event items will already be populated,
    // although the array may be empty.
    this.selectedItems = [];
    if (!this.eventsSelectedIds?.length) {
      return;
    }
    let selectedCount = 0;
    const expectedCount = this.eventsSelectedIds.length;
    for (const item of this.eventItems) {
      if (!item.selected) {
        continue;
      }
      this.selectedItems.push(item);
      selectedCount += 1;
      if (selectedCount >= expectedCount) {
        // Found all the selected items.
        break;
      }
    }
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
      return;
    }
    const useExistingTime = this.editTimeOption === EditTimeOptions.Existing;
    let existingEventId: string | undefined;
    let customTime: number | undefined;

    if (useExistingTime) {
      const existingField = this.shadowRoot!.querySelector('#existing-time-field') as Select;
      existingEventId = existingField.selected?.value;
    } else {
      const customField = this.shadowRoot!.querySelector(
        '#custom-time-field > input'
      ) as HTMLInputElement;
      // The field only provides the time, not the date. Copy the date from
      // one of the selected events.
      // NOTE: This is ignoring the edge case of a game that spans midnight.
      const enteredTime = customField.valueAsDate!;
      const gameDate = new Date(this.selectedItems[0].event.timestamp!);
      customTime = new Date(
        gameDate.getFullYear(),
        gameDate.getMonth(),
        gameDate.getDate(),
        enteredTime.getHours(),
        enteredTime.getMinutes(),
        enteredTime.getSeconds()
      ).getTime();
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
    this.dispatchEvent(
      new EventsUpdatedEvent({
        updatedEventIds: this.selectedItems.map((item) => item.id),
        useExistingTime,
        existingEventId,
        customTime,
      })
    );
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

export interface EventsUpdatedDetail {
  updatedEventIds: string[];
  useExistingTime: boolean;
  existingEventId?: string;
  customTime?: number;
}

const EVENTS_UPDATED_EVENT_NAME = 'events-updated';
export class EventsUpdatedEvent extends CustomEvent<EventsUpdatedDetail> {
  static eventName = EVENTS_UPDATED_EVENT_NAME;

  constructor(detail: EventsUpdatedDetail) {
    super(EventsUpdatedEvent.eventName, {
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
    [EVENTS_UPDATED_EVENT_NAME]: EventsUpdatedEvent;
  }
}
