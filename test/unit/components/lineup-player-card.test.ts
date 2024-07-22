/** @format */

import {
  LineupPlayerCard,
  PlayerCardData,
  PlayerSelectedEvent,
  PositionSelectedEvent,
} from '@app/components/lineup-player-card';
import '@app/components/lineup-player-card.js';
import { SynchronizedTimerNotifier } from '@app/components/synchronized-timer.js';
import { Duration } from '@app/models/clock.js';
import { Position, formatPosition } from '@app/models/formation.js';
import { LivePlayer } from '@app/models/live.js';
import { PlayerStatus } from '@app/models/player';
import { PlayerTimeTracker } from '@app/models/shift.js';
import { expect, fixture, html, oneEvent } from '@open-wc/testing';
import sinon from 'sinon';
import { addElementAssertions } from '../helpers/element-assertions.js';
import { buildPlayerResolverParentNode } from '../helpers/mock-player-resolver.js';
import { mockTimerContext } from '../helpers/mock-timer-context.js';
import { manualTimeProvider } from '../helpers/test-clock-data.js';
import { buildPlayerTracker } from '../helpers/test-shift-data.js';

describe('lineup-player-card tests', () => {
  let el: LineupPlayerCard;
  let fakeClock: sinon.SinonFakeTimers;
  let timerNotifier: SynchronizedTimerNotifier;
  const startTime = new Date(2016, 0, 1, 14, 0, 0).getTime();
  const timeStartPlus1Minute5 = new Date(2016, 0, 1, 14, 1, 5).getTime();

  before(async () => {
    addElementAssertions();
  });

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

    el = await fixture(html`<lineup-player-card></lineup-player-card>`, { parentNode });
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

  function getPlayerElement(): HTMLDivElement {
    const playerElement = el.shadowRoot!.querySelector('.player');
    expect(playerElement, 'Missing main element for player').to.be.ok;

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
    expect(numberElement, 'Missing number element').to.be.ok;
    expect(numberElement!.textContent).to.equal(`${inputPlayer.uniformNumber}`);

    const nameElement = playerElement.querySelector('.playerName');
    expect(nameElement, 'Missing name element').to.be.ok;
    expect(nameElement!.textContent).to.equal(inputPlayer.name);

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
    expect(el.mode).to.equal('');
    expect(el.selected, 'selected property').to.be.false;
    expect(el.data, 'data property').not.to.be.ok;
    expect(el.player, 'player property').not.to.be.ok;
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
    expect(positionElement, 'Missing currentPosition element').to.be.ok;
    expect(positionElement!.textContent).to.equal(data.position.type);
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

    const { detail } = (await oneEvent(el, PlayerSelectedEvent.eventName)) as PlayerSelectedEvent;

    expect(detail.player).to.deep.equal(player);
    expect(detail.selected, 'Card should now be selected').to.be.true;
  });

  it('fires event when player de-selected', async () => {
    const player = getPlayer();
    el.player = player;
    el.selected = true;
    await el.updateComplete;

    const playerElement = getPlayerElement();
    setTimeout(() => playerElement.click());

    const { detail } = (await oneEvent(el, PlayerSelectedEvent.eventName)) as PlayerSelectedEvent;

    expect(detail.player).to.deep.equal(player);
    expect(detail.selected, 'Card should no longer be selected').to.be.false;
  });

  it('fires event when position selected with data', async () => {
    const data = getCardData();
    el.data = data;
    await el.updateComplete;

    const playerElement = getPlayerElement();
    setTimeout(() => playerElement.click());

    const { detail } = (await oneEvent(
      el,
      PositionSelectedEvent.eventName,
    )) as PositionSelectedEvent;

    expect(detail.player, 'Event should not provide a player').not.to.be.ok;
    expect(detail.position, 'Event should provide position').to.equal(data.position);
    expect(detail.selected, 'Card should now be selected').to.be.true;
  });

  it('fires event when position de-selected with data', async () => {
    const data = getCardData();
    el.data = data;
    el.selected = true;
    await el.updateComplete;

    const playerElement = getPlayerElement();
    setTimeout(() => playerElement.click());

    const { detail } = (await oneEvent(
      el,
      PositionSelectedEvent.eventName,
    )) as PositionSelectedEvent;

    expect(detail.player, 'Event should not provide a player').not.to.be.ok;
    expect(detail.position).to.equal(data.position, 'Event should provide position');
    expect(detail.selected, 'Card should no longer be selected').to.be.false;
  });

  it('fires event when position selected with data and player', async () => {
    const data = getCardData();
    const player = getPlayer();
    data.player = player;
    el.data = data;
    await el.updateComplete;

    const playerElement = getPlayerElement();
    setTimeout(() => playerElement.click());

    const { detail } = (await oneEvent(
      el,
      PositionSelectedEvent.eventName,
    )) as PositionSelectedEvent;

    expect(detail.player, 'Event should provide player').to.equal(data.player);
    expect(detail.position, 'Event should provide position').to.equal(data.position);
    expect(detail.selected, 'Card should now be selected').to.be.true;
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

    const { detail } = (await oneEvent(
      el,
      PositionSelectedEvent.eventName,
    )) as PositionSelectedEvent;

    expect(detail.player, 'Event should provide player').to.equal(data.player);
    expect(detail.position, 'Event should provide position').to.equal(data.position);
    expect(detail.selected, 'Card should no longer be selected').to.be.false;
  });

  interface ModeTest {
    playerStatus: PlayerStatus;
    currentPosition?: Position;
    currentPositionVisible: boolean;
    positionsVisible: boolean;
    subForId?: string;
    subForExpected?: string;
    subForVisible: boolean;
    shiftVisible: boolean;
    verifyRender?: (currentPositionElement: HTMLElement) => void;
  }

  const modeTests: ModeTest[] = [
    {
      playerStatus: PlayerStatus.On,
      currentPosition: { id: 'RCB', type: 'CB' },
      // Visible elements
      currentPositionVisible: true,
      shiftVisible: true,
      // Hidden elements
      positionsVisible: false,
      subForVisible: false,
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
    const testPrefix = `mode [${modeTest.playerStatus}]`;

    function buildModeTestPlayer(
      status: PlayerStatus,
      currentPosition?: Position,
      subForId?: string,
    ) {
      const player = getPlayer();
      player.status = status;
      player.currentPosition = currentPosition;
      player.replaces = subForId;

      // Set up to have a 1:05 shift.
      const timeProvider = manualTimeProvider(startTime);
      const timeTracker = new PlayerTimeTracker(buildPlayerTracker(player), timeProvider);
      timeTracker.startShift();
      timeProvider.setCurrentTime(timeStartPlus1Minute5);
      timeTracker.stopShift();

      return { player, timeTracker };
    }

    async function testModeRender(player: LivePlayer, _timeTracker: PlayerTimeTracker) {
      expect(el.selected, 'Card should not be selected').to.be.false;

      const playerElement = verifyPlayerElements(player);

      const currentPositionElement = playerElement.querySelector('.currentPosition');
      if (modeTest.currentPositionVisible) {
        expect(currentPositionElement, 'currentPosition').to.be.shown;

        expect(player.currentPosition, 'player.currentPosition').to.be.ok;
        expect(currentPositionElement?.textContent).to.equal(
          formatPosition(player.currentPosition!),
          'currentPosition element',
        );
      } else {
        expect(currentPositionElement, 'currentPosition').not.to.be.shown;
      }

      const subForElement = playerElement.querySelector('.subFor');
      if (modeTest.subForVisible) {
        expect(subForElement, 'subFor').to.be.shown;
        expect(subForElement?.textContent).to.equal(modeTest.subForExpected, 'subFor element');
      } else {
        expect(subForElement, 'subFor').not.to.be.shown;
      }

      const positionsElement = playerElement.querySelector('.playerPositions');
      if (modeTest.positionsVisible) {
        expect(positionsElement, 'positions').to.be.shown;

        expect(positionsElement?.textContent).to.equal(
          player?.positions.join(', '),
          'playerPositions element',
        );
      } else {
        expect(positionsElement, 'positions').not.to.be.shown;
      }

      const shiftElement = playerElement.querySelector('.shiftTime') as HTMLElement;
      if (modeTest.shiftVisible) {
        expect(shiftElement, 'shiftTime').to.be.shown;

        // Shift time is 1:05 (65 seconds).
        expect(getShiftTimeText(shiftElement)).to.equal(
          Duration.format(Duration.create(65)),
          'shiftTime element',
        );
      } else {
        expect(shiftElement, 'shiftTime').not.to.be.shown;
      }

      await expect(el).shadowDom.to.equalSnapshot();
      await expect(el).to.be.accessible();
    }

    it(`${testPrefix}: renders player properties`, async () => {
      const { player, timeTracker } = buildModeTestPlayer(
        modeTest.playerStatus,
        modeTest.currentPosition,
        modeTest.subForId,
      );
      el.player = player;
      el.mode = player.status;
      el.timeTracker = timeTracker;
      await el.updateComplete;

      await testModeRender(player, timeTracker);
    });

    it(`${testPrefix}: renders data.player properties`, async () => {
      const { player, timeTracker } = buildModeTestPlayer(
        modeTest.playerStatus,
        modeTest.currentPosition,
        modeTest.subForId,
      );
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

        const { player } = buildModeTestPlayer(
          modeTest.playerStatus,
          modeTest.currentPosition,
          modeTest.subForId,
        );
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
          'shiftTime element',
        );
      });
    }

    if (modeTest.playerStatus === PlayerStatus.Next) {
      it(`${testPrefix}: renders swap properties`, async () => {
        const { player, timeTracker } = buildModeTestPlayer(
          modeTest.playerStatus,
          modeTest.currentPosition,
          modeTest.subForId,
        );
        player.isSwap = true;
        player.nextPosition = { id: 'RCB', type: 'CB' };
        el.player = player;
        el.mode = player.status;
        el.timeTracker = timeTracker;
        await el.updateComplete;

        expect(player.currentPosition, 'player.currentPosition').to.be.ok;
        expect(
          player.currentPosition,
          'Swap should have different current and next positions',
        ).to.not.deep.equal(player.nextPosition);

        const playerElement = verifyPlayerElements(player);

        const currentPositionElement = playerElement.querySelector('.currentPosition');
        expect(currentPositionElement, 'currentPosition element').to.be.shown;
        expect(currentPositionElement!.textContent).to.equal(
          formatPosition(player.nextPosition!),
          'currentPosition element',
        );

        const subForElement = playerElement.querySelector('.subFor');
        expect(subForElement, 'subFor element').not.to.be.shown;
      });
    }
  } // mode tests
}); // describe('lineup-player-card tests'
