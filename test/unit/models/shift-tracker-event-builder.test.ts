/** @format */

import { EventCollection } from '@app/models/events.js';
import { GameEvent, LiveGame, getPlayer } from '@app/models/live.js';
import { PlayerStatus } from '@app/models/player.js';
import { createShiftTrackerFromEvents } from '@app/models/shift-tracker-event-builder.js';
import { expect } from '@open-wc/testing';
import { manualTimeProvider } from '../helpers/test-clock-data.js';
import {
  buildPeriodEndEvent,
  buildPeriodStartEvent,
  buildSubEvents,
  buildSwapEvent,
} from '../helpers/test-event-data.js';
import * as testlive from '../helpers/test-live-game-data.js';
import { addShiftTrackingMatchers } from '../helpers/test-shift-data.js';

describe('createShiftTrackerFromEvents', () => {
  const startTime = new Date(2016, 0, 1, 14, 0, 0).getTime();
  const timeStartPlus5 = new Date(2016, 0, 1, 14, 0, 5).getTime();
  const timeStartPlus10 = new Date(2016, 0, 1, 14, 0, 10).getTime();
  const timeStartPlus20 = new Date(2016, 0, 1, 14, 0, 20).getTime();
  const timeStartPlus35 = new Date(2016, 0, 1, 14, 0, 35).getTime();
  const timeStartPlus1Minute55 = new Date(2016, 0, 1, 14, 1, 55).getTime();

  // Do not use in tests, created just to get positions for subs/swaps below.
  const playersForSetupOnly = testlive.getLivePlayers(18);

  // The first 11 players (ids P0 - P10) fill all the positions for the 4-3-3 formation.
  // Subs: three off players (ids P11 - P12), replace on players.
  const sub1: testlive.SubData = {
    nextId: 'P11',
    replacedId: 'P4',
  };
  const sub2: testlive.SubData = {
    nextId: 'P12',
    replacedId: 'P5',
  };
  const sub3: testlive.SubData = {
    nextId: 'P13',
    replacedId: 'P6',
    // Sub into position of player P10.
    finalPosition: playersForSetupOnly[9].currentPosition!,
  };
  // Swaps: three on players move to other positions, no overlap with subs above.
  const swap1: testlive.SubData = {
    nextId: 'P8',
    replacedId: 'P9',
    isSwap: true,
    swapNextId: 'P8_swap',
  };
  const swap2: testlive.SubData = {
    nextId: 'P9',
    replacedId: 'P10',
    isSwap: true,
    swapNextId: 'P9_swap',
  };
  // Swap player P10 into position of P6, who is replaced by sub 3 above.
  const swap3withSub3: testlive.SubData = {
    nextId: 'P10',
    replacedId: 'P6',
    isSwap: true,
    swapNextId: 'P10_swap',
  };

  let game: LiveGame;

  before(() => {
    addShiftTrackingMatchers();
  });

  beforeEach(async () => {
    game = testlive.getLiveGameWithPlayers();

    // Ensure the first 11 players are on.
    for (let i = 0; i < 11; i++) {
      const player = getPlayer(game, `P${i}`)!;
      player.status = PlayerStatus.On;
    }
  });

  it('map should be running with correct times after period start event', () => {
    const provider = manualTimeProvider(timeStartPlus5);

    const startEvent = buildPeriodStartEvent(startTime);

    const map = createShiftTrackerFromEvents(game, [startEvent], provider);

    expect(map.clockRunning, 'clock running').to.be.true;

    // No sub actually completed yet, so "replaced" is on, while "next" is still off.
    const onTracker = map.get(sub1.replacedId!);
    const offTracker = map.get(sub1.nextId);

    expect(onTracker, 'on player').to.be.running();
    expect(onTracker, 'on player').to.have.shiftTime([0, 5]);
    expect(onTracker, 'on player').to.have.shiftCount(1);
    expect(onTracker, 'on player').to.have.totalTime([0, 5]);

    expect(offTracker, 'off player').to.be.running();
    expect(offTracker, 'off player').to.have.shiftTime([0, 5]);
    expect(offTracker, 'off player').to.have.shiftCount(0);
    expect(offTracker, 'off player').to.have.totalTime([0, 0]);
  });

  it('map should be running with correct shifts after sub events', () => {
    const provider = manualTimeProvider(timeStartPlus35);

    // The order in which events are added should not matter, because
    // the times are already specified.
    const events = EventCollection.create<GameEvent>({ id: game.id });
    events.addEventGroup(buildSubEvents(timeStartPlus5, sub1).groupedEvents);
    events.addEventGroup(buildSubEvents(timeStartPlus20, sub2).groupedEvents);
    events.addEvent(buildPeriodStartEvent(startTime));

    const map = createShiftTrackerFromEvents(game, events, provider);

    // First sub
    let onTracker = map.get(sub1.nextId);
    let offTracker = map.get(sub1.replacedId!);

    expect(onTracker, 'sub 1 - on').to.be.running();
    expect(onTracker, 'sub 1 - on').to.have.shiftTime([0, 30]);
    expect(onTracker, 'sub 1 - on').to.have.shiftCount(1);
    expect(onTracker, 'sub 1 - on').to.have.totalTime([0, 30]);

    expect(offTracker, 'sub 1 - off').to.be.running();
    expect(offTracker, 'sub 1 - off').to.have.shiftTime([0, 30]);
    expect(offTracker, 'sub 1 - off').to.have.shiftCount(1);
    expect(offTracker, 'sub 1 - off').to.have.totalTime([0, 5]);

    // Second sub
    onTracker = map.get(sub2.nextId);
    offTracker = map.get(sub2.replacedId!);

    expect(onTracker, 'sub 2 - on').to.be.running();
    expect(onTracker, 'sub 2 - on').to.have.shiftTime([0, 15]);
    expect(onTracker, 'sub 2 - on').to.have.shiftCount(1);
    expect(onTracker, 'sub 2 - on').to.have.totalTime([0, 15]);

    expect(offTracker, 'sub 2 - off').to.be.running();
    expect(offTracker, 'sub 2 - off').to.have.shiftTime([0, 15]);
    expect(offTracker, 'sub 2 - off').to.have.shiftCount(1);
    expect(offTracker, 'sub 2 - off').to.have.totalTime([0, 20]);
  });

  it('map should be running with correct shifts after swap events', () => {
    const provider = manualTimeProvider(timeStartPlus35);

    // The order in which events are added should not matter, because
    // the times are already specified.
    const events = EventCollection.create<GameEvent>({ id: game.id });
    events.addEvent(buildSwapEvent(timeStartPlus5, swap1));
    events.addEvent(buildSwapEvent(timeStartPlus20, swap2));
    events.addEvent(buildPeriodStartEvent(startTime));

    const map = createShiftTrackerFromEvents(game, events, provider);

    // First swap
    let swapTracker = map.get(swap1.nextId);
    let positionTracker = map.get(swap1.replacedId!);

    expect(swapTracker, 'swap 1 - on').to.be.running();
    expect(swapTracker, 'swap 1 - on').to.have.shiftTime([0, 35]);
    expect(swapTracker, 'swap 1 - on').to.have.shiftCount(1);
    expect(swapTracker, 'swap 1 - on').to.have.totalTime([0, 35]);

    expect(positionTracker, 'swap 1 - position').to.be.running();
    expect(positionTracker, 'swap 1 - position').to.have.shiftTime([0, 35]);
    expect(positionTracker, 'swap 1 - position').to.have.shiftCount(1);
    expect(positionTracker, 'swap 1 - position').to.have.totalTime([0, 35]);

    // Second swap
    swapTracker = map.get(swap2.nextId);
    positionTracker = map.get(swap2.replacedId!);

    expect(swapTracker, 'swap 2 - on').to.be.running();
    expect(swapTracker, 'swap 2 - on').to.have.shiftTime([0, 35]);
    expect(swapTracker, 'swap 2 - on').to.have.shiftCount(1);
    expect(swapTracker, 'swap 2 - on').to.have.totalTime([0, 35]);

    expect(positionTracker, 'swap 2 - position').to.be.running();
    expect(positionTracker, 'swap 2 - position').to.have.shiftTime([0, 35]);
    expect(positionTracker, 'swap 2 - position').to.have.shiftCount(1);
    expect(positionTracker, 'swap 2 - position').to.have.totalTime([0, 35]);
  });

  it('map should be running with correct shifts after sub and swap events', () => {
    const provider = manualTimeProvider(timeStartPlus35);

    // The order in which events are added should not matter, because
    // the times are already specified.
    const events = EventCollection.create<GameEvent>({ id: game.id });
    events.addEventGroup(buildSubEvents(timeStartPlus5, sub1).groupedEvents);
    events.addEventGroup(buildSubEvents(timeStartPlus10, sub2).groupedEvents);
    events.addEvent(buildSwapEvent(timeStartPlus5, swap1));
    events.addEvent(buildSwapEvent(timeStartPlus10, swap2));
    // Sub with corresponding swap.
    events.addEventGroup(buildSubEvents(timeStartPlus20, sub3).groupedEvents);
    events.addEvent(buildSwapEvent(timeStartPlus20, swap3withSub3));
    events.addEvent(buildPeriodStartEvent(startTime));

    const map = createShiftTrackerFromEvents(game, events, provider);

    // First sub
    let onTracker = map.get(sub1.nextId);
    let offTracker = map.get(sub1.replacedId!);

    expect(onTracker, 'sub 1 - on').to.be.running();
    expect(onTracker, 'sub 1 - on').to.have.shiftTime([0, 30]);
    expect(onTracker, 'sub 1 - on').to.have.shiftCount(1);
    expect(onTracker, 'sub 1 - on').to.have.totalTime([0, 30]);

    expect(offTracker, 'sub 1 - off').to.be.running();
    expect(offTracker, 'sub 1 - off').to.have.shiftTime([0, 30]);
    expect(offTracker, 'sub 1 - off').to.have.shiftCount(1);
    expect(offTracker, 'sub 1 - off').to.have.totalTime([0, 5]);

    // First swap
    let swapTracker = map.get(swap1.nextId);
    let positionTracker = map.get(swap1.replacedId!);

    expect(swapTracker, 'swap 1 - on').to.be.running();
    expect(swapTracker, 'swap 1 - on').to.have.shiftTime([0, 35]);
    expect(swapTracker, 'swap 1 - on').to.have.shiftCount(1);
    expect(swapTracker, 'swap 1 - on').to.have.totalTime([0, 35]);

    expect(positionTracker, 'swap 1 - position').to.be.running();
    expect(positionTracker, 'swap 1 - position').to.have.shiftTime([0, 35]);
    expect(positionTracker, 'swap 1 - position').to.have.shiftCount(1);
    expect(positionTracker, 'swap 1 - position').to.have.totalTime([0, 35]);

    // Second sub
    onTracker = map.get(sub2.nextId);
    offTracker = map.get(sub2.replacedId!);

    expect(onTracker, 'sub 2 - on').to.be.running();
    expect(onTracker, 'sub 2 - on').to.have.shiftTime([0, 25]);
    expect(onTracker, 'sub 2 - on').to.have.shiftCount(1);
    expect(onTracker, 'sub 2 - on').to.have.totalTime([0, 25]);

    expect(offTracker, 'sub 2 - off').to.be.running();
    expect(offTracker, 'sub 2 - off').to.have.shiftTime([0, 25]);
    expect(offTracker, 'sub 2 - off').to.have.shiftCount(1);
    expect(offTracker, 'sub 2 - off').to.have.totalTime([0, 10]);

    // Second swap
    swapTracker = map.get(swap2.nextId);
    positionTracker = map.get(swap2.replacedId!);

    expect(swapTracker, 'swap 2 - on').to.be.running();
    expect(swapTracker, 'swap 2 - on').to.have.shiftTime([0, 35]);
    expect(swapTracker, 'swap 2 - on').to.have.shiftCount(1);
    expect(swapTracker, 'swap 2 - on').to.have.totalTime([0, 35]);

    expect(positionTracker, 'swap 2 - position').to.be.running();
    expect(positionTracker, 'swap 2 - position').to.have.shiftTime([0, 35]);
    expect(positionTracker, 'swap 2 - position').to.have.shiftCount(1);
    expect(positionTracker, 'swap 2 - position').to.have.totalTime([0, 35]);

    // Third swap + sub
    onTracker = map.get(sub3.nextId);
    offTracker = map.get(sub3.replacedId!);
    swapTracker = map.get(swap3withSub3.nextId);

    expect(onTracker, 'sub 3 - on').to.be.running();
    expect(onTracker, 'sub 3 - on').to.have.shiftTime([0, 15]);
    expect(onTracker, 'sub 3 - on').to.have.shiftCount(1);
    expect(onTracker, 'sub 3 - on').to.have.totalTime([0, 15]);

    expect(offTracker, 'sub 3 - off').to.be.running();
    expect(offTracker, 'sub 3 - off').to.have.shiftTime([0, 15]);
    expect(offTracker, 'sub 3 - off').to.have.shiftCount(1);
    expect(offTracker, 'sub 3 - off').to.have.totalTime([0, 20]);

    expect(swapTracker, 'swap 3 - on').to.be.running();
    expect(swapTracker, 'swap 3 - on').to.have.shiftTime([0, 35]);
    expect(swapTracker, 'swap 3 - on').to.have.shiftCount(1);
    expect(swapTracker, 'swap 3 - on').to.have.totalTime([0, 35]);

    // No need to check swap 3 position tracker, as this is the same player that was subbed off.
    expect(swap3withSub3.replacedId, 'swap 3 position player should be replaced in sub 3').to.equal(
      offTracker?.id,
    );
  });

  it('map should be stopped with correct times after period end event', () => {
    const provider = manualTimeProvider(timeStartPlus1Minute55);

    const startEvent = buildPeriodStartEvent(startTime);
    const endEvent = buildPeriodEndEvent(timeStartPlus35);

    const map = createShiftTrackerFromEvents(game, [startEvent, endEvent], provider);

    expect(map.clockRunning, 'clock running').to.be.false;

    // No sub actually completed yet, so "replaced" is on, while "next" is still off.
    const onTracker = map.get(sub1.replacedId!);
    const offTracker = map.get(sub1.nextId);

    expect(onTracker, 'on player').not.to.be.running();
    expect(onTracker, 'on player').to.have.shiftTime([0, 35]);
    expect(onTracker, 'on player').to.have.totalTime([0, 35]);

    expect(offTracker, 'off player').not.to.be.running();
    expect(offTracker, 'off player').to.have.shiftTime([0, 35]);
    expect(offTracker, 'off player').to.have.totalTime([0, 0]);
  });

  it('map should be stopped with correct times after subs, swaps and period end events', () => {
    const provider = manualTimeProvider(timeStartPlus1Minute55);

    // The order in which events are added should not matter, because
    // the times are already specified.
    const events = EventCollection.create<GameEvent>({ id: game.id });
    events.addEventGroup(buildSubEvents(timeStartPlus5, sub1).groupedEvents);
    events.addEventGroup(buildSubEvents(timeStartPlus10, sub2).groupedEvents);
    // Sub with corresponding swap.
    events.addEventGroup(buildSubEvents(timeStartPlus20, sub3).groupedEvents);
    events.addEvent(buildSwapEvent(timeStartPlus20, swap3withSub3));
    events.addEvent(buildPeriodStartEvent(startTime));
    events.addEvent(buildPeriodEndEvent(timeStartPlus35));

    const map = createShiftTrackerFromEvents(game, events, provider);

    expect(map.clockRunning, 'clock running').to.be.false;

    // First sub
    let onTracker = map.get(sub1.nextId);
    let offTracker = map.get(sub1.replacedId!);

    expect(onTracker, 'sub 1 - on').not.to.be.running();
    expect(onTracker, 'sub 1 - on').to.have.shiftTime([0, 30]);
    expect(onTracker, 'sub 1 - on').to.have.shiftCount(1);
    expect(onTracker, 'sub 1 - on').to.have.totalTime([0, 30]);

    expect(offTracker, 'sub 1 - off').not.to.be.running();
    expect(offTracker, 'sub 1 - off').to.have.shiftTime([0, 30]);
    expect(offTracker, 'sub 1 - off').to.have.shiftCount(1);
    expect(offTracker, 'sub 1 - off').to.have.totalTime([0, 5]);

    // Second sub
    onTracker = map.get(sub2.nextId);
    offTracker = map.get(sub2.replacedId!);

    expect(onTracker, 'sub 2 - on').not.to.be.running();
    expect(onTracker, 'sub 2 - on').to.have.shiftTime([0, 25]);
    expect(onTracker, 'sub 2 - on').to.have.shiftCount(1);
    expect(onTracker, 'sub 2 - on').to.have.totalTime([0, 25]);

    expect(offTracker, 'sub 2 - off').not.to.be.running();
    expect(offTracker, 'sub 2 - off').to.have.shiftTime([0, 25]);
    expect(offTracker, 'sub 2 - off').to.have.shiftCount(1);
    expect(offTracker, 'sub 2 - off').to.have.totalTime([0, 10]);

    // Third swap + sub
    onTracker = map.get(sub3.nextId);
    offTracker = map.get(sub3.replacedId!);
    const swapTracker = map.get(swap3withSub3.nextId);

    expect(onTracker, 'sub 3 - on').not.to.be.running();
    expect(onTracker, 'sub 3 - on').to.have.shiftTime([0, 15]);
    expect(onTracker, 'sub 3 - on').to.have.shiftCount(1);
    expect(onTracker, 'sub 3 - on').to.have.totalTime([0, 15]);

    expect(offTracker, 'sub 3 - off').not.to.be.running();
    expect(offTracker, 'sub 3 - off').to.have.shiftTime([0, 15]);
    expect(offTracker, 'sub 3 - off').to.have.shiftCount(1);
    expect(offTracker, 'sub 3 - off').to.have.totalTime([0, 20]);

    expect(swapTracker, 'swap 3 - on').not.to.be.running();
    expect(swapTracker, 'swap 3 - on').to.have.shiftTime([0, 35]);
    expect(swapTracker, 'swap 3 - on').to.have.shiftCount(1);
    expect(swapTracker, 'swap 3 - on').to.have.totalTime([0, 35]);

    // No need to check swap 3 position tracker, as this is the same player that was subbed off.
    expect(swap3withSub3.replacedId, 'swap 3 position player should be replaced in sub 3').to.equal(
      offTracker?.id,
    );
  });
}); // describe('createShiftTrackerFromEvents')
