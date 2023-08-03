/** @format */

import { LiveGame, getPlayer } from '@app/models/live.js';
import { PlayerStatus } from '@app/models/player.js';
import { createShiftTrackerFromEvents } from '@app/models/shift-tracker-event-builder.js';
import { expect } from '@open-wc/testing';
import { manualTimeProvider } from '../helpers/test-clock-data.js';
import { buildPeriodEndEvent, buildPeriodStartEvent } from '../helpers/test-event-data.js';
import * as testlive from '../helpers/test-live-game-data.js';
import { addShiftTrackingMatchers } from '../helpers/test-shift-data.js';

describe('createShiftTrackerFromEvents', () => {
  const startTime = new Date(2016, 0, 1, 14, 0, 0).getTime();
  const timeStartPlus5 = new Date(2016, 0, 1, 14, 0, 5).getTime();
  // const timeStartPlus10 = new Date(2016, 0, 1, 14, 0, 10).getTime();
  // const timeStartPlus20 = new Date(2016, 0, 1, 14, 0, 20).getTime();
  const timeStartPlus35 = new Date(2016, 0, 1, 14, 0, 35).getTime();
  const timeStartPlus1Minute55 = new Date(2016, 0, 1, 14, 1, 55).getTime();

  // The first 11 players (ids P0 - P10) fill all the positions for the 4-3-3 formation.
  // Subs: three off players (ids P11 - P12), replace on players.
  const sub1: testlive.SubData = {
    nextId: 'P11',
    replacedId: 'P4',
  };
  // const sub2: testlive.SubData = {
  //   nextId: 'P12',
  //   replacedId: 'P5',
  // };
  // const sub3: testlive.SubData = {
  //   nextId: 'P13',
  //   replacedId: 'P6',
  // };

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
}); // describe('createShiftTrackerFromEvents')
