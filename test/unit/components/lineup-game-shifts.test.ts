import '@app/components/lineup-game-shifts.js';
import { LineupGameShifts } from '@app/components/lineup-game-shifts.js';
import { Duration } from '@app/models/clock.js';
import { expect, fixture } from '@open-wc/testing';
import sinon from 'sinon';
import * as testlive from '../helpers/test-live-game-data.js';
import { buildPlayerTrackerMap } from '../helpers/test-shift-data.js';

describe('lineup-game-shifts tests', () => {
  let el: LineupGameShifts;
  let fakeClock: sinon.SinonFakeTimers;
  const startTime = new Date(2016, 0, 1, 14, 0, 0).getTime();

  beforeEach(async () => {
    el = await fixture('<lineup-game-shifts></lineup-game-shifts>');
  });

  afterEach(async () => {
    if (fakeClock) {
      fakeClock.restore();
    }
  });

  function mockCurrentTime(t0: number) {
    fakeClock = sinon.useFakeTimers({ now: t0 });
  }

  function getShiftRows() {
    const items = el.shadowRoot!.querySelectorAll('#live-playing-time tr');
    return items;
  }

  it('renders shift table', async () => {
    const players = testlive.getLivePlayers(18);
    const trackerMap = buildPlayerTrackerMap(players);

    el.players = players;
    el.trackerData = trackerMap.toJSON();
    await el.updateComplete;

    const items = getShiftRows();
    expect(items.length).to.equal(players.length, 'Rendered player count');

    let index = 0;
    const sortedPlayers = players!.sort((a, b) => a.name.localeCompare(b.name));
    for (const player of sortedPlayers) {
      const tracker = trackerMap.get(player.id)!;
      expect(tracker).to.exist;

      const row = (items[index] as HTMLTableRowElement)!;
      index++;

      expect(row.dataset.rowId).to.equal(player.id, 'Row id should match player id');

      const nameElement = row.cells[0];
      expect(nameElement, 'Missing name element').to.exist;
      expect(nameElement!.textContent).to.equal(player.name, 'Player name');

      const shiftCountElement = row.cells[1];
      expect(shiftCountElement, 'Missing shift count element').to.exist;
      expect(shiftCountElement!.textContent).to.equal(`${tracker.shiftCount}`, 'Shift count');

      const totalTimeElement = row.cells[2];
      expect(totalTimeElement, 'Missing total time element').to.exist;
      expect(totalTimeElement!.textContent).to.equal(Duration.format(tracker.getTotalTime()), 'Total time');
    }
    await expect(el).shadowDom.to.equalSnapshot();
    await expect(el).to.be.accessible();
  });

  it('updates shift times when clock is running', async () => {
    mockCurrentTime(startTime);
    const players = testlive.getLivePlayers(18);
    const trackerMap = buildPlayerTrackerMap(players);
    trackerMap.startShiftTimers();

    el.players = players;
    el.trackerData = trackerMap.toJSON();
    await el.updateComplete;

    // Advance the clock by just over a minute, and allow timers to run to update.
    // The displayed time will be a multiple of 10 seconds, at that is the update
    // interval. However, the clock is advanced one second less, because there
    // seems to be an extra update interval.
    const elapsedSeconds = 70;
    fakeClock.tick((elapsedSeconds - 1) * 1000);
    fakeClock.next();
    await el.updateComplete;

    const items = getShiftRows();
    expect(items.length).to.equal(players.length, 'Rendered player count');

    for (let index = 0; index < items.length; index++) {
      const row = (items[index] as HTMLTableRowElement)!;

      const tracker = trackerMap.get(row.dataset.rowId!)!;
      expect(tracker).to.exist;

      // Players that are on should have total time that matches the clock elapsed time.
      const expectedTotalTime = tracker.isOn ? Duration.create(elapsedSeconds) : Duration.zero();

      const totalTimeElement = row.cells[2];
      expect(totalTimeElement, 'Missing total time element').to.exist;
      expect(totalTimeElement!.textContent).to.equal(
        Duration.format(expectedTotalTime), `Total time for ${tracker.id}`);
    }
  });

  it('a11y', async () => {
    await expect(el).to.be.accessible();
  });
});
