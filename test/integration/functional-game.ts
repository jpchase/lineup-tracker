import { expect } from 'chai';
import { DevServer, startTestServer } from './server/test-server.js';
import { PageObject } from './pages/page-object.js';
import { GameCreatePage } from './pages/game-create-page.js';
import { Game } from '@app/models/game.js';
import rtk from '@reduxjs/toolkit';
import { GameRosterPage } from './pages/game-roster-page.js';
import { integrationTestData } from './data/integration-data-constants.js';
const { nanoid } = rtk;

describe('Game functional tests', function () {
  let server: DevServer;
  let pageObject: PageObject;

  before(async function () {
    server = await startTestServer();
  });

  after(async () => server.stop());

  afterEach(async () => {
    await pageObject?.close();
  });

  it('create new game', async function () {
    const addGamePage = pageObject = new GameCreatePage({ teamId: integrationTestData.TEAM1.ID });
    await addGamePage.init();
    await addGamePage.open({ signIn: true });

    const gameDate = new Date();
    gameDate.setUTCDate(gameDate.getUTCDate() + 1);
    const newGame = {
      name: 'New Game - ' + nanoid(),
      opponent: 'Integration Opponent',
      date: gameDate
    } as Game;

    await addGamePage.fillGameDetails(newGame);
    await addGamePage.saveNewGame();

    // Verify that the new game is created and shows in the list.
    const gameId = await addGamePage.getGameId(newGame);
    expect(gameId).to.match(/^[A-Za-z0-9]{10,}$/, 'Newly-created game id');

    // Verify that the new game was saved to storage.
    // TODO: Implement check once Firebase writes are working
  });

  it('copy roster from team', async function () {
    const gameRosterPage = pageObject = new GameRosterPage({
      userId: integrationTestData.TEAM2.OWNER_ID,
      teamId: integrationTestData.TEAM2.ID,
      gameId: integrationTestData.TEAM2.NEW_GAME_ID
    });
    await gameRosterPage.init();
    await gameRosterPage.open({ signIn: true });

    // Verify that the game roster is initially empty.
    const emptyPlayers = await gameRosterPage.getPlayers();
    expect(emptyPlayers, 'Game should not have any players').to.be.empty;

    await gameRosterPage.copyTeamRoster();

    // Verify that the game roster now contains all the players from the team.
    const players = await gameRosterPage.getPlayers();
    expect(players.length, 'All players should be copied from team roster').to.equal(16);

    // Verify that the players are stored for the game roster.
    // TODO: Implement check once Firebase writes are working
  });

  it.skip('add player to game roster', async function () {
    // TODO: Implement test for adding a new player to game roster,
    // including asserting that player is persisted to storage correctly.
  });

});
