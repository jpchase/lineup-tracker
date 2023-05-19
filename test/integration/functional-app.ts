/** @format */

import { expect } from 'chai';
import { integrationTestData } from './data/integration-data-constants.js';
import { HomePage } from './pages/home-page.js';
import { PageObject } from './pages/page-object.js';

describe('App functional tests', () => {
  let pageObject: PageObject;

  afterEach(async () => {
    await pageObject?.close();
  });

  it('current team is persisted after refresh', async () => {
    const teamName = 'Persisted current team';
    const homePage = (pageObject = new HomePage({
      userId: integrationTestData.TEAM2.OWNER_ID,
      team: { teamId: integrationTestData.TEAM2.ID, teamName },
    }));
    await homePage.init();
    await homePage.open({ signIn: true });

    // Verify that the current team is set (via test querystring).
    let currentTeam = await homePage.getCurrentTeam();
    expect(currentTeam?.name, 'Current team should be set').to.equal(teamName);

    // Verify that the current team is restored after refreshing the page.
    await homePage.reload({ signIn: true, ignoreTeamOption: true });

    currentTeam = await homePage.getCurrentTeam();
    expect(currentTeam?.name, 'Current team should be restored').to.equal(teamName);
  });

  it.skip('clears current team on sign out', async () => {
    // TODO: Implement test for signing out and clearing data.
  });
});
