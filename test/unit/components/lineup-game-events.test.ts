/** @format */

import '@app/components/lineup-game-events.js';
import { LineupGameEvents } from '@app/components/lineup-game-events.js';
import { CurrentTimeProvider, TimeFormatter } from '@app/models/clock';
import { EventCollection } from '@app/models/events.js';
import { GameEvent } from '@app/models/live.js';
import { expect, fixture, html } from '@open-wc/testing';
import sinon from 'sinon';
import { mockTimeProviderWithCallback } from '../helpers/test-clock-data.js';
import { buildGameSetupEvent, buildPeriodStartEvent } from '../helpers/test-event-data.js';
import * as testlive from '../helpers/test-live-game-data.js';

function buildGameEvents(gameId: string, timeProvider: CurrentTimeProvider) {
  //}, players: LivePlayer[]) {
  const events = EventCollection.create(
    {
      id: gameId,
    },
    timeProvider
  );
  events.addEvent<GameEvent>(buildGameSetupEvent(timeProvider.getCurrentTime()));
  events.addEvent<GameEvent>(buildPeriodStartEvent(timeProvider.getCurrentTime()));
  return events;
}

function mockCallbackForTimeProvider(startTime: number, incrementSeconds: number) {
  let eventTime = startTime;

  return () => {
    const result = eventTime;
    eventTime += incrementSeconds * 1000;
    return result;
  };
}

describe('lineup-game-events tests', () => {
  let el: LineupGameEvents;
  let fakeClock: sinon.SinonFakeTimers;
  const startTime = new Date(2016, 0, 1, 14, 0, 0).getTime();

  beforeEach(async () => {
    el = await fixture(html`<lineup-game-events></lineup-game-events>`);
  });

  afterEach(async () => {
    if (fakeClock) {
      fakeClock.restore();
    }
  });

  function getEventItems() {
    const items = el.shadowRoot!.querySelectorAll('#events-list tr');
    return items;
  }

  it('renders list of events', async () => {
    const game = testlive.getLiveGameWithPlayers();
    const players = game.players!;
    // Create a collection of representative events, which occur 10 seconds apart.
    const timeProvider = mockTimeProviderWithCallback(
      mockCallbackForTimeProvider(startTime, /* incrementSeconds= */ 10)
    );
    const events = buildGameEvents(game.id, timeProvider);

    el.players = players;
    el.eventData = events.toJSON();
    await el.updateComplete;

    const items = getEventItems();
    expect(items.length).to.equal(events.events.length, 'Rendered event count');

    // Sort in descending date order
    const sortedEvents = events.events!.sort((a, b) => b.timestamp! - a.timestamp!);
    let index = 0;
    const timeFormatter = new TimeFormatter();
    for (const event of sortedEvents) {
      const item = (items[index] as HTMLTableRowElement)!;
      index += 1;

      expect(item.dataset.eventId).to.equal(event.id, 'Item id should match player id');

      const timeElement = item.cells[0];
      expect(timeElement, 'Missing event time element').to.exist;
      expect(timeElement!.textContent?.trim(), 'Event time').to.equal(
        timeFormatter.format(new Date(event.timestamp!))
      );

      const typeElement = item.cells[1];
      expect(typeElement, 'Missing type element').to.exist;
      expect(typeElement!.textContent, 'Event type').to.equal(event.type);

      const detailsElement = item.cells[2];
      expect(detailsElement, 'Missing details element').to.exist;
      // Only checks that details are provided, as they vary based on event type.
      // TODO: Implement event-specific tests.
      expect(detailsElement!.textContent, 'Details').not.to.be.empty;
    }
    await expect(el).shadowDom.to.equalSnapshot();
    await expect(el).to.be.accessible();
  });

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
