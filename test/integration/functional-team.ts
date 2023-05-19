/** @format */

import { expect } from 'chai';
import { integrationTestData } from './data/integration-data-constants.js';
import { PageObject } from './pages/page-object.js';
import { TeamCreatePage } from './pages/team-create-page.js';
// import { TeamRosterPage } from './pages/team-roster-page';

describe('Team functional tests', () => {
  let pageObject: PageObject;

  afterEach(async () => {
    await pageObject?.close();
  });

  it('creates new team', async () => {
    const addTeamPage = new TeamCreatePage({
      userId: integrationTestData.TEAM2.OWNER_ID,
    });
    pageObject = addTeamPage;
    await addTeamPage.init();
    await addTeamPage.open({ signIn: true });

    await addTeamPage.fillTeamDetails('A functional team');
    await addTeamPage.saveNewTeam();

    // Verifies that the new team is created and set as the current team.
    const currentTeam = await addTeamPage.getCurrentTeam();
    expect(currentTeam?.name).to.equal('A functional team', 'Newly-created team name');

    // Verifies that the new team was saved to storage.
    // TODO: Implement check once Firebase writes are working

    // Verifies that navigated to home page after creating team.
    // expect(pageObject.currentRoute).to.equal(HomePage.defaultRoute, 'Should navigate to home page');
  });

  it.skip('change current team', async () => {
    // TODO: Implement test for changing between existing teams,
    // including asserting that list of teams is retrieved correctly.
  });

  it.skip('add player to team roster', async () => {
    // TODO: Implement test for adding a new player,
    // including asserting that player is persisted to storage correctly.
  });
});
