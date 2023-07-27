/** @format */

import '@app/components/lineup-game-events.js';
import { LineupGameEvents } from '@app/components/lineup-game-events.js';
import { PlayerResolver } from '@app/components/player-resolver.js';
import { CurrentTimeProvider, TimeFormatter } from '@app/models/clock';
import { EventCollection } from '@app/models/events.js';
import { formatPosition } from '@app/models/formation.js';
import {
  GameEvent,
  GameEventGroup,
  GameEventType,
  LiveGame,
  LivePlayer,
  getPlayer,
} from '@app/models/live.js';
import { expect, fixture, html } from '@open-wc/testing';
import sinon from 'sinon';
import { buildPlayerResolverParentNode } from '../helpers/mock-player-resolver.js';
import { mockTimeProvider, mockTimeProviderWithCallback } from '../helpers/test-clock-data.js';
import {
  buildGameSetupEvent,
  buildPeriodStartEvent,
  buildSubEvents,
  buildSwapEvent,
} from '../helpers/test-event-data.js';
import * as testlive from '../helpers/test-live-game-data.js';

function buildGameEvents(game: LiveGame, timeProvider: CurrentTimeProvider) {
  const events = EventCollection.create(
    {
      id: game.id,
    },
    timeProvider
  );
  events.addEvent<GameEvent>(buildGameSetupEvent(timeProvider.getCurrentTime()));
  events.addEvent<GameEvent>(buildPeriodStartEvent(timeProvider.getCurrentTime()));

  const replacedPlayer = getPlayer(game, 'P4');
  const sub1: testlive.SubData = {
    nextId: 'P11',
    replacedId: replacedPlayer?.id,
    finalPosition: { ...replacedPlayer?.currentPosition! },
  };
  events.addEventGroup<GameEvent>(
    buildSubEvents(timeProvider.getCurrentTime(), sub1).groupedEvents
  );
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
  let game: LiveGame;
  let players: LivePlayer[];
  let fakeClock: sinon.SinonFakeTimers;
  let mockPlayerResolver: PlayerResolver;
  const startTime = new Date(2016, 0, 1, 14, 0, 0).getTime();

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
    const items = el.shadowRoot!.querySelectorAll('#events-list tr');
    return items;
  }

  it('renders list of events', async () => {
    game = testlive.getLiveGameWithPlayers();
    players = game.players!;
    // Create a collection of representative events, which occur 10 seconds apart.
    const timeProvider = mockTimeProviderWithCallback(
      mockCallbackForTimeProvider(startTime, /* incrementSeconds= */ 10)
    );
    const events = buildGameEvents(game, timeProvider);

    el.players = players;
    el.eventData = events.toJSON();
    await el.updateComplete;

    // Sort in descending date order, and remove events that are not displayed.
    const sortedEvents = events
      .events!.sort((a, b) => b.timestamp! - a.timestamp!)
      .filter((event) => event.type !== GameEventType.SubOut);

    const items = getEventItems();
    expect(items.length).to.equal(sortedEvents.length, 'Rendered event count');

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

  describe('event types', () => {
    let events: EventCollection;

    beforeEach(() => {
      game = testlive.getLiveGameWithPlayers();
      players = game.players!;

      const timeProvider = mockTimeProvider(startTime);
      events = EventCollection.create(
        {
          id: game.id,
        },
        timeProvider
      );
    });

    async function setupEvent(event: GameEvent) {
      events.addEvent<GameEvent>(event);

      el.players = players;
      el.eventData = events.toJSON();
      await el.updateComplete;

      return events.events[0] as GameEvent;
    }

    async function setupEventGroup(group: GameEventGroup) {
      events.addEventGroup<GameEvent>(group.groupedEvents);

      el.players = players;
      el.eventData = events.toJSON();
      await el.updateComplete;

      return events.events[0] as GameEvent;
    }

    function getEventElements(event: GameEvent) {
      const items = getEventItems();
      expect(items.length, 'Rendered event count').to.equal(1);

      const item = (items[0] as HTMLTableRowElement)!;

      expect(item.dataset.eventId).to.equal(event.id, 'Item id should match player id');

      const typeElement = item.cells[1]!;
      expect(typeElement, 'Missing type element').to.exist;

      const detailsElement = item.cells[2]!;
      expect(detailsElement, 'Missing details element').to.exist;

      return { typeElement, detailsElement };
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
      const event = await setupEvent(buildPeriodStartEvent(startTime));

      const { typeElement, detailsElement } = getEventElements(event);

      expectEventType(typeElement, 'Period started');

      // TODO: Assert formatted details
      expect(detailsElement.textContent).to.equal('Start of period 1');
    });

    it(`renders ${GameEventType.SubIn} event details`, async () => {
      const inPlayer = getPlayer(game, 'P11');
      const outPlayer = getPlayer(game, 'P4');
      const sub: testlive.SubData = {
        nextId: inPlayer?.id!,
        replacedId: outPlayer?.id!,
        finalPosition: { ...outPlayer?.currentPosition! },
      };
      const event = await setupEventGroup(buildSubEvents(startTime, sub));

      // The sub out event is not displayed, so there should only be one rendered event.
      const { typeElement, detailsElement } = getEventElements(event);

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
      const event = await setupEvent(buildSwapEvent(startTime, swap));

      // The sub out event is not displayed, so there should only be one rendered event.
      const { typeElement, detailsElement } = getEventElements(event);

      expectEventType(typeElement, 'Position changed');

      const positionText = formatPosition(swap.finalPosition!);
      expect(positionText, 'formatted position').to.not.be.empty;

      const oldPositionText = formatPosition(swap.initialPosition!);
      expect(oldPositionText, 'formatted position').to.not.be.empty;

      const expectedDetailText = `${inPlayer?.name} moved to ${positionText} (from ${oldPositionText})`;
      expect(detailsElement.textContent?.replace(/\s{2,}/g, ' ')).to.equal(expectedDetailText);
    });
  }); // describe('event types')

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
