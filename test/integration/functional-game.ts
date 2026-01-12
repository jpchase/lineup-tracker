/** @format */

import { Game } from '@app/models/game.js';
import { nanoid } from '@reduxjs/toolkit';
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
      name: `New Game - ${nanoid()}`,
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
    // Create roster page, populated from newly-created game with empty roster.
    const { rosterPage, game } = await GameRosterPage.createRosterPage(
      {
        userId: integrationTestData.TEAM2.OWNER_ID,
        team: { teamId: integrationTestData.TEAM2.ID },
        gameId: integrationTestData.TEAM2.games.NEW.ID,
      },
      firestore,
    );
    pageObject = rosterPage;

    // Verify that the game roster is initially empty.
    const emptyPlayers = await rosterPage.getPlayers(/*allowEmpty=*/ true);
    expect(emptyPlayers, 'Game should not have any players').to.be.empty;

    await rosterPage.copyTeamRoster();

    // Verify that the game roster now contains all the players from the team.
    const players = await rosterPage.getPlayers();
    expect(players.length, 'All players should be copied from team roster').to.equal(16);

    // Verify that the players are stored for the game roster.
    const roster = await readGameRoster(firestore, game.id);
    expect(Object.keys(roster).length, 'Copied players should be saved to storage').to.equal(16);
  });

  it('add player to game roster', async () => {
    // Create roster page, populated from newly-created game with roster.
    const { rosterPage, game } = await GameRosterPage.createRosterPage(
      {
        userId: integrationTestData.TEAM2.OWNER_ID,
        team: { teamId: integrationTestData.TEAM2.ID },
        gameId: integrationTestData.TEAM2.games.NEW_WITH_ROSTER.ID,
      },
      firestore,
    );
    pageObject = rosterPage;

    const originalPlayers = Object.values(game.roster);

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
    const storedRoster = await readGameRoster(firestore, game.id);
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
