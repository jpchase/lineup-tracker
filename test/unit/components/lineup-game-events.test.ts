/** @format */

import '@app/components/lineup-game-events.js';
import { EventSelectedEvent, LineupGameEvents } from '@app/components/lineup-game-events.js';
import { PlayerResolver } from '@app/components/player-resolver.js';
import { Duration, TimeFormatter } from '@app/models/clock';
import { EventCollection } from '@app/models/events.js';
import { formatPosition } from '@app/models/formation.js';
import {
  GameEvent,
  GameEventGroup,
  GameEventType,
  LiveGame,
  PeriodStartEvent,
  getPlayer,
} from '@app/models/live.js';
import { IconButton } from '@material/mwc-icon-button';
import { expect, fixture, html, oneEvent } from '@open-wc/testing';
import sinon from 'sinon';
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
  let fakeClock: sinon.SinonFakeTimers;
  let mockPlayerResolver: PlayerResolver;
  const timeFormatter = new TimeFormatter();
  const startTime = new Date(2016, 0, 1, 14, 0, 0).getTime();
  const periodEndTime = new Date(2016, 0, 1, 14, 46, 25).getTime();

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
    if (fakeClock) {
      fakeClock.restore();
    }
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

  function expectEventAbsoluteTime(timeElement: HTMLElement, expectedTime: number) {
    const absoluteElement = timeElement.querySelector('.absolute');
    expect(absoluteElement, 'Missing absolute time element').to.exist;
    expect(absoluteElement!.textContent?.trim(), 'Event absolute time').to.equal(
      timeFormatter.format(new Date(expectedTime))
    );
  }

  function expectEventPeriodRelativeTime(timeElement: HTMLElement, expectedElapsedSeconds: number) {
    const relativeElement = timeElement.querySelector('.relative');
    expect(relativeElement, 'Missing relative time element').to.exist;
    expect(relativeElement!.textContent?.trim(), 'Period relative time').to.equal(
      `[${Duration.format(Duration.create(expectedElapsedSeconds))}]`
    );
  }

  describe('rendering', () => {
    let events: EventCollection;

    beforeEach(() => {
      game = testlive.getLiveGameWithPlayers();

      // Create a collection of representative events, which occur 10 seconds apart.
      const timeProvider = mockTimeProviderWithCallback(
        incrementingCallbackForTimeProvider(startTime, /* incrementSeconds= */ 10)
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
      await expect(el).shadowDom.to.equalSnapshot();
      await expect(el).to.be.accessible();
    });
  }); // describe('rendering')

  describe('event types', () => {
    let events: EventCollection;

    beforeEach(() => {
      game = testlive.getLiveGameWithPlayers();

      const timeProvider = mockTimeProvider(startTime);
      events = EventCollection.create(
        {
          id: game.id,
        },
        timeProvider
      );
    });

    async function setupEvent(
      event: GameEvent,
      periodStart?: { startTime: number; currentPeriod?: number }
    ) {
      const addedEvent = events.addEvent<GameEvent>(event);

      // Add start event, so that relative times can be computed.
      if (periodStart) {
        events.addEvent<PeriodStartEvent>(
          buildPeriodStartEvent(periodStart.startTime, periodStart.currentPeriod)
        );
      }

      el.eventData = events.toJSON();
      await el.updateComplete;

      return addedEvent as GameEvent;
    }

    async function setupEventGroup(
      group: GameEventGroup,
      periodStart?: { startTime: number; currentPeriod?: number }
    ) {
      const addedEvents = events.addEventGroup<GameEvent>(group.groupedEvents);

      // Add start event, so that relative times can be computed.
      if (periodStart) {
        events.addEvent<PeriodStartEvent>(
          buildPeriodStartEvent(periodStart.startTime, periodStart.currentPeriod)
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
      const event = await setupEvent(buildGameSetupEvent(startTime));

      const { typeElement, detailsElement } = getEventElements(event);

      expectEventType(typeElement, 'Setup completed');

      // TODO: Assert formatted details
      expect(detailsElement.textContent).to.equal('{"clock":{"totalPeriods":2,"periodLength":45}}');
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
        /* elapsedSeconds= */ (periodEndTime - startTime) / 1000
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
        { startTime }
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
        { startTime }
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

  describe('event editing', () => {
    let events: EventCollection;

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

    it.skip('shows dialog when edit button clicked', async () => {
      expect.fail('not implemented');
    });

    it.skip('shows dialog with multiple events when bulk edit button clicked', async () => {
      expect.fail('not implemented');
    });
  }); // describe('event editing')

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
});
