/** @format */

import { EventCollection } from '@app/models/events.js';
import { GameEvent, GameEventType, LivePlayer } from '@app/models/live.js';
import {
  EVENTS_INITIAL_STATE,
  EventState,
  eventsReducer as events,
} from '@app/slices/live/events-slice.js';
import { actions } from '@app/slices/live/live-slice.js';
import { expect } from '@open-wc/testing';
import sinon from 'sinon';
import { mockCurrentTime, mockTimeProvider } from '../../helpers/test-clock-data.js';
import * as testlive from '../../helpers/test-live-game-data.js';

const { gameSetupCompleted, startPeriod } = actions;

describe('Events slice', () => {
  const startTime = new Date(2016, 0, 1, 14, 0, 0).getTime();
  let fakeClock: sinon.SinonFakeTimers;

  afterEach(async () => {
    sinon.restore();
    if (fakeClock) {
      fakeClock.restore();
    }
  });

  describe('live/gameSetupCompleted', () => {
    let currentState: EventState = EVENTS_INITIAL_STATE;

    beforeEach(() => {
      currentState = {
        ...EVENTS_INITIAL_STATE,
      };
    });

    it('should store event for setup completed', () => {
      fakeClock = mockCurrentTime(startTime);
      const timeProvider = mockTimeProvider(startTime);
      const rosterPlayers = testlive.getLivePlayers(18);
      const game = testlive.getLiveGame(rosterPlayers);
      const expectedCollection = EventCollection.create(
        {
          id: game.id,
        },
        timeProvider
      );
      const setupEvent = {
        type: GameEventType.Setup,
        timestamp: startTime,
        data: {},
      } as GameEvent;
      expectedCollection.addEvent(setupEvent);

      expect(currentState.events, 'events should be empty').to.not.be.ok;

      const newState = events(currentState, gameSetupCompleted(game.id, game));

      expect(newState).to.deep.include({
        events: { [expectedCollection.id]: expectedCollection.toJSON() },
      });
      expect(newState).not.to.equal(currentState);
    });

    it('should do nothing if the game has no players', () => {
      const game = testlive.getLiveGame();
      const newState = events(currentState, gameSetupCompleted(game.id, game));

      expect(newState).to.equal(currentState);
    });
  }); // describe('live/gameSetupCompleted')

  describe('clock/startPeriod', () => {
    let currentState: EventState = EVENTS_INITIAL_STATE;
    let rosterPlayers: LivePlayer[];
    const gameId = 'somegameid';

    before(() => {
      rosterPlayers = testlive.getLivePlayers(18);
    });

    beforeEach(() => {
      currentState = {
        ...EVENTS_INITIAL_STATE,
      };
    });

    it('should store start period event for first period', () => {
      fakeClock = mockCurrentTime(startTime);
      const timeProvider = mockTimeProvider(startTime);
      // const rosterPlayers = testlive.getLivePlayers(18);
      const game = testlive.getLiveGame(rosterPlayers);
      const expectedCollection = EventCollection.create(
        {
          id: game.id,
        },
        timeProvider
      );
      const startEvent = {
        type: GameEventType.StartPeriod,
        timestamp: startTime,
        data: {
          clock: {
            currentPeriod: 1,
            startTime,
          },
        },
      } as GameEvent;
      expectedCollection.addEvent(startEvent);

      expect(currentState.events, 'events should be empty').to.not.be.ok;

      const newState = events(currentState, startPeriod(game.id, /*gameAllowsStart=*/ true));

      expect(newState).to.deep.include({
        events: { [expectedCollection.id]: expectedCollection.toJSON() },
      });
      expect(newState).not.to.equal(currentState);
    });

    it('should store start period event for subsequent period', () => {
      fakeClock = mockCurrentTime(startTime);
      const timeProvider = mockTimeProvider(startTime);
      // const rosterPlayers = testlive.getLivePlayers(18);
      const game = testlive.getLiveGame(rosterPlayers);
      const expectedCollection = EventCollection.create(
        {
          id: game.id,
        },
        timeProvider
      );
      const startEvent = {
        type: GameEventType.StartPeriod,
        timestamp: startTime,
        data: {
          clock: {
            currentPeriod: 2,
            startTime,
          },
        },
      } as GameEvent;
      expectedCollection.addEvent(startEvent);

      expect(currentState.events, 'events should be empty').to.not.be.ok;

      const newState = events(currentState, startPeriod(game.id, /*gameAllowsStart=*/ true));

      expect(newState).to.deep.include({
        events: { [expectedCollection.id]: expectedCollection.toJSON() },
      });
      expect(newState).not.to.equal(currentState);
    });

    it('should do nothing if game does not allow period to be started', () => {
      mockCurrentTime(startTime);

      const newState = events(currentState, startPeriod(gameId, /*gameAllowsStart=*/ false));

      expect(newState.events, 'events should be empty').to.not.be.ok;

      expect(newState).to.equal(currentState);
    });
  }); // describe('clock/startPeriod')
}); // describe('Events slice')
