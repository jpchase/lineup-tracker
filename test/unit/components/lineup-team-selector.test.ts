import { LineupTeamSelector } from '@app/components/lineup-team-selector';
import '@app/components/lineup-team-selector.js';
import { assert, expect, fixture } from '@open-wc/testing';
import { PaperListboxElement } from '@polymer/paper-listbox';
import { buildTeams } from '../helpers/test_data';

describe('lineup-team-selector tests', () => {
  let el: LineupTeamSelector;
  beforeEach(async () => {
    el = await fixture('<lineup-team-selector></lineup-team-selector>');
  });

  function getItems() {
    const items = el.shadowRoot!.querySelectorAll('paper-dropdown-menu paper-listbox paper-item');
    assert.isOk(items, 'Missing items for teams');
    return items;
  }

  it('starts empty', () => {
    assert.equal(el.teamId, '', 'teamId');
    assert.deepEqual(el.teams, {}, 'teams');
  });

  it('renders items for each team', async () => {
    const teams = [{
      id: 't1',
      name: 'First team',
    }];
    el.teams = buildTeams(teams);
    await el.updateComplete;

    const items = getItems();
    assert.isOk(items, 'Missing items for teams');
    assert.equal(items.length - 1, teams.length, 'Rendered item count');

    const firstTeam = items[0];
    assert.equal(firstTeam.getAttribute('id'), teams[0].id, 'Team id');
    assert.equal(firstTeam.textContent, teams[0].name, 'Team name');
  });

  it('fires event when team selected', async () => {
    const teams = [{
      id: 't1',
      name: 'First team',
    }];
    el.teams = buildTeams(teams);
    await el.updateComplete;

    let eventFired = false;
    let eventTeamId = null;
    const handler = function (firedEvent: Event) {
      eventFired = true;
      const event = firedEvent as CustomEvent;
      eventTeamId = event.detail.teamId;
      window.removeEventListener('team-changed', handler);
    };

    window.addEventListener('team-changed', handler);

    const list = el.shadowRoot!.querySelector('paper-dropdown-menu paper-listbox') as PaperListboxElement;
    list.select(teams[0].id);

    await 0;
    assert.isTrue(eventFired, 'Event team-changed should be fired');
    assert.deepEqual(eventTeamId, teams[0].id);
  });

  it('renders item to add new team when empty', async () => {
    await el.updateComplete;
    const items = getItems();
    const addTeam = items[0];
    assert.isOk(addTeam, 'Missing item to add new team');
    assert.equal(addTeam.textContent, '+ Add team', 'Add new team item');
  });

  it('renders item to add new team with existing teams', async () => {
    const teams = [{
      id: 't1',
      name: 'First team',
    }];
    el.teams = buildTeams(teams);
    await el.updateComplete;

    const items = getItems();
    const addTeam = items[items.length - 1];
    assert.isOk(addTeam, 'Missing item to add new team');
    assert.equal(addTeam.textContent, '+ Add team', 'Add new team item');
  });

  it('fires event to add new team', async () => {
    await el.updateComplete;

    let eventFired = false;
    const handler = () => {
      eventFired = true;
      window.removeEventListener('add-new-team', handler);
    };

    window.addEventListener('add-new-team', handler);

    const list = el.shadowRoot!.querySelector('paper-dropdown-menu paper-listbox') as PaperListboxElement;
    list.select('addnewteam');

    await 0;
    assert.isTrue(eventFired, 'Event add-new-team should be fired');
  });

  // TODO: Fix various accessibility warnings
  it.skip('a11y', async () => {
    await expect(el).to.be.accessible();
  });
});
