import { LineupTeamSelector, LineupTeamSelectorDialog } from '@app/components/lineup-team-selector';
import '@app/components/lineup-team-selector.js';
import { Team } from '@app/models/team';
import { Button } from '@material/mwc-button';
import { expect, fixture, nextFrame, oneEvent } from '@open-wc/testing';
import { buildTeams } from '../helpers/test_data';

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

describe('lineup-team-selector tests', () => {
  let el: LineupTeamSelector;
  beforeEach(async () => {
    el = await fixture('<lineup-team-selector></lineup-team-selector>');
  });

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
    expect(el.teams).to.deep.equal({}, 'teams');
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

  it.skip('renders placeholder when no teams created yet', async () => {
    el.teams = {};
    await el.updateComplete;

    const button = getTeamButton();
    expect(button, 'Missing team switcher').to.exist;

    expect(button.textContent).to.be.equal('Select a team', 'Team name');
  });

  it('a11y', async () => {
    const teams = getTeams();
    el.teamId = 't1';
    el.teams = teams;
    await el.updateComplete;

    await expect(el).to.be.accessible();
    expect(el).shadowDom.to.equalSnapshot();
  });

}); // describe('lineup-team-selector tests')

describe('lineup-team-selector-dialog tests', () => {
  let el: LineupTeamSelectorDialog;

  beforeEach(async () => {
    el = await fixture('<lineup-team-selector-dialog></lineup-team-selector-dialog>');
  });

  function populateDialog(teamId: string, teamData?: Team[]): Team[] {
    const teamArray = teamData || TEAMS.slice(0);
    el.teams = buildTeams(teamArray);
    el.teamId = teamId;
    return teamArray;
  }


  function getTeamItems() {
    const items = el.shadowRoot!.querySelectorAll('mwc-dialog mwc-list mwc-list-item');
    return items;
  }

  function getSelectButton() {
    const button = el.shadowRoot!.querySelector('mwc-button[dialogAction="select"]');
    return button as Button;
  }

  function getNewTeamButton() {
    const button = el.shadowRoot!.querySelector('mwc-button[dialogAction="new-team"]');
    return button as Button;
  }

  it('renders item for each team in sorted order', async () => {
    const teamArray = populateDialog('t1');
    await el.show();

    const items = getTeamItems();
    expect(items.length).to.equal(teamArray.length, 'Rendered item count');

    let index = 0;
    const sortedTeams = teamArray.sort((a, b) => a.name.localeCompare(b.name));
    for (const team of sortedTeams) {
      const teamElement = items[index];
      index++;

      expect(teamElement.getAttribute('id')).to.equal(team.id, 'Team id');
      expect(teamElement.textContent).to.equal(team.name, 'Team name');
    }

    expect(el).shadowDom.to.equalSnapshot();
  });

  it('renders placeholder when no teams created yet', async () => {
    populateDialog('', []);
    await el.show();

    const items = getTeamItems();
    expect(items.length).to.equal(0, 'Team list should be empty');

    const placeholder = el.shadowRoot?.querySelector('div > p.empty-list');
    expect(placeholder, 'Empty placeholder element').to.exist;

    const selectButton = getSelectButton();
    expect(selectButton.disabled, 'Select button should be disabled').to.be.true;

    const newTeamButton = getNewTeamButton();
    expect(newTeamButton.disabled, 'New team button should always be enabled').to.be.false;

    expect(el).shadowDom.to.equalSnapshot();
  });

  it('select team when item clicked', async () => {
    const selectedTeamId = 't2';
    populateDialog('t1');
    await el.show();

    const items = getTeamItems();
    let itemToSelect: Element;
    for (const item of Array.from(items)) {
      if (item.getAttribute('id') === selectedTeamId) {
        itemToSelect = item;
        break;
      }
    }
    expect(itemToSelect!, `Item should exist for id ${selectedTeamId}`).to.exist;
    const teamElement = itemToSelect! as HTMLElement;

    expect(teamElement.hasAttribute('selected'),
      `List item for ${selectedTeamId} should not be selected yet`).to.be.false;

    setTimeout(() => teamElement.click());
    await oneEvent(teamElement, 'click');
    await nextFrame();

    expect(teamElement.hasAttribute('selected'),
      `List item for ${selectedTeamId} should be selected`).to.be.true;
    expect(teamElement).to.equalSnapshot();
  });

  it('fires event when team selected', async () => {
    const selectedTeamId = 't3';
    populateDialog(selectedTeamId);
    await el.show();

    const items = getTeamItems();
    let teamElement;
    for (const item of Array.from(items)) {
      if (item.getAttribute('id') === selectedTeamId) {
        teamElement = item;
        break;
      }
    }
    expect(teamElement, `Item should be selected for id ${selectedTeamId}`).to.exist;

    const selectButton = getSelectButton();
    setTimeout(() => selectButton.click());

    const { detail } = await oneEvent(el, 'team-changed');

    expect(detail).to.deep.equal(
      {
        teamId: selectedTeamId,
      });
  });

  it('fires event to add new team, with existing team selected', async () => {
    populateDialog('t1');
    await el.show();

    const newTeamButton = getNewTeamButton();
    setTimeout(() => newTeamButton.click());

    const { detail } = await oneEvent(el, 'add-new-team');

    expect(detail, 'New team event has no detail').not.to.exist;
  });

  it.skip('clears selected team when dialog closed for selection', async () => {
  });

  it.skip('clears selected team when dialog closed for new team', async () => {
  });

  it.skip('clears selected team when dialog closed by cancel', async () => {
  });

  // TODO: Fix various accessibility warnings
  it.skip('a11y', async () => {
    populateDialog('t1');
    await el.show();

    await expect(el).to.be.accessible();
  });

}); // describe('lineup-team-selector-dialog tests')
