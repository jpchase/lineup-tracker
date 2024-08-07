/** @format */

import { LineupPlayerCard } from '@app/components/lineup-player-card';
import { LineupPlayerList } from '@app/components/lineup-player-list';
import '@app/components/lineup-player-list.js';
import { LivePlayer } from '@app/models/live.js';
import { PlayerStatus } from '@app/models/player';
import { assert, expect, fixture, html } from '@open-wc/testing';

function getPlayers(
  numPlayers: number,
  status: PlayerStatus,
  otherStatus?: PlayerStatus,
): LivePlayer[] {
  const size = numPlayers || 6;
  const players: LivePlayer[] = [];
  for (let i = 0; i < size; i++) {
    const playerId = `P${i}`;
    let pos: string[] = [];
    switch (i % 3) {
      case 0:
        pos = ['CB', 'FB', 'HM'];
        break;

      case 1:
        pos = ['S', 'OM'];
        break;

      case 2:
        pos = ['AM'];
        break;

      default:
      // Other cases cover all scenarios
    }

    players.push({
      id: playerId,
      name: `Player ${i}`,
      uniformNumber: i + (i % 3) * 10,
      positions: pos,
      status,
    });

    if (otherStatus) {
      players.push({
        id: playerId + otherStatus,
        name: `Player ${i}-${otherStatus}`,
        uniformNumber: i + (i % 4) * 10,
        positions: pos,
        status: otherStatus,
      });
    }
  }
  return players;
}

function getPlayersWithSomeMissingStatus(numPlayers: number, status: PlayerStatus): LivePlayer[] {
  const players = getPlayers(numPlayers, status);
  players.push({
    id: 'P<no status>',
    name: `Player with no status`,
    uniformNumber: 99,
    positions: ['GK'],
  } as LivePlayer);
  return players;
}

describe('lineup-player-list tests', () => {
  let el: LineupPlayerList;
  beforeEach(async () => {
    el = await fixture(html`<lineup-player-list></lineup-player-list>`);
  });

  function verifyEmptyList() {
    const placeholder = el.shadowRoot!.querySelector('div p.empty-list');
    assert.isOk(placeholder, 'Missing empty placeholder element');
  }

  function verifyPlayerCards(expectedCount: number) {
    const items = el.shadowRoot!.querySelectorAll('div div lineup-player-card');
    assert.isOk(items, 'Missing items for players');
    assert.equal(items.length, expectedCount, 'Rendered player count');
    return items;
  }

  it('starts empty', () => {
    assert.equal(el.mode, '');
    assert.equal(el.showCancel, false);
    assert.deepEqual(el.players, []);
  });

  it('shows no players placeholder for empty list', async () => {
    assert.deepEqual(el.players, []);
    verifyEmptyList();
    await expect(el).shadowDom.to.equalSnapshot();
  });

  it('sets selected on each card from player.selected', async () => {
    const players = getPlayers(2, PlayerStatus.Off);
    players[0].selected = true;
    players[1].selected = false;

    el.mode = 'off';
    el.players = players;
    await el.updateComplete;

    const items = verifyPlayerCards(2);
    let cardElement = items[0] as LineupPlayerCard;
    expect(cardElement.selected, 'First card should be marked selected').to.be.true;
    cardElement = items[1] as LineupPlayerCard;
    expect(cardElement.selected, 'Second card should not be marked selected').to.be.false;
  });

  it(`mode [off]: includes players without status set`, async () => {
    const players = getPlayersWithSomeMissingStatus(2, PlayerStatus.Off);

    el.mode = 'off';
    el.players = players;
    await el.updateComplete;

    // All the players in the list should be shown, since they either have
    // status of off, or are missing the status.
    verifyPlayerCards(players.length);
    await expect(el).shadowDom.to.equalSnapshot();
  });

  it(`mode [next]: excludes players without status set`, async () => {
    const players = getPlayersWithSomeMissingStatus(2, PlayerStatus.Next);

    el.mode = 'next';
    el.players = players;
    await el.updateComplete;

    verifyPlayerCards(2);
  });

  it(`mode [out]: excludes players without status set`, async () => {
    const players = getPlayersWithSomeMissingStatus(2, PlayerStatus.Out);

    el.mode = 'out';
    el.players = players;
    await el.updateComplete;

    verifyPlayerCards(2);
  });

  const modeTests = [
    {
      listMode: 'next',
      playerStatus: PlayerStatus.Next,
      nonMatchingStatus: PlayerStatus.Off,
    },
    {
      listMode: 'off',
      playerStatus: PlayerStatus.Off,
      nonMatchingStatus: PlayerStatus.Next,
    },
    {
      listMode: 'out',
      playerStatus: PlayerStatus.Out,
      nonMatchingStatus: PlayerStatus.Off,
    },
  ];

  for (const modeTest of modeTests) {
    const testPrefix = `mode [${modeTest.listMode}]`;

    // eslint-disable-next-line no-loop-func
    it(`${testPrefix}: shows no players placeholder when input list has no matching players`, async () => {
      const players = getPlayers(2, modeTest.nonMatchingStatus);

      el.mode = modeTest.listMode;
      el.players = players;
      await el.updateComplete;

      verifyEmptyList();
      await expect(el).shadowDom.to.equalSnapshot();
    });

    for (const numPlayers of [1, 6]) {
      const playersDesc = numPlayers === 1 ? 'single player' : `multiple players`;

      // eslint-disable-next-line no-loop-func
      it(`${testPrefix}: renders list with ${playersDesc} all matching mode`, async () => {
        const players = getPlayers(numPlayers, modeTest.playerStatus);

        el.mode = modeTest.listMode;
        el.players = players;
        await el.updateComplete;

        verifyPlayerCards(numPlayers);
      });

      // eslint-disable-next-line no-loop-func
      it(`${testPrefix}: renders list with ${playersDesc} mixed with other status`, async () => {
        const players = getPlayers(numPlayers, modeTest.playerStatus, modeTest.nonMatchingStatus);

        el.mode = modeTest.listMode;
        el.players = players;
        await el.updateComplete;

        verifyPlayerCards(numPlayers);
      });
    } // number of players
  } // list modes

  it('a11y', async () => {
    await expect(el).to.be.accessible();
  });
});
