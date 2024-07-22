/** @format */

import { idGenerator } from '../util/id-generator.js';
import { CurrentTimeProvider } from './clock.js';
import { Model } from './model.js';

export type EventBase<
  EventType extends string = string,
  EventData extends Record<string, unknown> = Record<string, unknown>,
> = {
  id?: string;
  groupId?: string;
  type: EventType;
  timestamp?: number;
  model?: Model;
  data: EventData;
};

export interface EventCollectionData {
  id: string;
  events?: EventBase[];
}

export class EventCollection {
  timeProvider: CurrentTimeProvider;
  id: string;
  events: EventBase[];

  private constructor(data: EventCollectionData, timeProvider?: CurrentTimeProvider) {
    this.timeProvider = timeProvider || new CurrentTimeProvider();
    this.id = data.id;
    this.events = [];
    if (data.events?.length) {
      this.initialize(data.events);
    }
  }

  static create(data: EventCollectionData, timeProvider?: CurrentTimeProvider): EventCollection {
    if (!data.id) {
      throw new Error('id must be provided');
    }
    return new EventCollection(data, timeProvider);
  }

  toJSON() {
    return {
      id: this.id,
      events: this.events,
    };
  }

  private initialize(events?: EventBase[]) {
    if (!events || !events.length) {
      throw new Error('events must be provided to initialize');
    }

    this.events = [];
    for (const event of events) {
      this.events.push({ ...event });
    }
    return this;
  }

  populateEvent<E extends EventBase>(event: E) {
    // TODO: structured clone, in case `data` has objects?
    const storedEvent = { ...event };
    if (!event.id) {
      storedEvent.id = idGenerator.newid('ev');
    }
    if (!event.timestamp) {
      storedEvent.timestamp = this.timeProvider.getCurrentTime();
    }
    return storedEvent;
  }

  addEvent<E extends EventBase>(event: E) {
    const storedEvent = this.populateEvent(event);
    this.events.push(storedEvent);
    return storedEvent;
  }

  addEventGroup<E extends EventBase>(events: E[]) {
    const groupId = idGenerator.newid('eg');
    const result = [];
    for (const event of events) {
      const storedEvent = this.populateEvent(event);
      storedEvent.groupId = groupId;
      this.events.push(storedEvent);
      result.push(storedEvent);
    }
    return result;
  }
}
