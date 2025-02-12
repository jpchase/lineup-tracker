/** @format */

import { expect } from 'chai';
import { integrationTestData } from './data/integration-data-constants.js';
import { HomePage } from './pages/home-page.js';
import { PageObject } from './pages/page-object.js';
import { TeamCreatePage } from './pages/team-create-page.js';
import { createAdminApp, Firestore, getFirestore, readTeam } from './server/firestore-access.js';
// import { TeamRosterPage } from './pages/team-roster-page';

describe('Team functional tests', () => {
  let firestore: Firestore;
  let pageObject: PageObject;

  before(async () => {
    const firebaseApp = createAdminApp();
    firestore = getFirestore(firebaseApp);
  });

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

    const newTeamName = `A functional team [${Math.floor(Math.random() * 1000)}]`;

    const createComponent = await addTeamPage.getCreateComponent();
    await addTeamPage.fillTeamDetails(newTeamName, createComponent);
    await addTeamPage.saveNewTeam(createComponent);

    // Verify that the new team is created and set as the current team.
    const currentTeam = await addTeamPage.getCurrentTeam();
    expect(currentTeam?.name, 'Newly-created team name').to.equal(newTeamName);

    // Verify that the new team was saved to storage.
    const storedTeam = await readTeam(firestore, currentTeam.id!);
    expect(storedTeam, 'New team should be saved to storage').to.deep.include(currentTeam);

    // Verify that navigated to home page after creating team.
    expect(pageObject.currentRoute).to.equal(HomePage.defaultRoute, 'Should navigate to home page');
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
