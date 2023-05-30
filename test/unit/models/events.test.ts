/** @format */

import { CurrentTimeProvider } from '@app/models/clock.js';
import { EventBase, EventCollection, EventCollectionData } from '@app/models/events.js';
import { Assertion } from '@esm-bundle/chai';
import { expect } from '@open-wc/testing';
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

// function initCollectionWithManualTime() {
//   const provider = new ManualTimeProvider();
//   const collection = initCollectionWithProvider(provider);
//   return { collection, provider };
// }

describe('EventCollection', () => {
  const startTime = new Date(2016, 0, 1, 14, 0, 0).getTime();
  const timeStartPlus5 = new Date(2016, 0, 1, 14, 0, 5).getTime();

  Assertion.addMethod('initialized', function (this) {
    const collection = this._obj as EventCollection;
    const pass =
      collection && collection.id.length && (!collection.events || !collection.events.length);

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
      actual
    );
  });

  Assertion.addMethod('size', function (this, expected: number) {
    const collection = this._obj as EventCollection;
    const pass = collection?.events?.length === expected;

    let actual = '';
    if (!pass && collection) {
      actual = `events, length = ${collection.events.length}`;
    }

    this.assert(
      pass,
      'expected #{act} to have size #{exp}',
      'expected #{act} to not have size #{exp}',
      expected,
      actual
    );
  });

  describe('event recording', () => {
    it('should record event and add timestamp', () => {
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

      // Should return an event with the timestamp, which is also stored in the collection.
      expect(storedEvent, 'stored event should have timestamp').to.deep.equal({
        ...newEvent,
        timestamp: startTime,
      });

      expect(collection.events, 'events should have stored event').to.include(storedEvent);
    });
  }); // describe('event recording')

  describe('Existing data', () => {
    it('should not have the time provider serialized', () => {
      const data = {
        id: 'someid',
        events: [
          { type: 'aneventtype', data: { foo: 'bar' } },
          { type: 'anothereventtype', data: {} },
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
      const { collection } = initCollectionWithTime(startTime, timeStartPlus5);

      const event1: TestEvent = { type: 'aneventtype', data: { foo: 'bar' } };
      const event2: TestEvent = { type: 'anothereventtype', data: {} };

      collection.addEvent(event1);
      collection.addEvent(event2);

      const collectionData = collection.toJSON();

      const expectedEvents: EventBase[] = [
        { ...event1, timestamp: startTime },
        { ...event2, timestamp: timeStartPlus5 },
      ];

      expect(collectionData).to.deep.equal({
        id: collection.id,
        events: expectedEvents,
      });
    });
  }); // describe('Existing data')
});
