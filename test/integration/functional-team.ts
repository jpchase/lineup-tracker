/** @format */

import { expect } from 'chai';
import { integrationTestData } from './data/integration-data-constants.js';
import { HomePage } from './pages/home-page.js';
import { PageObject } from './pages/page-object.js';
import { TeamCreatePage } from './pages/team-create-page.js';
import {
  createAdminApp,
  Firestore,
  getFirestore,
  readTeam,
  readTeamRoster,
} from './server/firestore-access.js';
import { TeamRosterPage } from './pages/team-roster-page.js';

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

  it('add player to team roster', async () => {
    // Create roster page, populated from newly-created team roster.
    const { rosterPage, team, roster } = await TeamRosterPage.createRosterPage(
      {
        userId: integrationTestData.TEAM2.OWNER_ID,
        team: { teamId: integrationTestData.TEAM2.ID },
      },
      firestore,
    );
    pageObject = rosterPage;

    const originalPlayers = Object.values(roster);

    // Ensure unique name and uniform number for the new player.
    //  - The number is set to <max uniform number from existing players> + 1.
    const newPlayerName = `A functional player [${Math.floor(Math.random() * 1000)}]`;
    const uniformNumber =
      originalPlayers.reduce(
        (previousMax, player) => Math.max(previousMax, player.uniformNumber),
        0,
      ) + 1;

    await rosterPage.addPlayer(newPlayerName, uniformNumber);

    // Verify that the new player is added to the roster.
    const existingPlayers = await rosterPage.getPlayers();
    expect(existingPlayers.length, 'Roster in page should have 1 player added').to.equal(
      originalPlayers.length + 1,
    );
    const newPlayer = existingPlayers.find(
      (player) => player.name === newPlayerName && player.uniformNumber === uniformNumber,
    );
    expect(newPlayer?.uniformNumber, 'Newly-created player should be shown in roster').to.equal(
      uniformNumber,
    );

    // Verify that the new player was saved to storage.
    const storedRoster = await readTeamRoster(firestore, team.id!);
    const storedPlayers = Object.values(storedRoster);
    expect(storedPlayers.length, 'Stored roster should have 1 player added').to.equal(
      originalPlayers.length + 1,
    );
    const storedNewPlayer = storedPlayers.find(
      (player) => player.name === newPlayerName && player.uniformNumber === uniformNumber,
    );
    expect(storedNewPlayer, 'New player should be in stored roster').to.be.ok;
  });
});
