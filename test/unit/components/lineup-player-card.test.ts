/** @format */

import { EVENT_PLAYERSELECTED, EVENT_POSITIONSELECTED } from '@app/components/events';
import { LineupPlayerCard, PlayerCardData } from '@app/components/lineup-player-card';
import '@app/components/lineup-player-card.js';
import { SynchronizedTimerNotifier } from '@app/components/synchronized-timer.js';
import { Duration } from '@app/models/clock.js';
import { formatPosition } from '@app/models/formation.js';
import { LivePlayer } from '@app/models/live.js';
import { PlayerStatus } from '@app/models/player';
import { PlayerTimeTracker } from '@app/models/shift.js';
import { assert, expect, fixture, oneEvent } from '@open-wc/testing';
import sinon from 'sinon';
import { buildPlayerResolverParentNode } from '../helpers/mock-player-resolver.js';
import { mockTimerContext } from '../helpers/mock-timer-context.js';
import { manualTimeProvider } from '../helpers/test-clock-data.js';
import { buildPlayerTracker } from '../helpers/test-shift-data.js';

describe('lineup-player-card tests', () => {
  let el: LineupPlayerCard;
  let fakeClock: sinon.SinonFakeTimers;
  let timerNotifier: SynchronizedTimerNotifier;

  beforeEach(async () => {
    // Wire up a node that will handle context requests for a PlayerResolver.
    const parentNode = buildPlayerResolverParentNode({
      getPlayer: (playerId) => {
        let player: LivePlayer | undefined;
        if (playerId === 'OnPlayerToBeReplaced') {
          player = {
            id: playerId,
            name: 'Player To Be Replaced',
            uniformNumber: 94,
            positions: ['OM'],
            status: PlayerStatus.On,
          };
        }
        return player;
      },
    });

    // Handle context requests for a time notifier.
    timerNotifier = new SynchronizedTimerNotifier();
    mockTimerContext(parentNode, timerNotifier);

    el = await fixture('<lineup-player-card></lineup-player-card>', { parentNode });
  });

  afterEach(async () => {
    if (fakeClock) {
      fakeClock.restore();
    }
  });

  function getPlayer(): LivePlayer {
    return {
      id: 'AC',
      name: 'Amanda',
      uniformNumber: 2,
      positions: ['CB', 'FB', 'HM'],
      status: PlayerStatus.Off,
    };
  }

  function getCardData(player?: LivePlayer) {
    const data: PlayerCardData = {
      id: 'test',
      position: { id: 'HM', type: 'HM' },
    };
    if (player) {
      data.player = player;
    }
    return data;
  }

  function getVisibility(element: Element) {
    return getComputedStyle(element, null).display;
  }

  function expectVisibility(element: Element | null, visibility: string, desc: string) {
    expect(element, desc).to.be.ok;
    const display = getVisibility(element!);
    expect(display).to.equal(visibility, desc);
  }

  function getPlayerElement(): HTMLDivElement {
    const playerElement = el.shadowRoot!.querySelector('.player');
    assert.isOk(playerElement, 'Missing main element for player');

    return playerElement as HTMLDivElement;
  }

  function getShiftTimeText(shiftElement: HTMLElement): string {
    const textNodes = Array.from(shiftElement.childNodes) // has childNodes inside, including text ones
      .filter((child) => child.nodeType === 3) // get only text nodes
      .filter((child) => child.textContent?.trim()) // eliminate empty text
      .map((textNode) => textNode.textContent);
    expect(textNodes, 'shiftTime should only have one text node').to.have.length(1);
    return textNodes[0]!;
  }

  function verifyPlayerElements(inputPlayer: LivePlayer) {
    const playerElement = getPlayerElement();

    const numberElement = playerElement.querySelector('.uniformNumber');
    assert.isOk(numberElement, 'Missing number element');
    assert.equal(numberElement!.textContent, `${inputPlayer.uniformNumber}`);

    const nameElement = playerElement.querySelector('.playerName');
    assert.isOk(nameElement, 'Missing name element');
    assert.equal(nameElement!.textContent, inputPlayer.name);

    return playerElement;
  }

  function verifySelected() {
    const playerElement = getPlayerElement();

    expect(playerElement!.hasAttribute('selected'), 'Should have selected attribute').to.be.true;
  }

  function mockCurrentTime(t0: number) {
    fakeClock = sinon.useFakeTimers({ now: t0 });
  }

  it('starts empty', async () => {
    assert.equal(el.mode, '');
    assert.equal(el.selected, false);
    assert.equal(el.data, undefined);
    assert.equal(el.player, undefined);
    await expect(el).shadowDom.to.equalSnapshot();
  });

  it('uses selected value set directly by property', async () => {
    expect(el.selected, 'Card should initially not be selected').to.be.false;
    el.selected = true;
    await el.updateComplete;
    expect(el.selected, 'Card should be selected').to.be.true;
  });

  it('renders selected from player property', async () => {
    const player = getPlayer();
    player.selected = true;
    el.selected = false;
    el.player = player;
    await el.updateComplete;

    expect(el.selected, 'Card should be selected').to.be.true;

    verifySelected();
  });

  it('renders selected from data.player property', async () => {
    const player = getPlayer();
    player.selected = true;
    const data = getCardData(player);
    el.selected = false;
    el.data = data;
    await el.updateComplete;

    expect(el.selected, 'Card should be selected').to.be.true;

    verifySelected();
  });

  it('renders data properties without player', async () => {
    const data = getCardData();
    el.data = data;
    await el.updateComplete;

    const playerElement = getPlayerElement();

    const positionElement = playerElement.querySelector('.currentPosition');
    assert.isOk(positionElement, 'Missing currentPosition element');
    assert.equal(positionElement!.textContent, data.position.type);
    await expect(el).shadowDom.to.equalSnapshot();
  });

  it('renders selected from data.position without player', async () => {
    const data = getCardData();
    data.position.selected = true;
    el.selected = false;
    el.data = data;
    await el.updateComplete;

    expect(el.selected, 'Card should be selected').to.be.true;

    verifySelected();
  });

  it('renders selected from data.position with player not selected', async () => {
    const player = getPlayer();
    player.selected = false;
    const data = getCardData(player);
    data.position.selected = true;
    el.selected = false;
    el.data = data;
    await el.updateComplete;

    expect(el.selected, 'Card should be selected').to.be.true;

    verifySelected();
  });

  it('fires event when player selected', async () => {
    const player = getPlayer();
    el.player = player;
    await el.updateComplete;

    const playerElement = getPlayerElement();
    setTimeout(() => playerElement.click());

    const { detail } = await oneEvent(el, EVENT_PLAYERSELECTED);

    assert.deepEqual(detail.player, player);
    assert.isTrue(detail.selected, 'Card should now be selected');
  });

  it('fires event when player de-selected', async () => {
    const player = getPlayer();
    el.player = player;
    el.selected = true;
    await el.updateComplete;

    const playerElement = getPlayerElement();
    setTimeout(() => playerElement.click());

    const { detail } = await oneEvent(el, EVENT_PLAYERSELECTED);

    assert.deepEqual(detail.player, player);
    assert.isFalse(detail.selected, 'Card should no longer be selected');
  });

  it('fires event when position selected with data', async () => {
    const data = getCardData();
    el.data = data;
    await el.updateComplete;

    const playerElement = getPlayerElement();
    setTimeout(() => playerElement.click());

    const { detail } = await oneEvent(el, EVENT_POSITIONSELECTED);

    assert.equal(detail.player, undefined, 'Event should not provide a player');
    assert.equal(detail.position, data.position, 'Event should provide position');
    assert.isTrue(detail.selected, 'Card should now be selected');
  });

  it('fires event when position de-selected with data', async () => {
    const data = getCardData();
    el.data = data;
    el.selected = true;
    await el.updateComplete;

    const playerElement = getPlayerElement();
    setTimeout(() => playerElement.click());

    const { detail } = await oneEvent(el, EVENT_POSITIONSELECTED);

    assert.equal(detail.player, undefined, 'Event should not provide a player');
    assert.equal(detail.position, data.position, 'Event should provide position');
    assert.isFalse(detail.selected, 'Card should no longer be selected');
  });

  it('fires event when position selected with data and player', async () => {
    const data = getCardData();
    const player = getPlayer();
    data.player = player;
    el.data = data;
    await el.updateComplete;

    const playerElement = getPlayerElement();
    setTimeout(() => playerElement.click());

    const { detail } = await oneEvent(el, EVENT_POSITIONSELECTED);

    assert.equal(detail.player, data.player, 'Event should provide player');
    assert.equal(detail.position, data.position, 'Event should provide position');
    assert.isTrue(detail.selected, 'Card should now be selected');
  });

  it('fires event when position de-selected with data and player', async () => {
    const data = getCardData();
    const player = getPlayer();
    data.player = player;
    el.data = data;
    el.selected = true;
    await el.updateComplete;

    const playerElement = getPlayerElement();
    setTimeout(() => playerElement.click());

    const { detail } = await oneEvent(el, EVENT_POSITIONSELECTED);

    assert.equal(detail.player, data.player, 'Event should provide player');
    assert.equal(detail.position, data.position, 'Event should provide position');
    assert.isFalse(detail.selected, 'Card should no longer be selected');
  });

  const modeTests = [
    {
      playerStatus: PlayerStatus.On,
      currentPosition: { id: 'RCB', type: 'CB' },
      currentPositionVisible: true,
      positionsVisible: false,
      subForVisible: false,
      shiftVisible: true,
    },
    {
      playerStatus: PlayerStatus.Next,
      currentPosition: { id: 'HM1', type: 'HM' },
      currentPositionVisible: true,
      positionsVisible: false,
      subForId: 'OnPlayerToBeReplaced',
      subForExpected: '-> Player To Be Replaced',
      subForVisible: true,
      shiftVisible: true,
    },
    {
      playerStatus: PlayerStatus.Off,
      currentPositionVisible: false,
      positionsVisible: true,
      subForVisible: false,
      shiftVisible: true,
    },
    {
      playerStatus: PlayerStatus.Out,
      currentPositionVisible: false,
      positionsVisible: false,
      subForVisible: false,
      shiftVisible: false,
    },
  ];

  for (const modeTest of modeTests) {
    const startTime = new Date(2016, 0, 1, 14, 0, 0).getTime();
    const time1 = new Date(2016, 0, 1, 14, 1, 5).getTime();
    const testPrefix = `mode [${modeTest.playerStatus}]`;

    function buildModeTestPlayer() {
      const player = getPlayer();
      player.status = modeTest.playerStatus;
      player.currentPosition = modeTest.currentPosition;
      player.replaces = modeTest.subForId;

      // Set up to have a 1:05 shift.
      const timeProvider = manualTimeProvider(startTime);
      const timeTracker = new PlayerTimeTracker(buildPlayerTracker(player), timeProvider);
      timeTracker.startShift();
      timeProvider.setCurrentTime(time1);
      timeTracker.stopShift();

      return { player, timeTracker };
    }

    async function testModeRender(player: LivePlayer, _timeTracker: PlayerTimeTracker) {
      expect(el.selected, 'Card should not be selected').to.be.false;

      const playerElement = verifyPlayerElements(player);

      const currentPositionElement = playerElement.querySelector('.currentPosition');
      expectVisibility(
        currentPositionElement,
        modeTest.currentPositionVisible ? 'inline' : 'none',
        'currentPosition element'
      );
      if (modeTest.currentPositionVisible) {
        expect(player.currentPosition, 'player.currentPosition').to.be.ok;
        expect(currentPositionElement?.textContent).to.equal(
          formatPosition(player.currentPosition!),
          'currentPosition element'
        );
      }

      const subForElement = playerElement.querySelector('.subFor');
      expectVisibility(subForElement, modeTest.subForVisible ? 'inline' : 'none', 'subFor element');
      if (modeTest.subForVisible) {
        expect(subForElement?.textContent).to.equal(modeTest.subForExpected, 'subFor element');
      }

      const positionsElement = playerElement.querySelector('.playerPositions');
      expectVisibility(
        positionsElement,
        modeTest.positionsVisible ? 'inline' : 'none',
        'playerPositions element'
      );
      if (modeTest.positionsVisible) {
        expect(positionsElement?.textContent).to.equal(
          player?.positions.join(', '),
          'playerPositions element'
        );
      }

      const shiftElement = playerElement.querySelector('.shiftTime') as HTMLElement;
      expectVisibility(shiftElement, modeTest.shiftVisible ? 'block' : 'none', 'shiftTime element');
      if (modeTest.shiftVisible) {
        // Shift time is 1:05 (65 seconds).
        expect(getShiftTimeText(shiftElement)).to.equal(
          Duration.format(Duration.create(65)),
          'shiftTime element'
        );
      }

      await expect(el).shadowDom.to.equalSnapshot();
      await expect(el).to.be.accessible();
    }

    it(`${testPrefix}: renders player properties`, async () => {
      const { player, timeTracker } = buildModeTestPlayer();
      el.player = player;
      el.mode = player.status;
      el.timeTracker = timeTracker;
      await el.updateComplete;

      await testModeRender(player, timeTracker);
    });

    it(`${testPrefix}: renders data.player properties`, async () => {
      const { player, timeTracker } = buildModeTestPlayer();
      const data = getCardData(player);
      el.data = data;
      el.mode = player.status;
      el.timeTracker = timeTracker;
      await el.updateComplete;

      await testModeRender(player, timeTracker);
    });

    if (modeTest.playerStatus !== PlayerStatus.Out) {
      it(`${testPrefix}: updates shift times when clock is running`, async () => {
        mockCurrentTime(startTime);

        const { player } = buildModeTestPlayer();
        const timeTracker = new PlayerTimeTracker(buildPlayerTracker(player));
        timeTracker.startShift();

        el.player = player;
        el.mode = player.status;
        el.timeTracker = timeTracker;
        await el.updateComplete;

        // Advance the clock by just over a minute, and simulate the synchronized timer
        // running to update. The displayed time will be a multiple of 10 seconds, as
        // that is the update interval.
        const elapsedSeconds = 70;
        fakeClock.tick(elapsedSeconds * 1000);
        fakeClock.next();
        timerNotifier.notifyTimers();
        await el.updateComplete;

        const playerElement = verifyPlayerElements(player);
        const shiftElement = playerElement.querySelector('.shiftTime') as HTMLElement;
        expect(getShiftTimeText(shiftElement)).to.equal(
          Duration.format(Duration.create(elapsedSeconds)),
          'shiftTime element'
        );
      });
    }

    if (modeTest.playerStatus === PlayerStatus.Next) {
      it(`${testPrefix}: renders swap properties`, async () => {
        const { player, timeTracker } = buildModeTestPlayer();
        player.isSwap = true;
        player.nextPosition = { id: 'RCB', type: 'CB' };
        el.player = player;
        el.mode = player.status;
        el.timeTracker = timeTracker;
        await el.updateComplete;

        expect(player.currentPosition).to.not.deep.equal(
          player.nextPosition,
          'Swap should have different current and next positions'
        );

        const playerElement = verifyPlayerElements(player);

        const currentPositionElement = playerElement.querySelector('.currentPosition');
        expectVisibility(currentPositionElement, 'inline', 'currentPosition element');
        expect(player.currentPosition, 'player.currentPosition').to.be.ok;
        expect(currentPositionElement?.textContent).to.equal(
          formatPosition(player.nextPosition!),
          'currentPosition element'
        );

        const subForElement = playerElement.querySelector('.subFor');
        expectVisibility(subForElement, 'none', 'subFor element');
      });
    }
  } // mode tests
}); // describe('lineup-player-card tests'
