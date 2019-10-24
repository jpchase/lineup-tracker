import { EVENT_PLAYERSELECTED, EVENT_POSITIONSELECTED } from '@app/components/events';
import { LineupPlayerCard, PlayerCardData } from '@app/components/lineup-player-card';
import '@app/components/lineup-player-card.js';
import { Player, PlayerStatus } from '@app/models/player';
import { assert, expect, fixture } from '@open-wc/testing';
import 'axe-core/axe.min.js';
import { axeReport } from 'pwa-helpers/axe-report.js';

describe('lineup-player-card tests', () => {
  let el: LineupPlayerCard;

  beforeEach(async () => {
    el = await fixture('<lineup-player-card></lineup-player-card>');
  });

  function getPlayer(): Player {
    return {
      id: 'AC',
      name: 'Amanda',
      uniformNumber: 2,
      positions: ['CB', 'FB', 'HM'],
      status: PlayerStatus.Off
    };
  }

  function getCardData(player?: Player) {
    const data: PlayerCardData = {
      id: 'test',
      position: { id: 'HM', type: 'HM' }
    };
    if (player) {
      data.player = player;
    }
    return data;
  }

  function getPlayerElement(): HTMLDivElement {
    const playerElement = el.shadowRoot!.querySelector('.player');
    assert.isOk(playerElement, 'Missing main element for player');

    return playerElement as HTMLDivElement;
  }

  function verifyPlayerElements(inputPlayer: Player) {
    const playerElement = getPlayerElement();

    const numberElement = playerElement.querySelector('.uniformNumber');
    assert.isOk(numberElement, 'Missing number element');
    assert.equal(numberElement!.textContent, inputPlayer.uniformNumber);

    const nameElement = playerElement.querySelector('.playerName');
    assert.isOk(nameElement, 'Missing name element');
    assert.equal(nameElement!.textContent, inputPlayer.name);

    // const positionsElement = playerElement.querySelector('paper-icon-item paper-item-body div[secondary]');
    // assert.isOk(positionsElement, 'Missing positions element');
    // assert.equal(positionsElement.textContent, 'CB, FB, HM');

    return playerElement;
  }

  it('starts empty', () => {
    console.log('empty test');

    assert.equal(el.mode, '');
    assert.equal(el.selected, false);
    assert.equal(el.data, undefined);
    assert.equal(el.player, undefined);
  });

  it('renders player properties', async () => {
    const player = getPlayer();
    el.player = player;
    await el.updateComplete;

    assert.equal(el.player.uniformNumber, 2);

    verifyPlayerElements(player);
  });

  it('renders data.player properties', async () => {
    const player = getPlayer();
    const data = getCardData(player);
    el.data = data;
    await el.updateComplete;

    assert.equal(el.data.player!.uniformNumber, 2);

    const playerElement = verifyPlayerElements(player);

    const positionElement = playerElement.querySelector('.currentPosition');
    assert.isOk(positionElement, 'Missing currentPosition element');
    assert.equal(positionElement!.textContent, data.position.type);

  });

  it('renders data properties without player', async () => {
    const data = getCardData();
    el.data = data;
    await el.updateComplete;

    const playerElement = getPlayerElement();

    const positionElement = playerElement.querySelector('.currentPosition');
    assert.isOk(positionElement, 'Missing currentPosition element');
    assert.equal(positionElement!.textContent, data.position.type);
  });

  it('fires event when player selected', async () => {
    const player = getPlayer();
    el.player = player;
    await el.updateComplete;

    let eventFired = false;
    let eventPlayer = undefined;
    let eventSelected = undefined;
    const handler = function (firedEvent: Event) {
      eventFired = true;
      const event = firedEvent as CustomEvent;
      eventPlayer = event.detail.player;
      eventSelected = event.detail.selected;
      window.removeEventListener(EVENT_PLAYERSELECTED, handler);
    };

    window.addEventListener(EVENT_PLAYERSELECTED, handler);

    const playerElement = getPlayerElement();
    playerElement.click();

    await 0;
    assert.isTrue(eventFired, 'Event playerselected should be fired');
    assert.deepEqual(eventPlayer, player);
    assert.isTrue(eventSelected, 'Card should now be selected');
  });

  it('fires event when player de-selected', async () => {
    const player = getPlayer();
    el.player = player;
    el.selected = true;
    await el.updateComplete;

    let eventFired = false;
    let eventPlayer = undefined;
    let eventSelected = undefined;
    const handler = function (firedEvent: Event) {
      eventFired = true;
      const event = firedEvent as CustomEvent;
      eventPlayer = event.detail.player;
      eventSelected = event.detail.selected;
      window.removeEventListener(EVENT_PLAYERSELECTED, handler);
    };

    window.addEventListener(EVENT_PLAYERSELECTED, handler);

    const playerElement = getPlayerElement();
    playerElement.click();

    await 0;
    assert.isTrue(eventFired, 'Event playerselected should be fired');
    assert.deepEqual(eventPlayer, player);
    assert.isFalse(eventSelected, 'Card should no longer be selected');
  });

  it('fires event when position selected with data', async () => {
    const data = getCardData();
    el.data = data;
    await el.updateComplete;

    let eventFired = false;
    let eventPlayer = undefined;
    let eventPosition = undefined;
    let eventSelected = undefined;
    const handler = function (firedEvent: Event) {
      eventFired = true;
      const event = firedEvent as CustomEvent;
      eventPlayer = event.detail.player;
      eventPosition = event.detail.position;
      eventSelected = event.detail.selected;
      window.removeEventListener(EVENT_POSITIONSELECTED, handler);
    };

    window.addEventListener(EVENT_POSITIONSELECTED, handler);

    const playerElement = getPlayerElement();
    playerElement.click();

    await 0;
    assert.isTrue(eventFired, `Event positionselected should be fired`);
    assert.equal(eventPlayer, undefined, 'Event should not provide a player');
    assert.equal(eventPosition, data.position, 'Event should provide position');
    assert.isTrue(eventSelected, 'Card should now be selected');
  });

  it('fires event when position de-selected with data', async () => {
    const data = getCardData();
    el.data = data;
    el.selected = true;
    await el.updateComplete;

    let eventFired = false;
    let eventPlayer = undefined;
    let eventPosition = undefined;
    let eventSelected = undefined;
    const handler = function (firedEvent: Event) {
      eventFired = true;
      const event = firedEvent as CustomEvent;
      eventPlayer = event.detail.player;
      eventPosition = event.detail.position;
      eventSelected = event.detail.selected;
      window.removeEventListener(EVENT_POSITIONSELECTED, handler);
    };

    window.addEventListener(EVENT_POSITIONSELECTED, handler);

    const playerElement = getPlayerElement();
    playerElement.click();

    await 0;
    assert.isTrue(eventFired, 'Event positionselected should be fired');
    assert.equal(eventPlayer, undefined, 'Event should not provide a player');
    assert.equal(eventPosition, data.position, 'Event should provide position');
    assert.isFalse(eventSelected, 'Card should no longer be selected');
  });

  it('fires event when position selected with data and player', async () => {
    const data = getCardData();
    const player = getPlayer();
    data.player = player;
    el.data = data;
    await el.updateComplete;

    let eventFired = false;
    let eventPlayer = undefined;
    let eventPosition = undefined;
    let eventSelected = undefined;
    const handler = function (firedEvent: Event) {
      eventFired = true;
      const event = firedEvent as CustomEvent;
      eventPlayer = event.detail.player;
      eventPosition = event.detail.position;
      eventSelected = event.detail.selected;
      window.removeEventListener(EVENT_POSITIONSELECTED, handler);
    };

    window.addEventListener(EVENT_POSITIONSELECTED, handler);

    const playerElement = getPlayerElement();
    playerElement.click();

    await 0;
    assert.isTrue(eventFired, `Event positionselected should be fired`);
    assert.equal(eventPlayer, data.player, 'Event should provide player');
    assert.equal(eventPosition, data.position, 'Event should provide position');
    assert.isTrue(eventSelected, 'Card should now be selected');
  });

  it('fires event when position de-selected with data and player', async () => {
    const data = getCardData();
    const player = getPlayer();
    data.player = player;
    el.data = data;
    el.selected = true;
    await el.updateComplete;

    let eventFired = false;
    let eventPlayer = undefined;
    let eventPosition = undefined;
    let eventSelected = undefined;
    const handler = function (firedEvent: Event) {
      eventFired = true;
      const event = firedEvent as CustomEvent;
      eventPlayer = event.detail.player;
      eventPosition = event.detail.position;
      eventSelected = event.detail.selected;
      window.removeEventListener(EVENT_POSITIONSELECTED, handler);
    };

    window.addEventListener(EVENT_POSITIONSELECTED, handler);

    const playerElement = getPlayerElement();
    playerElement.click();

    await 0;
    assert.isTrue(eventFired, 'Event positionselected should be fired');
    assert.equal(eventPlayer, data.player, 'Event should provide player');
    assert.equal(eventPosition, data.position, 'Event should provide position');
    assert.isFalse(eventSelected, 'Card should no longer be selected');
  });

  it('a11y', () => {
    console.log('ally test');
    return axeReport(el);
  });

  it('accessibility', async () => {
    await expect(el).to.be.accessible();
  });

});
