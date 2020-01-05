import { LineupOnPlayerList } from '@app/components/lineup-on-player-list';
import '@app/components/lineup-on-player-list.js';
import { LineupPlayerCard } from '@app/components/lineup-player-card';
import { FormationBuilder, FormationType } from '@app/models/formation';
import { LivePlayer } from '@app/models/game';
import { PlayerStatus } from '@app/models/player';
import { assert, expect, fixture } from '@open-wc/testing';

interface PositionCounter {
  [index: string]: number;
}

function getFormation(formationType: FormationType) {
  return FormationBuilder.create(formationType);
}

function getPositions(formationType: FormationType) {
  const formation = FormationBuilder.create(formationType);
  const positions: PositionCounter = {};

  [
    formation.forward1, formation.forward2,
    formation.midfield1, formation.midfield2,
    formation.defense,
    formation.gk
  ].forEach(line => {
    line.positions.forEach(position => {
      let count = positions[position.id];
      if (count) {
        count++;
      } else {
        count = 1;
      }
      positions[position.id] = count;
    });
  });
  return positions;
}

function getPlayers(numPlayers: number, status?: PlayerStatus, otherStatus?: PlayerStatus): LivePlayer[] {
  const size = numPlayers || 6;
  const players: LivePlayer[] = [];
  for (let i = 0; i < size; i++) {
    const playerId = `P${i}`;
    let currentPosition;
    let pos: string[] = [];

    switch (i) {
      case 0:
        currentPosition = { id: 'LCB', type: 'CB' };
        pos = ['CB', 'FB', 'HM'];
        break;

      case 1:
        currentPosition = { id: 'S', type: 'S' };
        pos = ['S', 'W'];
        break;

      case 2:
        currentPosition = { id: 'AM1', type: 'AM' };
        pos = ['AM', 'HM'];
        break;

      case 3:
        currentPosition = { id: 'HM', type: 'HM' };
        pos = ['HM', 'CB'];
        break;

      case 4:
        currentPosition = { id: 'RW', type: 'W' };
        pos = ['W'];
        break;

      case 5:
        currentPosition = { id: 'RFB', type: 'FB' };
        pos = ['FB'];
        break;

      case 6:
        currentPosition = { id: 'LW', type: 'W' };
        pos = ['W'];
        break;

      case 7:
        currentPosition = { id: 'RCB', type: 'CB' };
        pos = ['CB'];
        break;

      case 8:
        currentPosition = { id: 'LFB', type: 'FB' };
        pos = ['FB'];
        break;

      case 9:
        currentPosition = { id: 'AM2', type: 'AM' };
        pos = ['AM'];
        break;

      case 10:
        currentPosition = { id: 'GK', type: 'GK' };
        pos = ['GK'];
        break;

      default:
        break;
    }

    players.push({
      id: playerId,
      name: `Player ${i}`,
      uniformNumber: i + (i % 3) * 10,
      currentPosition: currentPosition,
      positions: pos,
      status: status || PlayerStatus.On
    });

    if (otherStatus) {
      players.push({
        id: playerId + otherStatus,
        name: `Player ${i}-${otherStatus}`,
        uniformNumber: i + (i % 4) * 10,
        currentPosition: currentPosition,
        positions: pos,
        status: otherStatus
      });
    }
  }
  return players;
}

describe('lineup-on-player-list tests', () => {
  let el: LineupOnPlayerList;
  beforeEach(async () => {
    el = await fixture('<lineup-on-player-list></lineup-on-player-list>');
  });

  function verifyPlayerCards(players: LivePlayer[]) {
    const items = el.shadowRoot!.querySelectorAll('div div.list div lineup-player-card');

    players.forEach(player => {
      let found = false;
      for (let element of Array.from(items)) {
        const playerCard = element as LineupPlayerCard;
        if (playerCard.data!.position.id !== player.currentPosition!.id) {
          continue;
        }

        const cardPlayer = playerCard.data!.player;
        if (!cardPlayer) {
          continue;
        }

        if (cardPlayer.id === player.id && cardPlayer.uniformNumber === player.uniformNumber) {
          found = true;
          break;
        }
      };

      if (player.status === PlayerStatus.On) {
        assert.isTrue(found, `Card containing list player, id = ${player.id}`)
      } else {
        assert.isFalse(found, `Card should not be found containing list player, id = ${player.id}`)
      }
    });
  }

  it('starts empty', () => {
    assert.equal(el.formation, undefined);
    assert.deepEqual(el.players, []);
  });

  it('shows no players placeholder for empty formation/players', () => {
    assert.equal(el.formation, undefined);
    assert.deepEqual(el.players, []);
    const placeholder = el.shadowRoot!.querySelector('div p.empty-list');
    assert.isOk(placeholder, 'Missing empty placeholder element');
  });

  it('renders full formation with empty input list', async () => {
    el.formation = getFormation(FormationType.F4_3_3);
    el.players = [];
    await el.updateComplete;

    const items = el.shadowRoot!.querySelectorAll('div div.list div lineup-player-card');
    assert.equal(items.length, 11, 'Rendered position count');

    const expectedPositions = getPositions(FormationType.F4_3_3);
    const actualPositions: PositionCounter = {};
    items.forEach(element => {
      const playerCard = element as LineupPlayerCard;
      const position = playerCard.data!.position.id;
      let count = actualPositions[position];
      if (count) {
        count++;
      } else {
        count = 1;
      }
      actualPositions[position] = count;
    });

    assert.deepEqual(actualPositions, expectedPositions, 'Positions in renderered formation');
  });

  it('sets selected position with empty input list', async () => {
    el.formation = getFormation(FormationType.F4_3_3);
    el.players = [];
    el.selectedPosition = { id: 'HM', type: 'HM' };
    await el.updateComplete;

    const items = el.shadowRoot!.querySelectorAll('div div.list div lineup-player-card');
    assert.equal(items.length, 11, 'Rendered position count');

    let selectedCards: LineupPlayerCard[] = [];
    items.forEach(element => {
      const playerCard = element as LineupPlayerCard;
      if (playerCard.selected) {
        selectedCards.push(playerCard);
      }
    });
    expect(selectedCards).to.have.lengthOf(1);
    expect(selectedCards[0].data!.position).to.deep.equal(
      { id: 'HM', type: 'HM', selected: true });
  });

  it('renders full formation when input list has no matching players', async () => {
    el.formation = getFormation(FormationType.F4_3_3);
    el.players = getPlayers(2, PlayerStatus.Next);
    await el.updateComplete;

    const items = el.shadowRoot!.querySelectorAll('div div.list div lineup-player-card');
    assert.equal(items.length, 11, 'Rendered position count');

    const expectedPositions = getPositions(FormationType.F4_3_3);
    const actualPositions: PositionCounter = {};
    items.forEach(element => {
      const playerCard = element as LineupPlayerCard;
      assert.isOk(playerCard.data!.position, 'Position is set');
      assert.isNotOk(playerCard.data!.player, 'Player should not be set');
      const position = playerCard.data!.position.id;
      let count = actualPositions[position];
      if (count) {
        count++;
      } else {
        count = 1;
      }
      actualPositions[position] = count;
    });

    assert.deepEqual(actualPositions, expectedPositions, 'Positions in renderered formation');
  });

  it(`shows no player cards when input list has no matching players`, async () => {
    const players = getPlayers(2, PlayerStatus.Next);
    el.formation = getFormation(FormationType.F4_3_3);
    el.players = players;
    await el.updateComplete;

    verifyPlayerCards(players);
  });

  for (const numPlayers of [1, 6]) {
    const testName = numPlayers === 1 ? 'single player' : `multiple players`;
    it(`puts players in matching position with ${testName}`, async () => {
      const players = getPlayers(numPlayers);
      el.formation = getFormation(FormationType.F4_3_3);
      el.players = players;
      await el.updateComplete;

      verifyPlayerCards(players);
    });

    it(`puts players in matching position with ${testName} mixed with other status`, async () => {
      // Generates a list with two players at each position, the first off, the second on.
      // Ensures that if status is not filtered correctly, the non-matching 'OFF' player is
      // processed first.
      const players = getPlayers(numPlayers, PlayerStatus.Off, PlayerStatus.On);
      el.formation = getFormation(FormationType.F4_3_3);
      el.players = players;
      await el.updateComplete;

      verifyPlayerCards(players);
    });
  }

  it('a11y', async () => {
    await expect(el).to.be.accessible();
  });
});
