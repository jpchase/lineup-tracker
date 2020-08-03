import { EVENT_PLAYERSELECTED, EVENT_POSITIONSELECTED } from '@app/components/events';
import { LineupPlayerCard, PlayerCardData } from '@app/components/lineup-player-card';
import '@app/components/lineup-player-card.js';
import { LivePlayer } from '@app/models/game';
import { PlayerStatus } from '@app/models/player';
import { assert, expect, fixture, oneEvent } from '@open-wc/testing';

describe('lineup-player-card tests', () => {
  let el: LineupPlayerCard;

  beforeEach(async () => {
    el = await fixture('<lineup-player-card></lineup-player-card>');
  });

  function getPlayer(): LivePlayer {
    return {
      id: 'AC',
      name: 'Amanda',
      uniformNumber: 2,
      positions: ['CB', 'FB', 'HM'],
      status: PlayerStatus.Off
    };
  }

  function getCardData(player?: LivePlayer) {
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

  function verifyPlayerElements(inputPlayer: LivePlayer) {
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

  function verifySelected() {
    const playerElement = getPlayerElement();

    expect(playerElement!.hasAttribute('selected'), 'Should have selected attribute').to.be.true;
  }

  it('starts empty', () => {
    assert.equal(el.mode, '');
    assert.equal(el.selected, false);
    assert.equal(el.data, undefined);
    assert.equal(el.player, undefined);
    expect(el).shadowDom.to.equalSnapshot();
  });

  it('uses selected value set directly by property', async () => {
    expect(el.selected, 'Card should initially not be selected').to.be.false;
    el.selected = true;
    await el.updateComplete;
    expect(el.selected, 'Card should be selected').to.be.true;
  });

  it('renders player properties', async () => {
    const player = getPlayer();
    el.player = player;
    await el.updateComplete;

    assert.equal(el.player.uniformNumber, 2);
    expect(el.selected, 'Card should not be selected').to.be.false;

    verifyPlayerElements(player);
    expect(el).shadowDom.to.equalSnapshot();
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

  it('renders data.player properties', async () => {
    const player = getPlayer();
    const data = getCardData(player);
    el.data = data;
    await el.updateComplete;

    assert.equal(el.data.player!.uniformNumber, 2);
    expect(el.selected, 'Card should not be selected').to.be.false;

    const playerElement = verifyPlayerElements(player);

    const positionElement = playerElement.querySelector('.currentPosition');
    assert.isOk(positionElement, 'Missing currentPosition element');
    assert.equal(positionElement!.textContent, data.position.type);
    expect(el).shadowDom.to.equalSnapshot();
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
    expect(el).shadowDom.to.equalSnapshot();
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

  it('a11y', async () => {
    await expect(el).to.be.accessible();
  });

});
