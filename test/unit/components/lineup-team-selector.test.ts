import { LineupTeamSelector, LineupTeamSelectorDialog } from '@app/components/lineup-team-selector';
import '@app/components/lineup-team-selector.js';
import { assert, expect, fixture, nextFrame, aTimeout } from '@open-wc/testing';
import { PaperListboxElement } from '@polymer/paper-listbox';
import { buildTeams } from '../helpers/test_data';
import { Button } from '@material/mwc-button';
import { Teams, Team } from '@app/models/team';
// import { Dialog } from '@material/mwc-dialog';

describe('lineup-team-selector tests', () => {
  let el: LineupTeamSelector;
  beforeEach(async () => {
    el = await fixture('<lineup-team-selector></lineup-team-selector>');
  });

  const TEAMS: Team[] = [
    {
      id: 't1',
      name: 'First team id - sorts last',
    },
    {
      id: 't2',
      name: 'A team - sorts first',
    },
    {
      id: 't3',
      name: 'Another team (3)',
    }
  ];

  function getTeams() {
    return buildTeams(TEAMS.slice(0));
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
    expect(button, 'Missing team switcher').to.exist;

    expect(button.textContent).to.be.equal(teams['t1'].name, 'Team name');
  });

  describe('team selection dialog', () => {
    let teamArray: Team[] = [];
    let teams: Teams = {};
    // let teamDialog: Dialog;
    // let teamKeys: string[] = [];

    beforeEach(async () => {
      // teamArray = TEAMS.slice(0);
      // teams = buildTeams(teamArray);
      // // teamKeys = Object.keys(teams);
      // el.teams = teams;
    });

    async function showDialog(teamData?: Team[]) {
      teamArray = teamData || TEAMS.slice(0);
      teams = buildTeams(teamArray);
      el.teams = teams;

      const button = getTeamButton();
      setTimeout(() => button.click());
      await el.updateComplete;
      await nextFrame();
      await aTimeout(100);

      // TODO: await opened event, like https://github.com/material-components/material-components-web-components/blob/master/packages/dialog/test/mwc-dialog.test.ts#L55
    }

    function getTeamSelector() {
      return el.shadowRoot!.querySelector('lineup-team-selector-dialog')!;
    }

    function getTeamItems(teamSelector: LineupTeamSelectorDialog) {
      const items = teamSelector.shadowRoot!.querySelectorAll('mwc-dialog mwc-list mwc-list-item');
      return items;
    }

    function getSelectButton(teamSelector: LineupTeamSelectorDialog) {
      const button = teamSelector.shadowRoot!.querySelector('mwc-button[dialogAction="select"]');
      return button as Button;
    }

    it('renders item for each team in sorted order', async () => {
      await showDialog();
      const teamSelector = getTeamSelector();

      const items = getTeamItems(teamSelector);
      expect(items.length).to.equal(teamArray.length, 'Rendered item count');

      let index = 0;
      const sortedTeams = teamArray.sort((a, b) => a.name.localeCompare(b.name));
      for (const team of sortedTeams) {
        const teamElement = items[index];
        index++;

        expect(teamElement.getAttribute('id')).to.equal(team.id, 'Team id');
        expect(teamElement.textContent).to.equal(team.name, 'Team name');
      }

      expect(teamSelector).shadowDom.to.equalSnapshot();
    });

    it.skip('fires event when team selected', async () => {

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

    it('renders placeholder when no teams created yet', async () => {
      await showDialog([]);
      const teamSelector = getTeamSelector();

      const items = getTeamItems(teamSelector);
      expect(items.length).to.equal(0, 'Team list should be empty');

      const placeholder = teamSelector.shadowRoot?.querySelector('div > p.empty-list');
      expect(placeholder, 'Empty placeholder element').to.exist;

      const selectButton = getSelectButton(teamSelector);
      expect(selectButton.disabled, 'Select button should be disabled').to.be.true;
      expect(teamSelector).shadowDom.to.equalSnapshot();
    });

    it.skip('fires event to add new team', async () => {
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
      await showDialog();

      await expect(el).to.be.accessible();
      expect(el).shadowDom.to.equalSnapshot();
    });

  }); // describe('team selection dialog')

  it('a11y', async () => {
    const teams = getTeams();
    el.teamId = 't1';
    el.teams = teams;
    await el.updateComplete;

    await expect(el).to.be.accessible();
    expect(el).shadowDom.to.equalSnapshot();
  });

});
