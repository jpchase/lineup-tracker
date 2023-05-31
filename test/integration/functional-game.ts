/** @format */

import { Game } from '@app/models/game.js';
import rtk from '@reduxjs/toolkit';
import { expect } from 'chai';
import { integrationTestData } from './data/integration-data-constants.js';
import { GameCreatePage } from './pages/game-create-page.js';
import { GameRosterPage } from './pages/game-roster-page.js';
import { PageObject } from './pages/page-object.js';
import {
  Firestore,
  createAdminApp,
  getFirestore,
  readGame,
  readGameRoster,
} from './server/firestore-access.js';
const { nanoid } = rtk;

describe('Game functional tests', () => {
  let firestore: Firestore;
  let pageObject: PageObject;

  before(async () => {
    const firebaseApp = createAdminApp();
    firestore = getFirestore(firebaseApp);
  });

  afterEach(async () => {
    await pageObject?.close();
  });

  it('create new game', async () => {
    const addGamePage = new GameCreatePage({
      userId: integrationTestData.TEAM2.OWNER_ID,
      team: { teamId: integrationTestData.TEAM2.ID },
    });
    pageObject = addGamePage;
    await addGamePage.init();
    await addGamePage.open({ signIn: true });

    // Set the game date to 1 day in the future from the current time (excluding seconds).
    const gameDate = new Date();
    gameDate.setUTCDate(gameDate.getUTCDate() + 1);
    gameDate.setUTCSeconds(0, 0);
    const newGame = {
      name: 'New Game - ' + nanoid(),
      opponent: 'Integration Opponent',
      date: gameDate,
    } as Game;

    const createComponent = await addGamePage.getCreateComponent();
    await addGamePage.fillGameDetails(newGame, createComponent);
    await addGamePage.saveNewGame(createComponent);

    // Verify that the new game is created and shows in the list.
    const gameId = await addGamePage.getGameId(newGame);
    expect(gameId).to.match(/^[A-Za-z0-9]{10,}$/, 'Newly-created game id');

    // Verify that the new game was saved to storage.
    const storedGame = await readGame(firestore, gameId!);
    expect(storedGame, 'New game should be saved to storage').to.deep.include({
      ...newGame,
      id: gameId,
      teamId: integrationTestData.TEAM2.ID,
    });
  });

  it('copy roster from team', async () => {
    const gameId = integrationTestData.TEAM2.games.NEW.ID;
    const gameRosterPage = new GameRosterPage({
      userId: integrationTestData.TEAM2.OWNER_ID,
      team: { teamId: integrationTestData.TEAM2.ID },
      gameId,
    });
    pageObject = gameRosterPage;
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
    const roster = await readGameRoster(firestore, gameId);
    expect(Object.keys(roster).length, 'Copied players should be saved to storage').to.equal(16);
  });

  it.skip('add player to game roster', async () => {
    // TODO: Implement test for adding a new player to game roster,
    // including asserting that player is persisted to storage correctly.
  });
});
