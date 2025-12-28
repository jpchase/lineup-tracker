/** @format */

import '@app/components/lineup-team-selector-dialog.js';
import {
  AddNewTeamEvent,
  LineupTeamSelectorDialog,
  TeamChangedEvent,
} from '@app/components/lineup-team-selector-dialog.js';
import { Team } from '@app/models/team.js';
import { Button } from '@material/mwc-button';
import { ListItem } from '@material/mwc-list/mwc-list-item.js';
import { aTimeout, expect, fixture, html, nextFrame, oneEvent } from '@open-wc/testing';
import { buildTeams } from '../helpers/test_data.js';

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
  },
];

describe('lineup-team-selector-dialog tests', () => {
  let el: LineupTeamSelectorDialog;

  beforeEach(async () => {
    el = await fixture(html`<lineup-team-selector-dialog></lineup-team-selector-dialog>`);
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

  function getTeamItem(teamId: string) {
    const items = getTeamItems();
    let teamItem: Element;
    for (const item of Array.from(items)) {
      if (item.getAttribute('id') === teamId) {
        teamItem = item;
        break;
      }
    }
    return teamItem! as HTMLElement;
  }

  async function selectTeamItem(teamId: string) {
    const teamElement = getTeamItem(teamId);
    if (!teamElement) {
      throw new ReferenceError(`Item should exist for id ${teamId}`);
    }
    const teamListItem = teamElement as ListItem;
    teamListItem.selected = true;
    await Promise.race([nextFrame(), aTimeout(10)]);
    return teamListItem;
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
      index += 1;

      expect(teamElement.getAttribute('id')).to.equal(team.id, 'Team id');
      expect(teamElement.querySelector('span')?.textContent).to.equal(team.name, 'Team name');
    }

    await expect(el).shadowDom.to.equalSnapshot();
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

    await expect(el).shadowDom.to.equalSnapshot();
  });

  it('select team when item clicked', async () => {
    const selectedTeamId = 't2';
    populateDialog('t1');
    await el.show();

    const teamElement = getTeamItem(selectedTeamId);
    expect(teamElement, `Item should exist for id ${selectedTeamId}`).to.exist;

    expect(
      teamElement.hasAttribute('selected'),
      `List item for ${selectedTeamId} should not be selected yet`,
    ).to.be.false;

    setTimeout(() => teamElement.click());
    await oneEvent(teamElement, 'click');
    await Promise.race([nextFrame(), aTimeout(10)]);

    expect(
      teamElement.hasAttribute('selected'),
      `List item for ${selectedTeamId} should be selected`,
    ).to.be.true;
    await expect(teamElement).to.equalSnapshot();
  });

  it('fires event when team selected', async () => {
    const selectedTeamId = 't3';
    const teams = populateDialog('t1');
    await el.show();

    const teamElement = getTeamItem(selectedTeamId);
    expect(teamElement, `Item should exist for id ${selectedTeamId}`).to.exist;
    (teamElement as ListItem).selected = true;

    const selectButton = getSelectButton();
    setTimeout(() => selectButton.click());

    const { detail } = await oneEvent(el, TeamChangedEvent.eventName);

    expect(detail).to.deep.equal({
      teamId: selectedTeamId,
      teamName: teams.find((team) => team.id === selectedTeamId)!.name,
    });
  });

  it('fires event to add new team, with existing team selected', async () => {
    populateDialog('t1');
    await el.show();

    const newTeamButton = getNewTeamButton();
    setTimeout(() => newTeamButton.click());

    const { detail } = await oneEvent(el, AddNewTeamEvent.eventName);

    expect(detail, 'New team event has no detail').not.to.exist;
  });

  it('select button disabled when no team selected', async () => {
    populateDialog('t1');
    await el.show();

    const selectButton = getSelectButton();
    expect(selectButton.disabled, 'Select button should be disabled').to.be.true;
  });

  it('select button disabled when selection matches current team', async () => {
    const selectedTeamId = 't1';
    populateDialog(selectedTeamId);
    await el.show();

    await selectTeamItem(selectedTeamId);

    const selectButton = getSelectButton();
    expect(selectButton.disabled, 'Select button should be disabled').to.be.true;
  });

  it('clears selected team when dialog reopened', async () => {
    const selectedTeamId = 't2';
    populateDialog(selectedTeamId);
    await el.show();

    const teamElement = await selectTeamItem(selectedTeamId);
    expect(
      teamElement.hasAttribute('selected'),
      `List item for ${selectedTeamId} should be selected`,
    ).to.be.true;

    const selectButton = getSelectButton();
    setTimeout(() => selectButton.click());
    await oneEvent(el, TeamChangedEvent.eventName);

    await el.show();
    expect(
      teamElement.hasAttribute('selected'),
      `List item for ${selectedTeamId} should no longer be selected`,
    ).to.be.false;
  });

  // TODO: Fix various accessibility warnings
  it.skip('a11y', async () => {
    populateDialog('t1');
    await el.show();

    await expect(el).to.be.accessible();
  });
}); // describe('lineup-team-selector-dialog tests')
