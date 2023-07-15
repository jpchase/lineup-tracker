/** @format */

import { EventCollection } from '@app/models/events.js';
import { FormationType, Position } from '@app/models/formation.js';
import { GameEvent, GameEventType, LiveGame, LivePlayer, getPlayer } from '@app/models/live.js';
import { PlayerStatus } from '@app/models/player.js';
import {
  EVENTS_INITIAL_STATE,
  EventState,
  eventsReducer as events,
} from '@app/slices/live/events-slice.js';
import { actions } from '@app/slices/live/live-slice.js';
import { expect } from '@open-wc/testing';
import sinon from 'sinon';
import { selectPlayers } from '../../helpers/live-state-setup.js';
import { mockCurrentTime, mockTimeProvider } from '../../helpers/test-clock-data.js';
import * as testlive from '../../helpers/test-live-game-data.js';

const { applyPendingSubs, gameSetupCompleted, startPeriod } = actions;

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
      expectedCollection.addEvent<GameEvent>({
        type: GameEventType.Setup,
        timestamp: startTime,
        data: {},
      });

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
      // const rosterPlayers = testlive.getLivePlayers(18);
      const game = testlive.getLiveGame(rosterPlayers);
      const expectedCollection = EventCollection.create(
        {
          id: game.id,
        },
        timeProvider
      );
      expectedCollection.addEvent<GameEvent>({
        type: GameEventType.StartPeriod,
        timestamp: startTime,
        data: {
          clock: {
            currentPeriod: 1,
            startTime,
          },
        },
      });

      expect(currentState.events, 'events should be empty').to.not.be.ok;

      const newState = events(
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
      // const rosterPlayers = testlive.getLivePlayers(18);
      const game = testlive.getLiveGame(rosterPlayers);
      const expectedCollection = EventCollection.create(
        {
          id: game.id,
        },
        timeProvider
      );
      expectedCollection.addEvent<GameEvent>({
        type: GameEventType.StartPeriod,
        timestamp: startTime,
        data: {
          clock: {
            currentPeriod: 2,
            startTime,
          },
        },
      });
      expect(currentState.events, 'events should be empty').to.not.be.ok;

      const newState = events(
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

      const newState = events(currentState, startPeriod(gameId, /*gameAllowsStart=*/ false));

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

    function setupSubState(subs: SubData[] /*, game?: LiveGame*/) {
      const game = testlive.getLiveGameWithPlayers();
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
          sub.expectedFinalPosition = positionPlayer.currentPosition;
          game.players?.push(nextPlayer);
          continue;
        }

        // Usual sub
        const nextPlayer = getPlayer(game, sub.nextId)!;
        const onPlayer = getPlayer(game, sub.replacedId!)!;

        testlive.setupSub(nextPlayer, onPlayer, sub.positionOverride);
        sub.expectedFinalPosition = nextPlayer.currentPosition!;
      }

      // currentState = buildLiveStateWithCurrentGame(game, {
      //   shift: buildShiftWithTrackersFromGame(game, true),
      // });
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

    // function getReplacedIds(subs: SubData[]): string[] {
    //   return subs.map((input) => input.replacedId!);
    // }

    function getPlayersByIds(game: LiveGame, ids: string[]) {
      return game.players?.filter((player) => ids.includes(player.id)) || [];
    }

    it('should store sub applied events for all next subs, when not selectedOnly', () => {
      fakeClock = mockCurrentTime(startTime);
      const timeProvider = mockTimeProvider(startTime);
      const subs = buildSubs(sub1, sub2, sub3);
      const game = setupSubState(subs);

      const expectedCollection = EventCollection.create(
        {
          id: game.id,
        },
        timeProvider
      );
      // There should be a pair of sub in/out events for each of
      // the three subs.
      for (const sub of subs) {
        expectedCollection.addEvent<GameEvent>({
          type: GameEventType.SubIn,
          timestamp: startTime,
          playerId: sub.nextId,
          data: {
            replaced: sub.replacedId,
            position: sub.expectedFinalPosition?.id,
          },
        } as GameEvent);
        expectedCollection.addEvent<GameEvent>({
          type: GameEventType.SubOut,
          timestamp: startTime,
          playerId: sub.replacedId,
          data: {},
        });
      }

      const newState = events(
        currentState,
        applyPendingSubs(gameId, getPlayersByIds(game, getNextIds(subs)))
      );

      expect(newState).to.deep.include({
        events: { [expectedCollection.id]: expectedCollection.toJSON() },
      });
      expect(newState).not.to.equal(currentState);
    });

    it('should store sub applied events for all next swaps, when not selectedOnly', () => {
      fakeClock = mockCurrentTime(startTime);
      const timeProvider = mockTimeProvider(startTime);
      const swaps = buildSubs(swap1, swap2, swap3);
      const game = setupSubState(swaps);

      const expectedCollection = EventCollection.create(
        {
          id: game.id,
        },
        timeProvider
      );
      for (const swap of swaps) {
        expectedCollection.addEvent<GameEvent>({
          type: GameEventType.Swap,
          timestamp: startTime,
          playerId: swap.nextId,
          data: {
            position: swap.expectedFinalPosition?.id,
          },
        } as GameEvent);
      }

      const newState = events(
        currentState,
        applyPendingSubs(gameId, getPlayersByIds(game, getSwapNextIds(swaps)))
      );

      expect(newState).to.deep.include({
        events: { [expectedCollection.id]: expectedCollection.toJSON() },
      });
      expect(newState).not.to.equal(currentState);
    });

    it('should store sub applied events for only selected next subs', () => {
      fakeClock = mockCurrentTime(startTime);
      const timeProvider = mockTimeProvider(startTime);

      const selectedSubs = [sub1, sub3];
      const remainingSubs = [sub2];
      const subs = buildSubs(...selectedSubs, ...remainingSubs);
      const game = setupSubState(subs);

      // Apply 2 of the 3 pending subs (> 1 to test it will actually handle multiple, not just first)
      const nowPlayingIds = getNextIds(selectedSubs);
      selectPlayers(game, nowPlayingIds, true);

      const expectedCollection = EventCollection.create(
        {
          id: game.id,
        },
        timeProvider
      );
      // There should be a pair of sub in/out events for each of
      // the selected subs.
      for (const sub of subs) {
        if (!nowPlayingIds.includes(sub.nextId)) {
          continue;
        }
        expectedCollection.addEvent<GameEvent>({
          type: GameEventType.SubIn,
          timestamp: startTime,
          playerId: sub.nextId,
          data: {
            replaced: sub.replacedId,
            position: sub.expectedFinalPosition?.id,
          },
        } as GameEvent);
        expectedCollection.addEvent<GameEvent>({
          type: GameEventType.SubOut,
          timestamp: startTime,
          playerId: sub.replacedId,
          data: {},
        });
      }

      const newState = events(
        currentState,
        applyPendingSubs(gameId, getPlayersByIds(game, nowPlayingIds))
      );

      expect(newState).to.deep.include({
        events: { [expectedCollection.id]: expectedCollection.toJSON() },
      });
      expect(newState).not.to.equal(currentState);
    });

    it('should store sub applied events for only selected next swaps', () => {
      fakeClock = mockCurrentTime(startTime);
      const timeProvider = mockTimeProvider(startTime);
      const selectedSwaps = [swap1, swap3];
      const remainingSwaps = [swap2];
      const swaps = buildSubs(...selectedSwaps, ...remainingSwaps);
      const game = setupSubState(swaps);

      // Apply 2 of the 3 pending swaps (> 1 to test it will actually handle multiple, not just first)
      const swappedNextIds = getSwapNextIds(selectedSwaps);
      selectPlayers(game, swappedNextIds, true);

      const expectedCollection = EventCollection.create(
        {
          id: game.id,
        },
        timeProvider
      );
      const nowSwappedIds = getNextIds(selectedSwaps);
      for (const swap of swaps) {
        if (!nowSwappedIds.includes(swap.nextId)) {
          continue;
        }
        expectedCollection.addEvent<GameEvent>({
          type: GameEventType.Swap,
          timestamp: startTime,
          playerId: swap.nextId,
          data: {
            position: swap.expectedFinalPosition?.id,
          },
        } as GameEvent);
      }

      const newState = events(
        currentState,
        applyPendingSubs(gameId, getPlayersByIds(game, swappedNextIds))
      );

      expect(newState).to.deep.include({
        events: { [expectedCollection.id]: expectedCollection.toJSON() },
      });
      expect(newState).not.to.equal(currentState);
    });
  }); // describe('live/applyPendingSubs')
}); // describe('Events slice')
