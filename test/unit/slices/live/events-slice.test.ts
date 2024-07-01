/** @format */

import { listenerMiddleware, startAppListening } from '@app/app/action-listeners.js';
import { EventCollection } from '@app/models/events.js';
import { FormationType, Position } from '@app/models/formation.js';
import {
  GameEvent,
  GameEventCollection,
  GameEventType,
  LiveGame,
  LivePlayer,
  PeriodEndEvent,
  PeriodStartEvent,
  PositionSwapEvent,
  SetupEvent,
  SubInEvent,
  SubOutEvent,
  getPlayer,
} from '@app/models/live.js';
import { PlayerStatus } from '@app/models/player.js';
import { getLiveSliceConfigurator } from '@app/slices/live/composed-reducer.js';
import {
  EVENTS_INITIAL_STATE,
  EventState,
  eventSelected,
  eventUpdateRequested,
  eventsReducer,
  eventsUpdated,
  setupEventsListeners,
} from '@app/slices/live/events-slice.js';
import { actions } from '@app/slices/live/live-slice.js';
import { AppStore, setupStore } from '@app/store.js';
import { expect } from '@open-wc/testing';
import sinon from 'sinon';
import { ActionLogger } from '../../helpers/action-logger.js';
import {
  buildClock,
  buildEventState,
  buildLiveStateWithCurrentGame,
  selectPlayers,
} from '../../helpers/live-state-setup.js';
import { mockIdGenerator, mockIdGeneratorWithCallback } from '../../helpers/mock-id-generator.js';
import { buildRootState } from '../../helpers/root-state-setup.js';
import {
  incrementingCallbackForTimeProvider,
  mockCurrentTime,
  mockTimeProvider,
  mockTimeProviderWithCallback,
} from '../../helpers/test-clock-data.js';
import {
  buildGameEvents,
  buildGameSetupEvent,
  buildPeriodStartEvent,
} from '../../helpers/test-event-data.js';
import * as testlive from '../../helpers/test-live-game-data.js';

const { applyPendingSubs, gameSetupCompleted, startPeriod, endPeriod } = actions;

function makeEventId(eventIndex: number) {
  return `ev-id-${eventIndex}`;
}

function makeEventGroupId(groupIndex: number) {
  return `eg-id-${groupIndex}`;
}

function mockCallbackForEventsIdGenerator() {
  let eventIndex = 0;
  let groupIndex = 0;

  return (type?: string, _size?: number) => {
    switch (type) {
      case 'ev':
        eventIndex += 1;
        return makeEventId(eventIndex);

      case 'eg':
        groupIndex += 1;
        return makeEventGroupId(groupIndex);

      default:
        throw new Error(`Unexpected id type: ${type}`);
    }
  };
}

describe('Events slice', () => {
  const startTime = new Date(2016, 0, 1, 14, 0, 0).getTime();
  const timeStartPlus20Minutes = new Date(2016, 0, 1, 14, 20, 0).getTime();
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

      const game = testlive.getLiveGameWithPlayers();
      game.clock = buildClock();
      currentState = buildLiveStateWithCurrentGame(game, {
        ...EVENTS_INITIAL_STATE,
      });

      const expectedCollection = EventCollection.create<GameEvent>(
        {
          id: game.id,
        },
        timeProvider
      );
      const setupEvent = buildGameSetupEvent(startTime);
      expectedCollection.addEvent<SetupEvent>(setupEvent);
      mockIdGenerator(setupEvent.id!);

      expect(currentState.events, 'events should be empty').to.not.be.ok;

      const newState = eventsReducer(currentState, gameSetupCompleted(game.id, game));

      expect(newState).to.deep.include({
        events: { [expectedCollection.id]: expectedCollection.toJSON() },
      });
      expect(newState).not.to.equal(currentState);
    });

    it('should do nothing if the game has no players', () => {
      const game = testlive.getLiveGame();
      const newState = eventsReducer(currentState, gameSetupCompleted(game.id, game));

      expect(newState).to.equal(currentState);
    });
  }); // describe('live/gameSetupCompleted')

  describe('live/startPeriod', () => {
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
      const game = testlive.getLiveGame(rosterPlayers);
      const expectedCollection = EventCollection.create<GameEvent>(
        {
          id: game.id,
        },
        timeProvider
      );
      const startEvent = buildPeriodStartEvent(startTime, /* currentPeriod= */ 1);
      expectedCollection.addEvent<PeriodStartEvent>(startEvent);
      mockIdGenerator(startEvent.id!);

      expect(currentState.events, 'events should be empty').to.not.be.ok;

      const newState = eventsReducer(
        currentState,
        startPeriod(game.id, /*gameAllowsStart=*/ true, /*currentPeriod=*/ 1, startTime)
      );

      expect(newState).to.deep.include({
        events: { [expectedCollection.id]: expectedCollection.toJSON() },
      });
      expect(newState).not.to.equal(currentState);
    });

    it('should store start period event for subsequent period', () => {
      fakeClock = mockCurrentTime(startTime);
      const timeProvider = mockTimeProvider(startTime);
      const game = testlive.getLiveGame(rosterPlayers);
      const expectedCollection = EventCollection.create<GameEvent>(
        {
          id: game.id,
        },
        timeProvider
      );
      const startEvent = buildPeriodStartEvent(startTime, /* currentPeriod= */ 2);
      expectedCollection.addEvent<PeriodStartEvent>(startEvent);
      mockIdGenerator(startEvent.id!);

      expect(currentState.events, 'events should be empty').to.not.be.ok;

      const newState = eventsReducer(
        currentState,
        startPeriod(game.id, /*gameAllowsStart=*/ true, /*currentPeriod=*/ 2, startTime)
      );

      expect(newState).to.deep.include({
        events: { [expectedCollection.id]: expectedCollection.toJSON() },
      });
      expect(newState).not.to.equal(currentState);
    });

    it('should do nothing if game does not allow period to be started', () => {
      mockCurrentTime(startTime);

      const newState = eventsReducer(currentState, startPeriod(gameId, /*gameAllowsStart=*/ false));

      expect(newState.events, 'events should be empty').to.not.be.ok;

      expect(newState).to.equal(currentState);
    });
  }); // describe('live/startPeriod')

  describe('live/applyPendingSubs', () => {
    interface SubData {
      // Player in Next status (either going on or swapping position).
      nextId: string;
      // Player in On status to come off for sub, or the player whose position
      // will be taken by a swap.
      replacedId?: string;
      // Sub into this position, instead of that from the replaced player.
      positionOverride?: Position;
      isSwap?: boolean;
      // Placeholder id for player in Next status, that swap positions.
      swapNextId?: string;
      // The initial position for the sub, before any subs/swaps applied.
      initialPosition?: Position;
      // The final position for the sub, after all subs/swaps applied.
      expectedFinalPosition?: Position;
    }

    // The first 11 players (ids P0 - P10) fill all the positions for the 4-3-3 formation.
    // Subs: three off players (ids P11 - P12), replace on players.
    const sub1: SubData = {
      nextId: 'P11',
      replacedId: 'P4',
    };
    const sub2: SubData = {
      nextId: 'P12',
      replacedId: 'P5',
    };
    const sub3: SubData = {
      nextId: 'P13',
      replacedId: 'P6',
    };
    // Swaps: three on players move to other positions, no overlap with subs above.
    const swap1: SubData = {
      nextId: 'P8',
      replacedId: 'P9',
      isSwap: true,
      swapNextId: 'P8_swap',
    };
    const swap2: SubData = {
      nextId: 'P9',
      replacedId: 'P10',
      isSwap: true,
      swapNextId: 'P9_swap',
    };
    const swap3: SubData = {
      nextId: 'P10',
      replacedId: 'P8',
      isSwap: true,
      swapNextId: 'P10_swap',
    };

    let currentState: EventState = EVENTS_INITIAL_STATE;
    // let game: LiveGame;
    let gameId = 'somegameid';

    beforeEach(() => {
      currentState = {
        ...EVENTS_INITIAL_STATE,
      };
    });

    function setupSubState(subs: SubData[], inputGame?: LiveGame) {
      const game = inputGame ?? testlive.getLiveGameWithPlayers();
      game.formation = { type: FormationType.F4_3_3 };

      // Ensure the first 11 players are on.
      for (let i = 0; i < 11; i++) {
        const player = getPlayer(game, `P${i}`)!;
        player.status = PlayerStatus.On;
      }

      for (const sub of subs) {
        if (sub.isSwap) {
          const onPlayer = getPlayer(game, sub.nextId)!;
          const positionPlayer = getPlayer(game, sub.replacedId!)!;

          const nextPlayer = testlive.setupSwap(onPlayer, positionPlayer, sub.swapNextId!);
          game.players?.push(nextPlayer);

          if (!sub.initialPosition) {
            sub.initialPosition = { ...onPlayer.currentPosition! };
          }
          if (!sub.expectedFinalPosition) {
            sub.expectedFinalPosition = { ...positionPlayer.currentPosition! };
          }
          continue;
        }

        // Usual sub
        const nextPlayer = getPlayer(game, sub.nextId)!;
        const onPlayer = getPlayer(game, sub.replacedId!)!;

        testlive.setupSub(nextPlayer, onPlayer, sub.positionOverride);
        if (!sub.expectedFinalPosition) {
          sub.expectedFinalPosition = { ...nextPlayer.currentPosition! };
        }
      }

      gameId = game.id;
      return game;
    }

    function buildSubs(...subs: SubData[]): SubData[] {
      // TODO: Use structuredClone
      return subs.map((input) => ({ ...input }));
    }

    function getNextIds(subs: SubData[]): string[] {
      return subs.map((input) => input.nextId);
    }

    function getSwapNextIds(subs: SubData[]): string[] {
      return subs.map((input) => input.swapNextId!);
    }

    function getPlayersByIds(game: LiveGame, ids: string[]) {
      return game.players?.filter((player) => ids.includes(player.id)) || [];
    }

    it('should store sub applied events for all next subs, when not selectedOnly', () => {
      mockIdGeneratorWithCallback(mockCallbackForEventsIdGenerator());
      fakeClock = mockCurrentTime(startTime);
      const timeProvider = mockTimeProvider(startTime);
      const subs = buildSubs(sub1, sub2, sub3);
      const game = setupSubState(subs);

      const expectedCollection = EventCollection.create<GameEvent>(
        {
          id: game.id,
        },
        timeProvider
      );
      // There should be a pair of sub in/out events for each of
      // the three subs.
      let eventIndex = 0;
      let groupIndex = 0;
      for (const sub of subs) {
        groupIndex += 1;

        eventIndex += 1;
        expectedCollection.addEvent<SubInEvent>({
          id: makeEventId(eventIndex),
          groupId: makeEventGroupId(groupIndex),
          type: GameEventType.SubIn,
          timestamp: startTime,
          playerId: sub.nextId,
          data: {
            replaced: sub.replacedId!,
            position: sub.expectedFinalPosition?.id!,
          },
        });
        eventIndex += 1;
        expectedCollection.addEvent<SubOutEvent>({
          id: makeEventId(eventIndex),
          groupId: makeEventGroupId(groupIndex),
          type: GameEventType.SubOut,
          timestamp: startTime,
          playerId: sub.replacedId!,
          data: {},
        });
      }

      const newState = eventsReducer(
        currentState,
        applyPendingSubs(gameId, getPlayersByIds(game, getNextIds(subs)))
      );

      expect(newState).to.deep.include({
        events: { [expectedCollection.id]: expectedCollection.toJSON() },
      });
      expect(newState).not.to.equal(currentState);
    });

    it('should store sub applied events for all next swaps, when not selectedOnly', () => {
      mockIdGeneratorWithCallback(mockCallbackForEventsIdGenerator());
      fakeClock = mockCurrentTime(startTime);
      const timeProvider = mockTimeProvider(startTime);
      const swaps = buildSubs(swap1, swap2, swap3);
      const game = setupSubState(swaps);

      const expectedCollection = EventCollection.create<GameEvent>(
        {
          id: game.id,
        },
        timeProvider
      );
      let eventIndex = 0;
      for (const swap of swaps) {
        eventIndex += 1;
        expectedCollection.addEvent<PositionSwapEvent>({
          id: makeEventId(eventIndex),
          type: GameEventType.Swap,
          timestamp: startTime,
          playerId: swap.nextId,
          data: {
            position: swap.expectedFinalPosition?.id!,
            previousPosition: swap.initialPosition?.id!,
          },
        });
      }

      const newState = eventsReducer(
        currentState,
        applyPendingSubs(gameId, getPlayersByIds(game, getSwapNextIds(swaps)))
      );

      expect(newState).to.deep.include({
        events: { [expectedCollection.id]: expectedCollection.toJSON() },
      });
      expect(newState).not.to.equal(currentState);
    });

    it('should store sub applied events for all next subs and swaps, when not selectedOnly', () => {
      mockIdGeneratorWithCallback(mockCallbackForEventsIdGenerator());
      fakeClock = mockCurrentTime(startTime);
      const timeProvider = mockTimeProvider(startTime);
      // Setup a combination of a swap and sub, e.g.:
      //  - A replaces B, but in C's position
      //  - C swaps to D's position, and D swaps to B's position
      // A = next player to be subbed on from |sub1|
      // B = player to be replaced from |sub1|
      // C = player to be swapped from |swap1|
      // D = player to be swapped from |swap2|
      const game = testlive.getLiveGameWithPlayers();
      const sub1ReplacedPlayer = getPlayer(game, sub1.replacedId!)!;
      const swap1Player = getPlayer(game, swap1.nextId!)!;
      const swap2Player = getPlayer(game, swap2.nextId!)!;

      const subs = [
        // Set A to go into C's position, instead of taking B's position by default.
        {
          ...sub1,
          positionOverride: { ...swap1Player.currentPosition! },
          expectedFinalPosition: { ...swap1Player.currentPosition! },
        },
        // Other subs are unchanged.
        sub2,
        sub3,
      ];
      const swaps = [
        // Set C to swap to D's position.
        {
          ...swap1,
          replacedId: swap2.nextId!,
          expectedFinalPosition: { ...swap2Player.currentPosition! },
        },
        // Set D to swap to B's position.
        {
          ...swap2,
          replacedId: sub1.replacedId!,
          expectedFinalPosition: { ...sub1ReplacedPlayer.currentPosition! },
        },
        // Other swaps are unchanged.
        { ...swap3, expectedFinalPosition: { ...swap1Player.currentPosition! } },
      ];
      const pendingSubs = buildSubs(...subs, ...swaps);
      setupSubState(pendingSubs, game);

      const pendingSubPlayers = getPlayersByIds(
        game,
        getNextIds(subs).concat(getSwapNextIds(swaps))
      );

      const expectedCollection = EventCollection.create<GameEvent>(
        {
          id: game.id,
        },
        timeProvider
      );
      let eventIndex = 0;
      let groupIndex = 0;
      for (const sub of pendingSubs) {
        groupIndex += 1;

        if (sub.isSwap) {
          eventIndex += 1;
          expectedCollection.addEvent<PositionSwapEvent>({
            id: makeEventId(eventIndex),
            type: GameEventType.Swap,
            timestamp: startTime,
            playerId: sub.nextId,
            data: {
              position: sub.expectedFinalPosition?.id!,
              previousPosition: sub.initialPosition?.id!,
            },
          });
          continue;
        }

        eventIndex += 1;
        expectedCollection.addEvent<SubInEvent>({
          id: makeEventId(eventIndex),
          groupId: makeEventGroupId(groupIndex),
          type: GameEventType.SubIn,
          timestamp: startTime,
          playerId: sub.nextId,
          data: {
            replaced: sub.replacedId!,
            position: sub.expectedFinalPosition?.id!,
          },
        });
        eventIndex += 1;
        expectedCollection.addEvent<SubOutEvent>({
          id: makeEventId(eventIndex),
          groupId: makeEventGroupId(groupIndex),
          type: GameEventType.SubOut,
          timestamp: startTime,
          playerId: sub.replacedId!,
          data: {},
        });
      }

      const newState = eventsReducer(currentState, applyPendingSubs(gameId, pendingSubPlayers));

      expect(newState).to.deep.include({
        events: { [expectedCollection.id]: expectedCollection.toJSON() },
      });
      expect(newState).not.to.equal(currentState);
    });

    it('should store sub applied events for only selected next subs', () => {
      mockIdGeneratorWithCallback(mockCallbackForEventsIdGenerator());
      fakeClock = mockCurrentTime(startTime);
      const timeProvider = mockTimeProvider(startTime);

      const selectedSubs = [sub1, sub3];
      const remainingSubs = [sub2];
      const subs = buildSubs(...selectedSubs, ...remainingSubs);
      const game = setupSubState(subs);

      // Apply 2 of the 3 pending subs (> 1 to test it will actually handle multiple, not just first)
      const nowPlayingIds = getNextIds(selectedSubs);
      selectPlayers(game, nowPlayingIds, true);

      const expectedCollection = EventCollection.create<GameEvent>(
        {
          id: game.id,
        },
        timeProvider
      );
      // There should be a pair of sub in/out events for each of
      // the selected subs.
      let eventIndex = 0;
      let groupIndex = 0;
      for (const sub of subs) {
        if (!nowPlayingIds.includes(sub.nextId)) {
          continue;
        }
        groupIndex += 1;

        eventIndex += 1;
        expectedCollection.addEvent<SubInEvent>({
          id: makeEventId(eventIndex),
          groupId: makeEventGroupId(groupIndex),
          type: GameEventType.SubIn,
          timestamp: startTime,
          playerId: sub.nextId,
          data: {
            replaced: sub.replacedId!,
            position: sub.expectedFinalPosition?.id!,
          },
        });
        eventIndex += 1;
        expectedCollection.addEvent<SubOutEvent>({
          id: makeEventId(eventIndex),
          groupId: makeEventGroupId(groupIndex),
          type: GameEventType.SubOut,
          timestamp: startTime,
          playerId: sub.replacedId!,
          data: {},
        });
      }

      const newState = eventsReducer(
        currentState,
        applyPendingSubs(gameId, getPlayersByIds(game, nowPlayingIds))
      );

      expect(newState).to.deep.include({
        events: { [expectedCollection.id]: expectedCollection.toJSON() },
      });
      expect(newState).not.to.equal(currentState);
    });

    it('should store sub applied events for only selected next swaps', () => {
      mockIdGeneratorWithCallback(mockCallbackForEventsIdGenerator());
      fakeClock = mockCurrentTime(startTime);
      const timeProvider = mockTimeProvider(startTime);
      const selectedSwaps = [swap1, swap3];
      const remainingSwaps = [swap2];
      const swaps = buildSubs(...selectedSwaps, ...remainingSwaps);
      const game = setupSubState(swaps);

      // Apply 2 of the 3 pending swaps (> 1 to test it will actually handle multiple, not just first)
      const swappedNextIds = getSwapNextIds(selectedSwaps);
      selectPlayers(game, swappedNextIds, true);

      const expectedCollection = EventCollection.create<GameEvent>(
        {
          id: game.id,
        },
        timeProvider
      );
      const nowSwappedIds = getNextIds(selectedSwaps);
      let eventIndex = 0;
      for (const swap of swaps) {
        if (!nowSwappedIds.includes(swap.nextId)) {
          continue;
        }
        eventIndex += 1;
        expectedCollection.addEvent<PositionSwapEvent>({
          id: makeEventId(eventIndex),
          type: GameEventType.Swap,
          timestamp: startTime,
          playerId: swap.nextId,
          data: {
            position: swap.expectedFinalPosition?.id!,
            previousPosition: swap.initialPosition?.id!,
          },
        });
      }

      const newState = eventsReducer(
        currentState,
        applyPendingSubs(gameId, getPlayersByIds(game, swappedNextIds))
      );

      expect(newState).to.deep.include({
        events: { [expectedCollection.id]: expectedCollection.toJSON() },
      });
      expect(newState).not.to.equal(currentState);
    });

    it('should store sub applied events for only selected next subs and swaps', () => {
      mockIdGeneratorWithCallback(mockCallbackForEventsIdGenerator());
      fakeClock = mockCurrentTime(startTime);
      const timeProvider = mockTimeProvider(startTime);
      // Setup a combination of a swap and sub, e.g.:
      //  - A replaces B, but in C's position
      //  - C swaps to D's position, and D swaps to B's position
      // A = next player to be subbed on from |sub1|
      // B = player to be replaced from |sub1|
      // C = player to be swapped from |swap1|
      // D = player to be swapped from |swap2|
      const game = testlive.getLiveGameWithPlayers();
      const sub1ReplacedPlayer = getPlayer(game, sub1.replacedId!)!;
      const swap1Player = getPlayer(game, swap1.nextId!)!;
      const swap2Player = getPlayer(game, swap2.nextId!)!;

      const selectedSubs = [
        // Set A to go into C's position, instead of taking B's position by default.
        { ...sub1, positionOverride: { ...swap1Player.currentPosition! } },
        sub3,
      ];
      const remainingSubs = [sub2];
      const selectedSwaps = [
        // Set C to swap to D's position.
        {
          ...swap1,
          replacedId: swap2.nextId!,
          expectedFinalPosition: { ...swap2Player.currentPosition! },
        },
        // Set D to swap to B's position.
        {
          ...swap2,
          replacedId: sub1.replacedId!,
          expectedFinalPosition: { ...sub1ReplacedPlayer.currentPosition! },
        },
      ];
      const remainingSwaps = [swap3];
      const subs = buildSubs(...selectedSubs, ...remainingSubs);
      const swaps = buildSubs(...selectedSwaps, ...remainingSwaps);
      const pendingSubs = subs.concat(swaps);
      setupSubState(pendingSubs, game);

      // Apply 2 of the 3 pending subs and swaps (> 1 to test it will actually handle multiple, not just first)
      const nowPlayingIds = getNextIds(selectedSubs);
      const toBeSelected = nowPlayingIds.concat(getSwapNextIds(selectedSwaps));
      const selectedSubIds = nowPlayingIds.concat(getNextIds(selectedSwaps));

      selectPlayers(game, toBeSelected, true);

      const pendingSubPlayers = getPlayersByIds(game, toBeSelected);

      const expectedCollection = EventCollection.create<GameEvent>(
        {
          id: game.id,
        },
        timeProvider
      );
      let eventIndex = 0;
      let groupIndex = 0;

      for (const sub of pendingSubs) {
        if (!selectedSubIds.includes(sub.nextId)) {
          continue;
        }

        groupIndex += 1;

        if (sub.isSwap) {
          eventIndex += 1;
          expectedCollection.addEvent<PositionSwapEvent>({
            id: makeEventId(eventIndex),
            type: GameEventType.Swap,
            timestamp: startTime,
            playerId: sub.nextId,
            data: {
              position: sub.expectedFinalPosition?.id!,
              previousPosition: sub.initialPosition?.id!,
            },
          });
          continue;
        }

        eventIndex += 1;
        expectedCollection.addEvent<SubInEvent>({
          id: makeEventId(eventIndex),
          groupId: makeEventGroupId(groupIndex),
          type: GameEventType.SubIn,
          timestamp: startTime,
          playerId: sub.nextId,
          data: {
            replaced: sub.replacedId!,
            position: sub.expectedFinalPosition?.id!,
          },
        });
        eventIndex += 1;
        expectedCollection.addEvent<SubOutEvent>({
          id: makeEventId(eventIndex),
          groupId: makeEventGroupId(groupIndex),
          type: GameEventType.SubOut,
          timestamp: startTime,
          playerId: sub.replacedId!,
          data: {},
        });
      }

      const newState = eventsReducer(currentState, applyPendingSubs(gameId, pendingSubPlayers));

      expect(newState).to.deep.include({
        events: { [expectedCollection.id]: expectedCollection.toJSON() },
      });
      expect(newState).not.to.equal(currentState);
    });
  }); // describe('live/applyPendingSubs')

  describe('live/endPeriod', () => {
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

    it('should store end period event for first period', () => {
      mockIdGenerator('endeventid');
      fakeClock = mockCurrentTime(timeStartPlus20Minutes);
      const timeProvider = mockTimeProvider(timeStartPlus20Minutes);
      const game = testlive.getLiveGame(rosterPlayers);
      const expectedCollection = EventCollection.create<GameEvent>(
        {
          id: game.id,
        },
        timeProvider
      );
      expectedCollection.addEvent<PeriodEndEvent>({
        id: 'endeventid',
        type: GameEventType.PeriodEnd,
        timestamp: timeStartPlus20Minutes,
        data: {
          clock: {
            currentPeriod: 1,
            endTime: timeStartPlus20Minutes,
          },
        },
      });

      expect(currentState.events, 'events should be empty').to.not.be.ok;

      const newState = eventsReducer(
        currentState,
        endPeriod(game.id, /*gameAllowsEnd=*/ true, /*currentPeriod=*/ 1, timeStartPlus20Minutes)
      );

      expect(newState).to.deep.include({
        events: { [expectedCollection.id]: expectedCollection.toJSON() },
      });
      expect(newState).not.to.equal(currentState);
    });

    it('should store end period event for last period', () => {
      mockIdGenerator('endeventid');
      fakeClock = mockCurrentTime(timeStartPlus20Minutes);
      const timeProvider = mockTimeProvider(timeStartPlus20Minutes);
      const game = testlive.getLiveGame(rosterPlayers);
      const expectedCollection = EventCollection.create<GameEvent>(
        {
          id: game.id,
        },
        timeProvider
      );
      expectedCollection.addEvent<PeriodEndEvent>({
        id: 'endeventid',
        type: GameEventType.PeriodEnd,
        timestamp: timeStartPlus20Minutes,
        data: {
          clock: {
            currentPeriod: 2,
            endTime: timeStartPlus20Minutes,
          },
        },
      });
      expect(currentState.events, 'events should be empty').to.not.be.ok;

      const newState = eventsReducer(
        currentState,
        endPeriod(game.id, /*gameAllowsEnd=*/ true, /*currentPeriod=*/ 2, timeStartPlus20Minutes)
      );

      expect(newState).to.deep.include({
        events: { [expectedCollection.id]: expectedCollection.toJSON() },
      });
      expect(newState).not.to.equal(currentState);
    });

    it('should do nothing if game does not allow period to be ended', () => {
      mockCurrentTime(timeStartPlus20Minutes);

      const newState = eventsReducer(currentState, endPeriod(gameId, /*gameAllowsEnd=*/ false));

      expect(newState.events, 'events should be empty').to.not.be.ok;

      expect(newState).to.equal(currentState);
    });
  }); // describe('live/endPeriod')

  describe('event selection', () => {
    let currentState: EventState;
    let game: LiveGame;
    let gameEvents: GameEventCollection;

    beforeEach(() => {
      game = testlive.getLiveGameWithPlayers();
      // Create a collection of representative events, which occur 10 seconds apart.
      const timeProvider = mockTimeProviderWithCallback(
        incrementingCallbackForTimeProvider(startTime, /* incrementSeconds= */ 10)
      );
      gameEvents = buildGameEvents(game, timeProvider);
      currentState = buildEventState(gameEvents);
    });

    function getEventIds(events: EventCollection): string[] {
      const ids = [];

      for (const event of events) {
        ids.push(event.id!);
      }
      return ids;
    }

    it('adds first event that was selected', () => {
      const selectedEventId = getEventIds(gameEvents)[0];
      const newState = eventsReducer(
        currentState,
        eventSelected(game.id, selectedEventId, /* selected= */ true)
      );

      expect(newState).to.deep.include({
        eventsSelectedIds: [selectedEventId],
      });
      expect(newState).not.to.equal(currentState);
    });

    it('do nothing if event is already selected', () => {
      const selectedEventId = getEventIds(gameEvents)[0];
      currentState.eventsSelectedIds = [selectedEventId];

      const newState = eventsReducer(
        currentState,
        eventSelected(game.id, selectedEventId, /* selected= */ true)
      );

      expect(newState).to.deep.include({
        eventsSelectedIds: [selectedEventId],
      });
      expect(newState).to.equal(currentState);
    });

    it('adds second event that was selected', () => {
      const ids = getEventIds(gameEvents);
      const selectedEventId = ids[0];
      const alreadySelectedEventId = ids[1];
      currentState.eventsSelectedIds = [alreadySelectedEventId];

      const newState = eventsReducer(
        currentState,
        eventSelected(game.id, selectedEventId, /* selected= */ true)
      );

      expect(newState).to.deep.include({
        eventsSelectedIds: [alreadySelectedEventId, selectedEventId],
      });
      expect(newState).not.to.equal(currentState);
    });

    it('removes only event that was de-selected', () => {
      const deselectedEventId = getEventIds(gameEvents)[0];
      currentState.eventsSelectedIds = [deselectedEventId];

      const newState = eventsReducer(
        currentState,
        eventSelected(game.id, deselectedEventId, /* selected= */ false)
      );

      expect(newState).to.deep.include({
        eventsSelectedIds: [],
      });
      expect(newState).not.to.equal(currentState);
    });

    it('removes de-selected event leaving others still selected', () => {
      const ids = getEventIds(gameEvents);
      const deselectedEventId = ids[0];
      const stillSelectedEventId = ids[1];
      currentState.eventsSelectedIds = [deselectedEventId, stillSelectedEventId];

      const newState = eventsReducer(
        currentState,
        eventSelected(game.id, deselectedEventId, /* selected= */ false)
      );

      expect(newState).to.deep.include({
        eventsSelectedIds: [stillSelectedEventId],
      });
      expect(newState).not.to.equal(currentState);
    });
  }); // describe('event selection')

  describe('event updates', () => {
    let currentState: EventState;
    let game: LiveGame;
    let gameEvents: GameEventCollection;
    let updatedEvents: GameEventCollection;

    beforeEach(() => {
      game = testlive.getLiveGameWithPlayers();
      // Create a collection of representative events, which occur 10 seconds apart.
      const timeProvider = mockTimeProviderWithCallback(
        incrementingCallbackForTimeProvider(startTime, /* incrementSeconds= */ 10)
      );
      gameEvents = buildGameEvents(game, timeProvider);

      updatedEvents = EventCollection.create({
        id: game.id,
      });
      for (const event of gameEvents.eventsForTesting) {
        updatedEvents.addEvent({ ...event });
      }
      currentState = buildEventState(gameEvents);
    });

    it('applies custom time to single selected event', () => {
      const selectedEvent = gameEvents.eventsForTesting[0];
      const selectedEventId = selectedEvent.id!;
      currentState.eventsSelectedIds = [selectedEventId];

      // Update the selected event to 15 seconds earlier
      const customTime = new Date(selectedEvent.timestamp!);
      customTime.setSeconds(customTime.getSeconds() - 15);

      const newState = eventsReducer(
        currentState,
        eventUpdateRequested(
          game.id,
          [selectedEventId],
          /* useExistingTime= */ false,
          undefined,
          customTime.getTime()
        )
      );

      const updatedEvent = updatedEvents.get(selectedEventId)!;
      updatedEvent.timestamp = customTime.getTime();

      expect(newState).to.deep.include({
        events: { [updatedEvents.id]: updatedEvents.toJSON() },
        eventsSelectedIds: [],
      });
      expect(newState).not.to.equal(currentState);
    });

    it('applies custom time to multiple selected events', () => {
      const selectedEvent = gameEvents.eventsForTesting[0];
      const selectedEventId = selectedEvent.id!;
      const anotherSelectedEventId = gameEvents.eventsForTesting[1].id!;
      currentState.eventsSelectedIds = [selectedEventId, anotherSelectedEventId];

      // Update the selected event to 15 seconds earlier
      const customTime = new Date(selectedEvent.timestamp!);
      customTime.setSeconds(customTime.getSeconds() - 15);

      const newState = eventsReducer(
        currentState,
        eventUpdateRequested(
          game.id,
          [selectedEventId, anotherSelectedEventId],
          /* useExistingTime= */ false,
          undefined,
          customTime.getTime()
        )
      );

      for (const updatedId of [selectedEventId, anotherSelectedEventId]) {
        const updatedEvent = updatedEvents.get(updatedId)!;
        updatedEvent.timestamp = customTime.getTime();
      }

      expect(newState).to.deep.include({
        events: { [updatedEvents.id]: updatedEvents.toJSON() },
        eventsSelectedIds: [],
      });
      expect(newState).not.to.equal(currentState);
    });

    it('applies existing event time to single selected event', () => {
      const selectedEventId = gameEvents.eventsForTesting[0].id!;
      currentState.eventsSelectedIds = [selectedEventId];

      const existingEventId = gameEvents.eventsForTesting[4].id!;

      const newState = eventsReducer(
        currentState,
        eventUpdateRequested(
          game.id,
          [selectedEventId],
          /* useExistingTime= */ true,
          existingEventId,
          undefined
        )
      );

      const updatedEvent = updatedEvents.get(selectedEventId)!;
      updatedEvent.timestamp = updatedEvents.get(existingEventId)?.timestamp!;

      expect(newState).to.deep.include({
        events: { [updatedEvents.id]: updatedEvents.toJSON() },
        eventsSelectedIds: [],
      });
      expect(newState).not.to.equal(currentState);
    });

    it('applies existing event time to multiple selected events', () => {
      const selectedEventId = gameEvents.eventsForTesting[0].id!;
      const anotherSelectedEventId = gameEvents.eventsForTesting[1].id!;
      currentState.eventsSelectedIds = [selectedEventId, anotherSelectedEventId];

      const existingEventId = gameEvents.eventsForTesting[4].id!;

      const newState = eventsReducer(
        currentState,
        eventUpdateRequested(
          game.id,
          [selectedEventId, anotherSelectedEventId],
          /* useExistingTime= */ true,
          existingEventId,
          undefined
        )
      );

      for (const updatedId of [selectedEventId, anotherSelectedEventId]) {
        const updatedEvent = updatedEvents.get(updatedId)!;
        updatedEvent.timestamp = updatedEvents.get(existingEventId)?.timestamp!;
      }

      expect(newState).to.deep.include({
        events: { [updatedEvents.id]: updatedEvents.toJSON() },
        eventsSelectedIds: [],
      });
      expect(newState).not.to.equal(currentState);
    });

    describe('listeners', () => {
      let store: AppStore;
      let dispatchStub: sinon.SinonSpy;
      let actionLogger: ActionLogger;

      beforeEach(() => {
        actionLogger = new ActionLogger();
        actionLogger.setup();

        currentState = buildEventState(gameEvents);

        const tempstore = setupStore(undefined, /*hydrate=*/ false);
        const configurator = getLiveSliceConfigurator();
        configurator(tempstore);

        // Shouldn't have to do this before?
        setupEventsListeners(startAppListening);
      });

      afterEach(() => {
        listenerMiddleware.clearListeners();
      });

      async function setupTestStore() {
        const liveState = buildLiveStateWithCurrentGame(game, { ...currentState });

        const root = buildRootState(undefined, liveState);
        store = setupStore(root /*buildRootState(undefined, liveState)*/, /*hydrate=*/ false);
        const configurator = getLiveSliceConfigurator();
        configurator(store);

        dispatchStub = sinon.spy(store, 'dispatch');
      }

      it('updated action is dispatched for single updated event with custom time', async () => {
        const selectedEvent = gameEvents.eventsForTesting[0];
        const selectedEventId = selectedEvent.id!;
        currentState.eventsSelectedIds = [selectedEventId];
        setupTestStore();

        // Update the selected event to 15 seconds earlier
        const customTime = new Date(selectedEvent.timestamp!);
        customTime.setSeconds(customTime.getSeconds() - 15);

        store.dispatch(
          eventUpdateRequested(
            game.id,
            [selectedEventId],
            /* useExistingTime= */ false,
            undefined,
            customTime.getTime()
          )
        );

        const updatedEvent = updatedEvents.get(selectedEventId)!;
        updatedEvent.timestamp = customTime.getTime();

        expect(dispatchStub).to.have.callCount(1);
        expect(actionLogger.lastAction()).to.deep.include(eventsUpdated(game.id, [updatedEvent]));
      });

      it('updated action is dispatched for multiple selected events with custom time', async () => {
        const selectedEvent = gameEvents.eventsForTesting[0];
        const selectedEventId = selectedEvent.id!;
        const anotherSelectedEventId = gameEvents.eventsForTesting[1].id!;
        currentState.eventsSelectedIds = [selectedEventId, anotherSelectedEventId];
        setupTestStore();

        // Update the selected event to 15 seconds earlier
        const customTime = new Date(selectedEvent.timestamp!);
        customTime.setSeconds(customTime.getSeconds() - 15);

        store.dispatch(
          eventUpdateRequested(
            game.id,
            [selectedEventId, anotherSelectedEventId],
            /* useExistingTime= */ false,
            undefined,
            customTime.getTime()
          )
        );

        const expectedEvents = [];
        for (const updatedId of [selectedEventId, anotherSelectedEventId]) {
          const updatedEvent = updatedEvents.get(updatedId)!;
          updatedEvent.timestamp = customTime.getTime();
          expectedEvents.push(updatedEvent);
        }

        expect(dispatchStub).to.have.callCount(1);
        expect(actionLogger.lastAction()).to.deep.include(eventsUpdated(game.id, expectedEvents));
      });

      it('updated action is dispatched for single selected event with existing event time', () => {
        const selectedEventId = gameEvents.eventsForTesting[0].id!;
        currentState.eventsSelectedIds = [selectedEventId];
        setupTestStore();

        const existingEventId = gameEvents.eventsForTesting[4].id!;

        store.dispatch(
          eventUpdateRequested(
            game.id,
            [selectedEventId],
            /* useExistingTime= */ true,
            existingEventId,
            undefined
          )
        );

        const updatedEvent = updatedEvents.get(selectedEventId)!;
        updatedEvent.timestamp = updatedEvents.get(existingEventId)?.timestamp!;

        expect(dispatchStub).to.have.callCount(1);
        expect(actionLogger.lastAction()).to.deep.include(eventsUpdated(game.id, [updatedEvent]));
      });

      it('updated action is dispatched for multiple selected events with existing event time', () => {
        const selectedEventId = gameEvents.eventsForTesting[0].id!;
        const anotherSelectedEventId = gameEvents.eventsForTesting[1].id!;
        currentState.eventsSelectedIds = [selectedEventId, anotherSelectedEventId];
        setupTestStore();

        const existingEventId = gameEvents.eventsForTesting[4].id!;

        store.dispatch(
          eventUpdateRequested(
            game.id,
            [selectedEventId, anotherSelectedEventId],
            /* useExistingTime= */ true,
            existingEventId,
            undefined
          )
        );

        const existingTime = updatedEvents.get(existingEventId)?.timestamp!;
        const expectedEvents = [];
        for (const updatedId of [selectedEventId, anotherSelectedEventId]) {
          const updatedEvent = updatedEvents.get(updatedId)!;
          updatedEvent.timestamp = existingTime;
          expectedEvents.push(updatedEvent);
        }

        expect(dispatchStub).to.have.callCount(1);
        expect(actionLogger.lastAction()).to.deep.include(eventsUpdated(game.id, expectedEvents));
      });
    }); // describe('listeners')
  }); // describe('event updates')
}); // describe('Events slice')
