import { LineupRosterItem } from '@app/components/lineup-roster-item';
import '@app/components/lineup-roster-item.js';
import { Player, PlayerStatus } from '@app/models/player';
import { assert, expect, fixture } from '@open-wc/testing';

describe('lineup-roster-item tests', () => {
  const player: Player = {
    id: 'AC',
    name: 'Amanda',
    uniformNumber: 2,
    positions: ['CB', 'FB', 'HM'],
    status: PlayerStatus.Off
  };
  let el: LineupRosterItem;

  beforeEach(async () => {
    el = await fixture('<lineup-roster-item></lineup-roster-item>');
  });

  it('starts empty', () => {
    assert.equal(el.isGame, false);
    assert.equal(el.player, undefined);
  });

  it('renders player properties', async () => {
    el.player = player;
    await el.updateComplete;

    assert.equal(el.player.uniformNumber, 2);
    const avatar = el.shadowRoot!.querySelector('paper-icon-item .avatar');
    assert.isOk(avatar, 'Missing avatar');
    assert.equal(avatar!.textContent, '#2');

    const nameElement = el.shadowRoot!.querySelector('paper-icon-item paper-item-body .flex-equal-justified div');
    assert.isOk(nameElement, 'Missing name element');
    assert.equal(nameElement!.textContent, 'Amanda');

    const positionsElement = el.shadowRoot!.querySelector('paper-icon-item paper-item-body div[secondary]');
    assert.isOk(positionsElement, 'Missing positions element');
    assert.equal(positionsElement!.textContent, 'CB, FB, HM');
  });

  it('shows stats in team mode', async () => {
    el.player = player;
    el.isGame = false;
    await el.updateComplete;

    const actionsElement = el.shadowRoot!.querySelector('paper-icon-item paper-item-body .flex-equal-justified div + div');
    assert.isOk(actionsElement, 'Missing actions element');
    assert.equal(actionsElement!.textContent!.trim(), 'NN games');
  });

  it('shows actions in game mode', async () => {
    el.player = player;
    el.isGame = true;
    await el.updateComplete;

    const actionsElement = el.shadowRoot!.querySelector('paper-icon-item paper-item-body .flex-equal-justified div + div');
    assert.isOk(actionsElement, 'Missing actions element');
    assert.equal(actionsElement!.textContent!.trim(), 'actions here');
  });

  it('a11y', async () => {
    await expect(el).to.be.accessible();
  });
});