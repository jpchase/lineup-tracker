import { expect } from 'chai';
import { DevServer, startTestServer } from './server/test-server.js';
import { PageObject } from './pages/page-object.js';
import { TeamCreatePage } from './pages/team-create-page.js';
import { TeamRosterPage } from './pages/team-roster-page.js';

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

  describe('Team roster', function () {
    function sleep(ms: number) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }

    it('creates a new player', async function () {
      const rosterPage = pageObject = new TeamRosterPage();
      await rosterPage.init();
      await rosterPage.open();
      await rosterPage.signin();

      // Get the existing list of players.
      //  - Wait for roster to load from storage.
      // TODO: Better wait than a sleep?
      await sleep(1000);
      const existingPlayers = await rosterPage.getPlayers();

      console.log(`Existing players: ${JSON.stringify(existingPlayers)}`);

      await rosterPage.showCreateWidget();
      await rosterPage.fillPlayerFields('Player 44', 44);
      await rosterPage.saveNewPlayer();

      // Verifies that the new team is created and set as the current team.
      const currentPlayers = await rosterPage.getPlayers();
      console.log(`Current players: ${JSON.stringify(currentPlayers)}`);

      expect(currentPlayers.length, 'Number of players').to.equal(existingPlayers.length + 1);
      const addedPlayer = currentPlayers.find(player => player.name === 'Player 44' && player.uniformNumber === 44);
      expect(addedPlayer, `Newly-created player: 'Player 44', #44`).to.exist;

      // Verifies that the new player was saved to storage.
      // TODO: Implement check once Firebase writes are working
    });
  }); // describe('Team roster')

});
