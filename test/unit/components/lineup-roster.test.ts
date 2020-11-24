import { LineupRoster } from '@app/components/lineup-roster';
import '@app/components/lineup-roster.js';
import { PlayerStatus, Roster } from '@app/models/player';
import { ListItem } from '@material/mwc-list/mwc-list-item';
import { expect, fixture, oneEvent } from '@open-wc/testing';

function getRoster(numPlayers: number): Roster {
  const size = numPlayers || 6;
  const roster: Roster = {};
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
    }

    roster[playerId] = {
      id: playerId,
      name: `Player [${size - i} for sorting] ${i}`,
      uniformNumber: i + (i % 3) * 10,
      positions: pos,
      status: PlayerStatus.Off
    };
  }
  return roster;
}

describe('lineup-roster tests', () => {
  let el: LineupRoster;
  beforeEach(async () => {
    el = await fixture('<lineup-roster></lineup-roster>');
  });

  function getPlayerItems() {
    const items = el.shadowRoot!.querySelectorAll('mwc-list mwc-list-item');
    return items;
  }

  function getCreateElement() {
    const element = el.shadowRoot!.querySelector('lineup-roster-modify');
    return element as Element;
  }

  function getVisibility(element: Element) {
    return getComputedStyle(element, null).display;
  }

  it('starts empty', () => {
    expect(el.roster).to.deep.equal({});
  });

  it('shows no players placeholder for empty roster', () => {
    expect(el.roster).to.deep.equal({});
    const placeholder = el.shadowRoot!.querySelector('div p.empty-list');
    expect(placeholder, 'Missing empty placeholder element').to.exist;
    expect(el).shadowDom.to.equalSnapshot();
  });

  for (const numPlayers of [1, 6]) {
    const testName = numPlayers === 1 ? 'single player' : 'multiple players';
    it(`renders list with ${testName}`, async () => {
      const roster = getRoster(numPlayers);
      el.roster = roster;
      await el.updateComplete;

      const items = getPlayerItems();
      expect(items.length).to.equal(numPlayers, 'Rendered player count');

      let index = 0;
      const sortedPlayers = Object.keys(roster).map(key => roster[key]).
        sort((a, b) => a.name.localeCompare(b.name));
      for (const player of sortedPlayers) {
        const rosterItem = (items[index] as ListItem)!;
        index++;

        const avatar = rosterItem.querySelector('.avatar');
        expect(avatar, 'Missing avatar').to.exist;
        expect(avatar!.textContent).to.equal(`#${player.uniformNumber}`, 'Player number');

        const nameElement = rosterItem.querySelector('.name');
        expect(nameElement, 'Missing name element').to.exist;
        expect(nameElement!.textContent).to.equal(player.name, 'Player name');

        const positionsElement = rosterItem.querySelector('.positions');
        expect(positionsElement, 'Missing positions element').to.exist;
        expect(positionsElement!.textContent).to.equal(player.positions.join(', '), 'Player positions');
      }
      expect(el).shadowDom.to.equalSnapshot();
    });
  }

  it('shows stats in team mode', async () => {
    const roster = getRoster(1);
    el.roster = roster;
    el.mode = 'team';
    await el.updateComplete;

    const items = getPlayerItems();
    const actionsElement = items[0].querySelector('.actions');
    expect(actionsElement, 'Missing actions element').to.exist;
    expect(actionsElement!.textContent!.trim()).to.equal('NN games');
  });

  it('shows actions in game mode', async () => {
    const roster = getRoster(1);
    el.roster = roster;
    el.mode = 'game';
    await el.updateComplete;

    const items = getPlayerItems();
    const actionsElement = items[0].querySelector('.actions');
    expect(actionsElement, 'Missing actions element').to.exist;
    expect(actionsElement!.textContent!.trim()).to.equal('actions here');
  });

  it('shows create widget when add clicked', async () => {
    const createElement = getCreateElement();
    expect(createElement, 'Missing create widget').to.exist;

    let display = getVisibility(createElement);
    expect(display).to.equal('none', 'Create element should not be visible');

    const addButton = el.shadowRoot!.querySelector('mwc-fab');
    setTimeout(() => addButton!.click());
    await oneEvent(addButton!, 'click');

    display = getVisibility(createElement);
    expect(display).to.equal('block', 'Create element should now be visible');
  });

  it.skip('creates new player when saved', () => {
    expect.fail();
  });

  it.skip('closes create widget when cancel clicked', () => {
    expect.fail();
  });

  it.skip('shows edit widget when edit clicked for player', () => {
    expect.fail();
  });

  it.skip('edit widget is populated with player details', () => {
    expect.fail();
  });

  it.skip('updates existing player when saved', () => {
    expect.fail();
  });

  it.skip('closes edit widget when cancel clicked', () => {
    expect.fail();
  });

  it('a11y', async () => {
    await expect(el).to.be.accessible();
  });
});
