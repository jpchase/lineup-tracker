/** @format */

import { CurrentTimeProvider } from '@app/models/clock.js';
import { EventBase, EventCollection, EventCollectionData } from '@app/models/events.js';
import { Assertion } from '@esm-bundle/chai';
import { expect } from '@open-wc/testing';
import sinon from 'sinon';
import { mockIdGenerator } from '../helpers/mock-id-generator.js';
import { mockTimeProvider } from '../helpers/test-clock-data.js';

interface TestEvent extends EventBase<string> {}

function initCollectionWithProvider(provider: CurrentTimeProvider | undefined) {
  const collection = EventCollection.create({ id: 'someid' }, provider);
  return collection;
}

function initCollectionWithTime(t0?: number, t1?: number, t2?: number, t3?: number) {
  const provider = mockTimeProvider(t0 || 0, t1, t2, t3);
  const collection = initCollectionWithProvider(provider);
  return { collection, provider };
}

describe('EventCollection', () => {
  const startTime = new Date(2016, 0, 1, 14, 0, 0).getTime();
  const timeStartPlus5 = new Date(2016, 0, 1, 14, 0, 5).getTime();

  afterEach(async () => {
    sinon.restore();
  });

  Assertion.addMethod('initialized', function (this) {
    const collection = this._obj as EventCollection;
    const pass = collection && collection.id.length && !collection.size;

    let expected = '';
    let actual = '';
    if (!pass && collection) {
      expected = JSON.stringify(EventCollection.create({ id: collection.id }).toJSON());
      actual = JSON.stringify(collection.toJSON());
    }

    this.assert(
      pass,
      `expected collection to be empty, without any events`,
      `expected collection to have events`,
      expected,
      actual,
    );
  });

  Assertion.addMethod('size', function (this, expected: number) {
    const collection = this._obj as EventCollection;
    const pass = collection?.size === expected;

    let actual = '';
    if (!pass && collection) {
      actual = `events, size = ${collection.size}`;
    }

    this.assert(
      pass,
      'expected #{act} to have size #{exp}',
      'expected #{act} to not have size #{exp}',
      expected,
      actual,
    );
  });

  describe('event recording', () => {
    it('should record event and add missing metadata', () => {
      mockIdGenerator('anewid');
      const { collection } = initCollectionWithTime(startTime);

      const eventTemplate = {
        type: 'aneventtype',
        data: { foo: 'bar' },
      } as TestEvent;

      const newEvent = {
        ...eventTemplate,
      };

      const storedEvent = collection.addEvent(newEvent);

      // The new event should be unchanged, even though a timestamp was generated.
      expect(newEvent, 'newEvent should not be modified').to.deep.equal(eventTemplate);

      // Should return an event with the id and timestamp, which is also stored in the collection.
      expect(storedEvent, 'stored event should have all metadata set').to.deep.equal({
        ...newEvent,
        id: 'anewid',
        timestamp: startTime,
      });

      expect(collection.eventsForTesting, 'events should have stored event').to.include(
        storedEvent,
      );
    });

    it('should record event and add id when only that missing', () => {
      mockIdGenerator('anewid');
      const { collection } = initCollectionWithTime(startTime);

      const eventTemplate = {
        type: 'aneventtype',
        data: { foo: 'bar' },
        timestamp: startTime,
      } as TestEvent;

      const newEvent = {
        ...eventTemplate,
      };

      const storedEvent = collection.addEvent(newEvent);

      // The new event should be unchanged, even though a timestamp was generated.
      expect(newEvent, 'newEvent should not be modified').to.deep.equal(eventTemplate);

      // Should return an event with the id, which is also stored in the collection.
      expect(storedEvent, 'stored event should have id').to.deep.equal({
        ...newEvent,
        id: 'anewid',
      });

      expect(collection.eventsForTesting, 'events should have stored event').to.include(
        storedEvent,
      );
    });

    it('should record event and add timestamp when only that missing', () => {
      const { collection } = initCollectionWithTime(startTime);

      const eventTemplate = {
        id: 'somepresetid',
        type: 'aneventtype',
        data: { foo: 'bar' },
      } as TestEvent;

      const newEvent = {
        ...eventTemplate,
      };

      const storedEvent = collection.addEvent(newEvent);

      // The new event should be unchanged, even though a timestamp was generated.
      expect(newEvent, 'newEvent should not be modified').to.deep.equal(eventTemplate);

      // Should return an event with the timestamp, which is also stored in the collection.
      expect(storedEvent, 'stored event should have timestamp').to.deep.equal({
        ...newEvent,
        timestamp: startTime,
      });

      expect(collection.eventsForTesting, 'events should have stored event').to.include(
        storedEvent,
      );
    });

    it('should record event group and add group id', () => {
      mockIdGenerator('thegroupid', 'firstid', 'secondid');
      const { collection } = initCollectionWithTime(startTime);

      const event1Template = {
        type: 'aneventtype',
        data: { foo: 'bar' },
      } as TestEvent;
      const event2Template = {
        type: 'anothereventtype',
        data: {},
      } as TestEvent;

      const event1 = {
        ...event1Template,
      };
      const event2 = {
        ...event2Template,
      };

      const storedEvents = collection.addEventGroup([event1, event2]);

      // The new events should be unchanged, even though metadata properties were generated.
      expect(event1, 'event1 should not be modified').to.deep.equal(event1Template);
      expect(event2, 'event2 should not be modified').to.deep.equal(event2Template);

      // Should return events with the group id and metadata, which are also stored in the collection.
      expect(storedEvents, 'stored events should have group metadata').to.deep.equal([
        {
          ...event1,
          id: 'firstid',
          groupId: 'thegroupid',
          timestamp: startTime,
        },
        {
          ...event2,
          id: 'secondid',
          groupId: 'thegroupid',
          timestamp: startTime,
        },
      ]);

      expect(
        collection.eventsForTesting,
        'events should have stored group events',
      ).to.have.deep.ordered.members(storedEvents);
    });
  }); // describe('event recording')

  describe('Existing data', () => {
    it('should not have the time provider serialized', () => {
      const data = {
        id: 'someid',
        events: [
          { id: 'firstid', type: 'aneventtype', data: { foo: 'bar' } },
          { id: 'secondid', type: 'anothereventtype', data: {} },
        ],
      };
      const collection = EventCollection.create(data);

      expect(collection).to.have.size(2);
      expect(collection.timeProvider).to.be.ok;

      const serialized = JSON.stringify(collection);
      const collectionData = JSON.parse(serialized);

      expect(collectionData.events).to.be.ok;
      expect(collectionData.events.length).to.equal(2);
      expect(collectionData.timeProvider).not.to.be.ok;
    });

    it('should throw if no id provided in data', () => {
      expect(() => {
        EventCollection.create({} as EventCollectionData);
      }).to.throw('id must be provided');
      expect(() => {
        EventCollection.create({ id: '' });
      }).to.throw('id must be provided');
    });

    it('should be initialized correctly for empty data', () => {
      const collection = EventCollection.create({ id: 'nodataid' });
      expect(collection).to.be.initialized();
    });

    it('should be serialized correctly for empty data', () => {
      const collection = EventCollection.create({ id: 'nodataid' });
      const collectionData = collection.toJSON();
      expect(collectionData).to.deep.equal({
        id: 'nodataid',
        events: [],
      });
    });

    it('should be serialized correctly with recorded events', () => {
      mockIdGenerator('firstid', 'secondid');
      const { collection } = initCollectionWithTime(startTime, timeStartPlus5);

      const event1: TestEvent = { type: 'aneventtype', data: { foo: 'bar' } };
      const event2: TestEvent = { type: 'anothereventtype', data: {} };

      collection.addEvent(event1);
      collection.addEvent(event2);

      const collectionData = collection.toJSON();

      const expectedEvents: EventBase[] = [
        { ...event1, id: 'firstid', timestamp: startTime },
        { ...event2, id: 'secondid', timestamp: timeStartPlus5 },
      ];

      expect(collectionData).to.deep.equal({
        id: collection.id,
        events: expectedEvents,
      });
    });

    it('should be serialized correctly with recorded event groups', () => {
      mockIdGenerator('thegroupid', 'firstid', 'secondid');
      const { collection } = initCollectionWithTime(startTime, timeStartPlus5);

      const event1: TestEvent = { type: 'aneventtype', data: { foo: 'bar' } };
      const event2: TestEvent = { type: 'anothereventtype', data: {} };

      collection.addEventGroup([event1, event2]);

      const collectionData = collection.toJSON();

      const expectedEvents: EventBase[] = [
        { ...event1, id: 'firstid', groupId: 'thegroupid', timestamp: startTime },
        { ...event2, id: 'secondid', groupId: 'thegroupid', timestamp: timeStartPlus5 },
      ];

      expect(collectionData).to.deep.equal({
        id: collection.id,
        events: expectedEvents,
      });
    });

    it('should be serialized correctly with recorded events, with group manually set', () => {
      mockIdGenerator('groupevent1', 'groupevent2');
      const { collection } = initCollectionWithTime(startTime, timeStartPlus5);

      const event1: TestEvent = { type: 'aneventtype', groupId: 'thegroup', data: { foo: 'bar' } };
      const event2: TestEvent = { type: 'anothereventtype', groupId: 'thegroup', data: {} };

      collection.addEvent(event1);
      collection.addEvent(event2);

      const collectionData = collection.toJSON();

      const expectedEvents: EventBase[] = [
        { ...event1, id: 'groupevent1', timestamp: startTime },
        { ...event2, id: 'groupevent2', timestamp: timeStartPlus5 },
      ];

      expect(collectionData).to.deep.equal({
        id: collection.id,
        events: expectedEvents,
      });
    });
  }); // describe('Existing data')
});
