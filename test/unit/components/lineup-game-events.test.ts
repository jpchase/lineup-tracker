/** @format */

import { PlayerResolver } from '@app/components/core/player-resolver.js';
import '@app/components/lineup-game-events.js';
import {
  EventSelectedEvent,
  EventsUpdatedEvent,
  LineupGameEvents,
} from '@app/components/lineup-game-events.js';
import { Duration, TimeFormatter, pad0 } from '@app/models/clock';
import { EventBase, EventCollection } from '@app/models/events.js';
import { formatPosition } from '@app/models/formation.js';
import {
  GameEvent,
  GameEventCollection,
  GameEventGroup,
  GameEventType,
  LiveGame,
  PeriodStartEvent,
  SetupEvent,
  getPlayer,
} from '@app/models/live.js';
import { Dialog } from '@material/mwc-dialog';
import { IconButton } from '@material/mwc-icon-button';
import { Radio } from '@material/mwc-radio';
import { Select } from '@material/mwc-select';
import { aTimeout, expect, fixture, html, nextFrame, oneEvent } from '@open-wc/testing';
import sinon from 'sinon';
import { addElementAssertions } from '../helpers/element-assertions.js';
import { buildPlayerResolverParentNode } from '../helpers/mock-player-resolver.js';
import {
  incrementingCallbackForTimeProvider,
  mockTimeProvider,
  mockTimeProviderWithCallback,
} from '../helpers/test-clock-data.js';
import {
  buildGameEvents,
  buildGameSetupEvent,
  buildPeriodEndEvent,
  buildPeriodStartEvent,
  buildSubEvents,
  buildSwapEvent,
} from '../helpers/test-event-data.js';
import * as testlive from '../helpers/test-live-game-data.js';

describe('lineup-game-events tests', () => {
  let el: LineupGameEvents;
  let game: LiveGame;
  let mockPlayerResolver: PlayerResolver;
  const timeFormatter = new TimeFormatter();
  const startTime = new Date(2016, 5, 1, 14, 0, 0).getTime();
  const periodEndTime = new Date(2016, 5, 1, 14, 46, 25).getTime();

  before(async () => {
    addElementAssertions();
  });

  beforeEach(async () => {
    // Wire up a node that will handle context requests for a PlayerResolver.
    mockPlayerResolver = {
      getPlayer: (playerId) => {
        return getPlayer(game, playerId);
      },
    };
    const parentNode = buildPlayerResolverParentNode(mockPlayerResolver);

    el = await fixture(html`<lineup-game-events></lineup-game-events>`, { parentNode });
  });

  afterEach(async () => {
    sinon.restore();
  });

  function getEventItems() {
    const items = el.shadowRoot!.querySelectorAll<HTMLTableRowElement>('#events-list tr');
    return items;
  }

  function getEventItemHeader() {
    const headerElement = el.shadowRoot!.querySelector<HTMLTableRowElement>('#events-header tr');
    expect(headerElement, 'events header').to.exist;
    return headerElement!;
  }

  function getSelectionCancelButton(headerElement: HTMLElement) {
    const button = headerElement.querySelector('#cancel-selection-button');
    expect(button, 'selection cancel button').to.exist;
    return button as IconButton;
  }

  function getSelectionCountElement(headerElement: HTMLElement) {
    const element = headerElement.querySelector('#selection-count');
    expect(element, 'selection count element').to.exist;
    return element as HTMLElement;
  }

  function getSelectionEditButton(headerElement: HTMLElement) {
    const button = headerElement.querySelector('#edit-selection-button');
    expect(button, 'selection edit button').to.exist;
    return button as IconButton;
  }

  function getEditDialog() {
    const element = el.shadowRoot!.querySelector('#edit-dialog');
    expect(element, 'edit dialog').to.exist;
    return element as Dialog;
  }

  function getEditSaveButton(editDialog: Dialog) {
    const element = editDialog.querySelector('mwc-button[dialogAction="save"]');
    expect(element, 'save button').to.exist;
    return element as HTMLElement;
  }

  function getEditCancelButton(editDialog: Dialog) {
    const element = editDialog.querySelector('mwc-button[dialogAction="close"]');
    expect(element, 'cancel button').to.exist;
    return element as HTMLElement;
  }

  function getEditCustomTimeOption(editDialog: Dialog) {
    const element = editDialog.querySelector('#time-custom-radio');
    expect(element, 'custom time option').to.exist;
    return element as Radio;
  }

  function getEditExistingTimeOption(editDialog: Dialog) {
    const element = editDialog.querySelector('#time-existing-radio');
    expect(element, 'existing time option').to.exist;
    return element as Radio;
  }

  function getEditCustomTimeField(editDialog: Dialog) {
    const element = editDialog.querySelector('#custom-time-field');
    expect(element, 'custom time field').to.exist;
    return element as HTMLInputElement;
  }

  function getEditExistingTimeField(editDialog: Dialog) {
    const element = editDialog.querySelector('#existing-time-field');
    expect(element, 'existing time field').to.exist;
    return element as Select;
  }

  function expectEventAbsoluteTime(timeElement: HTMLElement, expectedTime: number) {
    const absoluteElement = timeElement.querySelector('.absolute');
    expect(absoluteElement, 'Missing absolute time element').to.exist;
    expect(absoluteElement!.textContent?.trim(), 'Event absolute time').to.equal(
      timeFormatter.format(new Date(expectedTime)),
    );
  }

  function expectEventPeriodRelativeTime(timeElement: HTMLElement, expectedElapsedSeconds: number) {
    const relativeElement = timeElement.querySelector('.relative');
    expect(relativeElement, 'Missing relative time element').to.exist;
    expect(relativeElement!.textContent?.trim(), 'Period relative time').to.equal(
      `[${Duration.format(Duration.create(expectedElapsedSeconds))}]`,
    );
  }

  describe('rendering', () => {
    let events: GameEventCollection;

    beforeEach(() => {
      game = testlive.getLiveGameWithPlayers();

      // Create a collection of representative events, which occur 10 seconds apart.
      const timeProvider = mockTimeProviderWithCallback(
        incrementingCallbackForTimeProvider(startTime, /* incrementSeconds= */ 10),
      );
      events = buildGameEvents(game, timeProvider);
    });

    it('shows list of events with common details', async () => {
      el.eventData = events.toJSON();
      await el.updateComplete;

      // Sort in descending date order, and remove events that are not displayed.
      const sortedEvents = events.eventsForTesting
        .filter((event) => event.type !== GameEventType.SubOut)
        .sort((a, b) => b.timestamp! - a.timestamp!);

      const items = getEventItems();
      expect(items.length).to.equal(sortedEvents.length, 'Rendered event count');

      let index = 0;
      for (const event of sortedEvents) {
        const item = items[index]!;
        index += 1;

        expect(item.dataset.eventId).to.equal(event.id, 'Item id should match player id');

        const timeElement = item.cells[0];
        expect(timeElement, 'Missing event time element').to.exist;
        expectEventAbsoluteTime(timeElement, event.timestamp!);

        const typeElement = item.cells[1];
        expect(typeElement, 'Missing type element').to.exist;
        // Only check that the type is shown, as the text varies by event type.
        expect(typeElement!.textContent, 'Event type').not.to.be.empty;

        const detailsElement = item.cells[2];
        expect(detailsElement, 'Missing details element').to.exist;
        // Only checks that details are provided, as they vary based on event type.
        expect(detailsElement!.textContent, 'Details').not.to.be.empty;
      }
      await expect(el).shadowDom.to.equalSnapshot();
      await expect(el).to.be.accessible();
    });

    it('shows list with selected events highlighted', async () => {
      // Randomly select 3 events.
      const selectedIds = [];
      let index = 0;
      for (const event of events) {
        switch (index) {
          case 1:
          case 2:
          case 4:
            selectedIds.push(event.id!);
            break;
          default:
          // do nothing
        }
        index += 1;
      }

      el.eventsSelectedIds = selectedIds;
      el.eventData = events.toJSON();
      await el.updateComplete;

      const items = getEventItems();
      for (const item of Array.from(items)) {
        const eventId = item.dataset.eventId!;
        const expectSelected = selectedIds.includes(eventId);

        if (expectSelected) {
          expect(item, `event ${eventId}`).to.have.attribute('selected');
        } else {
          expect(item, `event ${eventId}`).to.not.have.attribute('selected');
        }
      }
      await expect(el).shadowDom.to.equalSnapshot({ ignoreTags: ['mwc-dialog'] });
      await expect(el).to.be.accessible();
    });
  }); // describe('rendering')

  describe('event types', () => {
    let events: GameEventCollection;

    beforeEach(() => {
      game = testlive.getLiveGameWithStarters();

      const timeProvider = mockTimeProvider(startTime);
      events = EventCollection.create(
        {
          id: game.id,
        },
        timeProvider,
      );
    });

    async function setupEvent(
      event: GameEvent,
      periodStart?: { startTime: number; currentPeriod?: number },
    ) {
      const addedEvent = events.addEvent<GameEvent>(event);

      // Add start event, so that relative times can be computed.
      if (periodStart) {
        events.addEvent<PeriodStartEvent>(
          buildPeriodStartEvent(periodStart.startTime, periodStart.currentPeriod),
        );
      }

      el.eventData = events.toJSON();
      await el.updateComplete;

      return addedEvent as GameEvent;
    }

    async function setupEventGroup(
      group: GameEventGroup,
      periodStart?: { startTime: number; currentPeriod?: number },
    ) {
      const addedEvents = events.addEventGroup<GameEvent>(group.groupedEvents);

      // Add start event, so that relative times can be computed.
      if (periodStart) {
        events.addEvent<PeriodStartEvent>(
          buildPeriodStartEvent(periodStart.startTime, periodStart.currentPeriod),
        );
      }

      el.eventData = events.toJSON();
      await el.updateComplete;

      return addedEvents[0] as GameEvent;
    }

    function getEventElements(event: GameEvent) {
      const items = getEventItems();

      let matchedItem: HTMLTableRowElement | undefined;
      for (const current of Array.from(items)) {
        if (current.dataset.eventId === event.id) {
          matchedItem = current;
          break;
        }
      }
      expect(matchedItem, `Item for event ${event.id} not found`).to.exist;

      const item = matchedItem!;

      const timeElement = item.cells[0]!;
      expect(timeElement, 'Missing event time element').to.exist;

      const typeElement = item.cells[1]!;
      expect(typeElement, 'Missing type element').to.exist;

      const detailsElement = item.cells[2]!;
      expect(detailsElement, 'Missing details element').to.exist;

      return { typeElement, detailsElement, timeElement };
    }

    function expectEventType(typeElement: HTMLElement, expectedText: string) {
      expect(typeElement.textContent?.trim(), 'Event type').to.equal(expectedText);
    }

    it(`renders ${GameEventType.Setup} event details`, async () => {
      const event = await setupEvent(buildGameSetupEvent(startTime, game.players!));

      const { typeElement, detailsElement } = getEventElements(event);

      expectEventType(typeElement, 'Setup completed');

      // TODO: Assert formatted details
      const starterDetails = JSON.stringify((event as SetupEvent).data.starters);
      expect(detailsElement.textContent).to.equal(
        `{"clock":{"totalPeriods":2,"periodLength":45},"starters":${starterDetails}}`,
      );
    });

    it(`renders ${GameEventType.PeriodStart} event details`, async () => {
      const event = await setupEvent(buildPeriodStartEvent(startTime), { startTime });

      const { typeElement, detailsElement, timeElement } = getEventElements(event);

      expectEventAbsoluteTime(timeElement, startTime);
      expectEventPeriodRelativeTime(timeElement, /* elapsedSeconds= */ 0);

      expectEventType(typeElement, 'Period started');

      expect(detailsElement.textContent).to.equal('Start of period 1');
    });

    it(`renders ${GameEventType.PeriodEnd} event details`, async () => {
      const event = await setupEvent(buildPeriodEndEvent(periodEndTime), { startTime });

      const { typeElement, detailsElement, timeElement } = getEventElements(event);

      expectEventAbsoluteTime(timeElement, periodEndTime);
      expectEventPeriodRelativeTime(
        timeElement,
        /* elapsedSeconds= */ (periodEndTime - startTime) / 1000,
      );

      expectEventType(typeElement, 'Period completed');

      expect(detailsElement.textContent).to.equal('End of period 1');
    });

    it(`renders ${GameEventType.SubIn} event details`, async () => {
      const inPlayer = getPlayer(game, 'P11');
      const outPlayer = getPlayer(game, 'P4');
      const sub: testlive.SubData = {
        nextId: inPlayer?.id!,
        replacedId: outPlayer?.id!,
        finalPosition: { ...outPlayer?.currentPosition! },
      };

      // The sub happens 11 minutes, 17 seconds after the period starts.
      const elapsedSecondsForSub = 11 * 60 + 17;
      const event = await setupEventGroup(
        buildSubEvents(startTime + elapsedSecondsForSub * 1000, sub),
        { startTime },
      );

      // The sub out event is not displayed, so there should only be one rendered event.
      const { typeElement, detailsElement, timeElement } = getEventElements(event);

      expectEventPeriodRelativeTime(timeElement, elapsedSecondsForSub);

      expectEventType(typeElement, 'Substitution');

      const positionText = formatPosition(sub.finalPosition!);
      expect(positionText, 'formatted position').to.not.be.empty;

      const expectedDetailText = `${inPlayer?.name} replaced ${outPlayer?.name}, at ${positionText}`;
      expect(detailsElement.textContent).to.equal(expectedDetailText);
    });

    it(`renders ${GameEventType.Swap} event details`, async () => {
      const inPlayer = getPlayer(game, 'P11');
      const positionPlayer = getPlayer(game, 'P4');
      const swap: testlive.SubData = {
        nextId: inPlayer?.id!,
        initialPosition: { ...inPlayer?.currentPosition! },
        finalPosition: { ...positionPlayer?.currentPosition! },
      };

      // The swap happens 50 seconds after the period starts.
      const elapsedSecondsForSwap = 50;
      const event = await setupEvent(
        buildSwapEvent(startTime + elapsedSecondsForSwap * 1000, swap),
        { startTime },
      );

      // The sub out event is not displayed, so there should only be one rendered event.
      const { typeElement, detailsElement, timeElement } = getEventElements(event);

      expectEventPeriodRelativeTime(timeElement, elapsedSecondsForSwap);

      expectEventType(typeElement, 'Position changed');

      const positionText = formatPosition(swap.finalPosition!);
      expect(positionText, 'formatted position').to.not.be.empty;

      const oldPositionText = formatPosition(swap.initialPosition!);
      expect(oldPositionText, 'formatted position').to.not.be.empty;

      const expectedDetailText = `${inPlayer?.name} moved to ${positionText} (from ${oldPositionText})`;
      expect(detailsElement.textContent?.replace(/\s{2,}/g, ' ')).to.equal(expectedDetailText);
    });
  }); // describe('event types')

  describe('event selection', () => {
    let events: GameEventCollection;

    beforeEach(async () => {
      game = testlive.getLiveGameWithPlayers();

      const timeProvider = mockTimeProvider(startTime);

      events = buildGameEvents(game, timeProvider);

      el.eventData = events.toJSON();
      await el.updateComplete;
    });

    it('fires selected event when list item is clicked', async () => {
      const items = getEventItems();
      const item = items[0];
      const eventId = item.dataset.eventId!;

      // Trigger the selection.
      setTimeout(() => item.click());

      const { detail } = (await oneEvent(el, EventSelectedEvent.eventName)) as EventSelectedEvent;

      expect(detail.eventId).to.equal(eventId);
      expect(detail.selected, 'Event item should now be selected').to.be.true;
    });

    it('fires selected event when list item is clicked with other items already selected', async () => {
      const items = getEventItems();
      const item = items[0];
      const eventId = item.dataset.eventId!;

      // Make another item already selected.
      const alreadySelectedItem = items[1];
      el.eventsSelectedIds = [alreadySelectedItem.dataset.eventId!];
      await el.updateComplete;

      expect(alreadySelectedItem, 'already selected item').to.have.attribute('selected');

      // Trigger the selection.
      setTimeout(() => item.click());

      const { detail } = (await oneEvent(el, EventSelectedEvent.eventName)) as EventSelectedEvent;

      expect(detail.eventId).to.equal(eventId);
      expect(detail.selected, 'Event item should now be selected').to.be.true;

      expect(alreadySelectedItem, 'should still be selected').to.have.attribute('selected');
    });

    it('fires de-selected event when selected list item is clicked', async () => {
      const items = getEventItems();
      const item = items[0];
      const eventId = item.dataset.eventId!;

      // Make the item selected.
      el.eventsSelectedIds = [eventId];
      await el.updateComplete;

      expect(item, 'event item').to.have.attribute('selected');

      // Trigger the selection.
      setTimeout(() => item.click());

      const { detail } = (await oneEvent(el, EventSelectedEvent.eventName)) as EventSelectedEvent;

      expect(detail.eventId).to.equal(eventId);
      expect(detail.selected, 'Event item should no longer be selected').to.be.false;
    });

    it('fires de-selected event when selected list item is clicked leaving other items selected', async () => {
      const items = getEventItems();
      const item = items[0];
      const eventId = item.dataset.eventId!;

      // Make the item and another item selected.
      const alreadySelectedItem = items[1];
      el.eventsSelectedIds = [eventId, alreadySelectedItem.dataset.eventId!];
      await el.updateComplete;

      expect(item, 'event item').to.have.attribute('selected');
      expect(alreadySelectedItem, 'already selected item').to.have.attribute('selected');

      // Trigger the selection.
      setTimeout(() => item.click());

      const { detail } = (await oneEvent(el, EventSelectedEvent.eventName)) as EventSelectedEvent;

      expect(detail.eventId).to.equal(eventId);
      expect(detail.selected, 'Event item should no longer be selected').to.be.false;

      expect(alreadySelectedItem, 'should still be selected').to.have.attribute('selected');
    });

    it('shows selection toolbar when single event selected', async () => {
      // Make one item selected.
      const items = getEventItems();
      el.eventsSelectedIds = [items[0].dataset.eventId!];
      await el.updateComplete;

      const headerElement = getEventItemHeader();
      expect(headerElement.cells, 'header should have a single cell').to.have.length(1);

      const cancelButton = getSelectionCancelButton(headerElement.cells[0]);
      expect(cancelButton.disabled, 'cancel button should exist and be enabled').to.be.false;

      const countElement = getSelectionCountElement(headerElement.cells[0]);
      expect(countElement.textContent?.trim()).to.equal('1 event');

      const editButton = getSelectionEditButton(headerElement.cells[0]);
      expect(editButton.disabled, 'edit button should exist and be enabled').to.be.false;
    });

    it('shows selection toolbar when multiple events selected', async () => {
      // Make multiple items selected.
      const items = getEventItems();
      const item1 = items[0];
      const item2 = items[1];
      el.eventsSelectedIds = [item1.dataset.eventId!, item2.dataset.eventId!];
      await el.updateComplete;

      const headerElement = getEventItemHeader();

      const countElement = getSelectionCountElement(headerElement.cells[0]);
      expect(countElement.textContent?.trim()).to.equal('2 events');

      const editButton = getSelectionEditButton(headerElement.cells[0]);
      expect(editButton.disabled, 'edit button should exist and be enabled').to.be.false;
    });

    it('shows dialog when edit button clicked', async () => {
      // Make one item selected.
      const items = getEventItems();
      el.eventsSelectedIds = [items[0].dataset.eventId!];
      await el.updateComplete;

      const headerElement = getEventItemHeader();
      const editButton = getSelectionEditButton(headerElement.cells[0]);

      setTimeout(() => editButton.click());
      await oneEvent(editButton, 'click');

      const editDialog = getEditDialog();
      expect(editDialog, 'after edit clicked').to.be.open;

      await expect(editDialog).to.equalSnapshot();
    });

    it('shows dialog with multiple events when edit button clicked', async () => {
      // Make multiple items selected.
      const items = getEventItems();
      const item1 = items[0];
      const item2 = items[1];
      el.eventsSelectedIds = [item1.dataset.eventId!, item2.dataset.eventId!];
      await el.updateComplete;

      const headerElement = getEventItemHeader();
      const editButton = getSelectionEditButton(headerElement.cells[0]);

      setTimeout(() => editButton.click());
      await oneEvent(editButton, 'click');

      const editDialog = getEditDialog();
      expect(editDialog, 'after edit clicked').to.be.open;

      await expect(editDialog).to.equalSnapshot();
    });
  }); // describe('event selection')

  describe('event editing', () => {
    let events: GameEventCollection;
    let selectedEvent: EventBase;
    let editDialog: Dialog;
    let editButton: IconButton;

    beforeEach(async () => {
      game = testlive.getLiveGameWithPlayers();

      const timeProvider = mockTimeProvider(startTime);

      events = buildGameEvents(game, timeProvider);
      selectedEvent = events.eventsForTesting[0];

      el.gameStartDate = startTime;
      el.eventData = events.toJSON();
      el.eventsSelectedIds = [selectedEvent.id!];
      await el.updateComplete;

      const headerElement = getEventItemHeader();
      editButton = getSelectionEditButton(headerElement.cells[0]);

      setTimeout(() => editButton.click());
      await oneEvent(editButton, 'click');

      editDialog = getEditDialog();
      expect(editDialog, 'after edit clicked').to.be.open;
    });

    function formatTimeFieldValue(time: Date) {
      //  - The time field always uses UTC, and in 24 hour format.
      //  - The input to the field is adjusted by the UTC offset, so it displays local time.
      //  - e.g. A time of 2:00pm EST (7:00pm UTC) is adjusted to 2:00pm UTC, so the
      //    resulting value in the field is "14:00:00";
      const timeInputValue = `${pad0(time.getHours(), 2)}:${pad0(time.getMinutes(), 2)}:${pad0(
        time.getSeconds(),
        2,
      )}`;
      return timeInputValue;
    }

    it('defaults to custom time option', async () => {
      // Check that the "custom time" option is the default.
      const useCustom = getEditCustomTimeOption(editDialog);
      expect(useCustom.checked, 'Custom option should be checked by default').to.be.true;

      // Check that the time field defaults to first selected event.
      const selectedEventTime = new Date(selectedEvent.timestamp!);
      const expectedTimeString = formatTimeFieldValue(selectedEventTime);

      const customTimeField = getEditCustomTimeField(editDialog);
      expect(customTimeField.disabled, 'Custom time field should be enabled').to.be.false;

      expect(
        customTimeField.value,
        'custom time should default to time of selected event displayed as local time zone',
      ).to.deep.equal(expectedTimeString);

      // The existing time fields are not initially set/available.
      const useExisting = getEditExistingTimeOption(editDialog);
      expect(useExisting.checked, 'Existing option should not be checked initially').to.be.false;

      const existingTimeField = getEditExistingTimeField(editDialog);
      expect(existingTimeField.disabled, 'Existing field should be disabled initially').to.be.true;
    });

    it('resets fields in dialog when shown again', async () => {
      const useCustom = getEditCustomTimeOption(editDialog);
      const customTimeField = getEditCustomTimeField(editDialog);
      const useExisting = getEditExistingTimeOption(editDialog);
      const existingTimeField = getEditExistingTimeField(editDialog);

      // Set the custom time field to a different value.
      const differentCustomTime = new Date(selectedEvent.timestamp! + 20000);
      customTimeField.value = formatTimeFieldValue(differentCustomTime);

      // Set the existing option.
      setTimeout(() => useExisting.click());
      await oneEvent(useExisting, 'click');
      await el.updateComplete;

      expect(useExisting.checked, 'Existing option should now be checked').to.be.true;
      expect(existingTimeField.disabled, 'Existing time field should now be enabled').to.be.false;

      expect(useCustom.checked, 'Custom option should now be unchecked').to.be.false;
      expect(customTimeField.disabled, 'Custom time field should now be disabled').to.be.true;

      const cancelButton = getEditCancelButton(editDialog);
      setTimeout(() => cancelButton!.click());
      await oneEvent(cancelButton!, 'click');

      // Show the dialog again.
      setTimeout(() => editButton.click());
      await oneEvent(editButton, 'click');

      // The custom time fields are reset back to checked/enabled.
      expect(useCustom.checked, 'Custom option should be checked again').to.be.true;
      expect(customTimeField.disabled, 'Custom time field should enabled again').to.be.false;

      // The custom time field value is reset to first selected event.
      const expectedTimeString = formatTimeFieldValue(new Date(selectedEvent.timestamp!));
      expect(
        customTimeField.value,
        'custom time should be reset to time of selected event',
      ).to.deep.equal(expectedTimeString);

      // The existing time fields are reset back to unchecked/disabled.
      expect(useExisting.checked, 'Existing option should not be checked initially').to.be.false;
      expect(existingTimeField.disabled, 'Existing field should be disabled initially').to.be.true;
    });

    it('re-enables custom time field after changing back from existing option', async () => {
      const useCustom = getEditCustomTimeOption(editDialog);
      const customTimeField = getEditCustomTimeField(editDialog);
      const useExisting = getEditExistingTimeOption(editDialog);
      const existingTimeField = getEditExistingTimeField(editDialog);

      // Set the existing option.
      setTimeout(() => useExisting.click());
      await oneEvent(useExisting, 'click');
      await el.updateComplete;

      expect(useExisting.checked, 'Existing option should now be checked').to.be.true;
      expect(existingTimeField.disabled, 'Existing time field should now be enabled').to.be.false;

      expect(useCustom.checked, 'Custom option should now be unchecked').to.be.false;
      expect(customTimeField.disabled, 'Custom time field should now be disabled').to.be.true;

      // Set back to the custom option.
      setTimeout(() => useCustom.click());
      await oneEvent(useCustom, 'click');
      await el.updateComplete;

      expect(useExisting.checked, 'Existing option should now be unchecked').to.be.false;
      expect(existingTimeField.disabled, 'Existing time field should be disabled again').to.be.true;

      expect(useCustom.checked, 'Custom option should now be checked').to.be.true;
      expect(customTimeField.disabled, 'Custom time field should now be enabled again').to.be.false;
    });

    it.skip('validates fields when edit dialog saved', () => {
      expect.fail('not implemented');
    });

    it.skip('prevents saving when custom time is outside min and max values', () => {
      expect.fail('not implemented');
    });

    it('does not fire update event when dialog cancelled', async () => {
      // Listen for update event
      let eventFired = false;
      const handler = function () {
        eventFired = true;
        el.removeEventListener(EventsUpdatedEvent.eventName, handler);
      };
      el.addEventListener(EventsUpdatedEvent.eventName, handler);

      const cancelButton = getEditCancelButton(editDialog);
      setTimeout(() => cancelButton!.click());
      await oneEvent(cancelButton!, 'click');
      await nextFrame();
      await aTimeout(100);

      expect(editDialog, 'after cancel click').not.to.be.open;
      expect(eventFired, 'Update event should not be fired').to.be.false;
    });

    it('fires update event when dialog saved for custom time', async () => {
      const customTimeField = getEditCustomTimeField(editDialog);

      // Set time to 10 seconds earlier.
      const expectedCustomTime = new Date(selectedEvent.timestamp! - 10000);
      customTimeField.value = formatTimeFieldValue(expectedCustomTime);

      const saveButton = getEditSaveButton(editDialog);
      setTimeout(() => saveButton.click());

      const { detail } = (await oneEvent(el, EventsUpdatedEvent.eventName)) as EventsUpdatedEvent;
      expect(detail, 'Event detail should be set for custom time').to.deep.equal({
        updatedEventIds: [selectedEvent.id!],
        useExistingTime: false,
        existingEventId: undefined,
        customTime: expectedCustomTime.getTime(),
      });
      const expectedTimeString = timeFormatter.format(expectedCustomTime);
      const actualTimeString = timeFormatter.format(new Date(detail.customTime!));
      expect(actualTimeString, 'Custom time in event detail').to.equal(expectedTimeString);
    });

    it('fires update event with selected event id when dialog saved for existing time', async () => {
      const useExisting = getEditExistingTimeOption(editDialog);
      const existingTimeField = getEditExistingTimeField(editDialog);

      // Set the existing option.
      setTimeout(() => useExisting.click());
      await oneEvent(useExisting, 'click');
      await el.updateComplete;

      // Select a different event to provide the time.
      const existingEvent = events.eventsForTesting[1];
      for (const item of existingTimeField.items) {
        if (item.dataset.eventId === existingEvent.id) {
          item.selected = true;
          break;
        }
      }

      const saveButton = getEditSaveButton(editDialog);
      setTimeout(() => saveButton.click());

      const { detail } = (await oneEvent(el, EventsUpdatedEvent.eventName)) as EventsUpdatedEvent;
      expect(detail, 'Event detail should be set for existing time').to.deep.equal({
        updatedEventIds: [selectedEvent.id!],
        useExistingTime: true,
        existingEventId: existingEvent.id!,
        customTime: undefined,
      });
    });
  }); // describe('event editing')

  describe('pagination', () => {
    it.skip('shows only the most recent events', async () => {
      expect.fail('not implemented');
    });

    it.skip('new events replace older events when only showing the most recent', async () => {
      expect.fail('not implemented');
    });

    it.skip('shows more events when explicitly requested', async () => {
      expect.fail('not implemented');
    });

    it.skip('old events remain when show all preference is enabled', async () => {
      expect.fail('not implemented');
    });
  }); // describe('pagination')
});
