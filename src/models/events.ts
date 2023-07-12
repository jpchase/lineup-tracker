/** @format */

import { CurrentTimeProvider } from './clock.js';
import { Model } from './model.js';

export type EventBase<
  EventType extends string = string,
  EventData extends Record<string, unknown> = Record<string, unknown>
> = {
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

  addEvent<E extends EventBase>(event: E) {
    let storedEvent = event;
    if (!event.timestamp) {
      storedEvent = {
        ...event,
        timestamp: new Date(this.timeProvider.getCurrentTime()).getTime(),
      };
    }
    this.events.push(storedEvent);
    return storedEvent;
  }
}
