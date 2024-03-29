/** @format */

import '@app/components/lineup-team-selector.js';
import { LineupTeamSelector, SelectTeamEvent } from '@app/components/lineup-team-selector.js';
import { Team } from '@app/models/team.js';
import { Button } from '@material/mwc-button';
import { expect, fixture, html, oneEvent } from '@open-wc/testing';
import { buildTeams } from '../helpers/test_data.js';

const TEAMID1 = 't1';
const TEAMS: Team[] = [
  {
    id: TEAMID1,
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

describe('lineup-team-selector tests', () => {
  let el: LineupTeamSelector;
  beforeEach(async () => {
    el = await fixture(html`<lineup-team-selector></lineup-team-selector>`);
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
    expect(el.currentTeam).to.be.undefined;
  });

  it('renders name for current team', async () => {
    const teams = getTeams();
    el.currentTeam = {
      id: TEAMID1,
      name: teams[TEAMID1].name,
    };
    await el.updateComplete;

    const button = getTeamButton();
    expect(button, 'Missing team switcher').to.exist;

    expect(button.textContent).to.be.equal(teams[TEAMID1].name, 'Team name');
  });

  it('renders placeholder when no current team set', async () => {
    el.currentTeam = undefined;
    await el.updateComplete;

    const button = getTeamButton();
    expect(button, 'Missing team switcher').to.exist;

    expect(button.textContent).to.be.equal('Select a team', 'Team name');

    // Verify the aria label has placeholder text.
    await expect(el).shadowDom.to.equalSnapshot();
  });

  it('fires event to select team, with existing team selected', async () => {
    const teams = getTeams();
    el.currentTeam = {
      id: TEAMID1,
      name: teams[TEAMID1].name,
    };
    await el.updateComplete;

    const teamButton = getTeamButton();
    setTimeout(() => teamButton.click());

    const { detail } = await oneEvent(el, SelectTeamEvent.eventName);

    expect(detail, 'Select team event has no detail').not.to.exist;
  });

  it('fires event to select team, when no current team set', async () => {
    el.currentTeam = undefined;
    await el.updateComplete;

    const teamButton = getTeamButton();
    setTimeout(() => teamButton.click());

    const { detail } = await oneEvent(el, SelectTeamEvent.eventName);

    expect(detail, 'Select team event has no detail').not.to.exist;
  });

  it('a11y', async () => {
    const teams = getTeams();
    el.currentTeam = {
      id: TEAMID1,
      name: teams[TEAMID1].name,
    };
    await el.updateComplete;

    await expect(el).to.be.accessible();
    await expect(el).shadowDom.to.equalSnapshot();
  });
}); // describe('lineup-team-selector tests')
