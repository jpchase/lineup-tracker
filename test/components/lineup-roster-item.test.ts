import { fixture, assert } from '@open-wc/testing';
import 'axe-core/axe.min.js';
import { axeReport } from 'pwa-helpers/axe-report.js';
// TODO: Figure out why can't use @app prefix
import '../../src/components/lineup-roster-item.js';
import { LineupRosterItem } from '../../src/components/lineup-roster-item.js';
import { Player, PlayerStatus } from '../../src/models/player';

describe('lineup-roster-item tests', () => {
  let el: LineupRosterItem;
  beforeEach(async () => {
    el = await fixture('<lineup-roster-item></lineup-roster-item>');
  });

  it('starts empty', function () {
    assert.equal(el.isGame, false);
    assert.equal(el.player, undefined);
  });

  it('renders player properties', async function () {
    const player: Player = {
      id: 'AC',
      name: 'Amanda',
      uniformNumber: 2,
      positions: ['CB', 'FB', 'HM'],
      status: PlayerStatus.Off
    };
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

  it('a11y', function () {
    return axeReport(el);
  });
});
