import { expect } from 'chai';
import { PageObject } from './pages/page-object.js';
import { TeamCreatePage } from './pages/team-create-page.js';
import { DevServer, startTestServer } from './server/test-server.js';
// import { TeamRosterPage } from './pages/team-roster-page';

describe('functional tests', function () {
  let server: DevServer;
  let pageObject: PageObject;

  before(async function () {
    server = await startTestServer();
  });

  after(async () => server.stop());

  afterEach(async () => {
    await pageObject?.close();
  });

  describe('Team', function () {
    it('creates new team', async function () {
      const addTeamPage = pageObject = new TeamCreatePage();
      await addTeamPage.init();
      await addTeamPage.open();
      await addTeamPage.signin();

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

    it.skip('change current team', async function () {
      // TODO: Implement test for changing between existing teams,
      // including asserting that list of teams is retrieved correctly.
    });

    it.skip('add player to team roster', async function () {
      // TODO: Implement test for adding a new player,
      // including asserting that player is persisted to storage correctly.
    });
  }); // describe('Team')
});
