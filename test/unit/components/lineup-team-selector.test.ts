import { LineupTeamSelector } from '@app/components/lineup-team-selector';
import '@app/components/lineup-team-selector.js';
import { assert, expect, fixture } from '@open-wc/testing';
import { PaperListboxElement } from '@polymer/paper-listbox';
import { buildTeams } from '../helpers/test_data';
import { Button } from '@material/mwc-button';
import { Teams, Team } from '@app/models/team';

describe('lineup-team-selector tests', () => {
  let el: LineupTeamSelector;
  beforeEach(async () => {
    el = await fixture('<lineup-team-selector></lineup-team-selector>');
  });

  const TEAMS: Team[] = [
    {
      id: 't1',
      name: 'First team',
    },
    {
      id: 't1',
      name: '2nd team',
    }
  ];

  function getTeams() {
    return buildTeams(TEAMS.slice(0));
  }

  function getItems() {
    const items = el.shadowRoot!.querySelectorAll('mwc-dialog mwc-list mwc-list-item');
    return items;
  }

  function getTeamButton() {
    const button = el.shadowRoot!.querySelector('#team-switcher-button');
    expect(button, 'Missing team switcher').to.be.ok;
    return button as Button;
  }

  it('starts empty', () => {
    expect(el.teamId).to.equal('', 'teamId');
    assert.deepEqual(el.teams, {}, 'teams');
  });

  it('renders name for current team', async () => {
    const teams = getTeams();
    el.teamId = 't1';
    el.teams = teams;
    await el.updateComplete;

    const button = getTeamButton();
    expect(button, 'Missing team switcher').to.be.ok;

    expect(button.textContent).to.be.equal(teams['t1'].name, 'Team name');
  });

  describe('team selection dialog', () => {
    let teamArray: Team[] = [];
    let teams: Teams = {};
    // let teamKeys: string[] = [];

    beforeEach(async () => {
      teamArray = TEAMS.slice(0);
      teams = buildTeams(teamArray);
      // teamKeys = Object.keys(teams);
      el.teams = teams;

      const button = getTeamButton();
      setTimeout(() => button.click());
      await el.updateComplete;
    });

    it('renders item for each team in sorted order', async () => {
      const items = getItems();
      expect(items).to.be.ok;//('Missing items for teams');
      expect(items.length).to.equal(teamArray.length, 'Rendered item count');

      let index = 0;
      for (const team of teamArray) {
        const teamElement = items[index];

        expect(teamElement.getAttribute('id')).to.equal(team.id, 'Team id');
        expect(teamElement.textContent).to.equal(team.name, 'Team name');
      }
    });

    it('fires event when team selected', async () => {

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

  }); // describe('team selection dialog')

  // TODO: Fix various accessibility warnings
  it('a11y', async () => {
    const button = getTeamButton();
    setTimeout(() => button.click());

    await el.updateComplete;
    await expect(el).to.be.accessible();
    expect(el).shadowDom.to.equalSnapshot();
  });

});
