import { expect } from 'chai';
import { Firestore, getFirestore } from 'firebase-admin/firestore';
import { integrationTestData } from './data/integration-data-constants.js';
import { GameLivePage } from './pages/game-live-page.js';
import { GameSetupPage, SetupStatus, SetupSteps } from './pages/game-setup-page.js';
import { PageObject } from './pages/page-object.js';
import { copyGame, createAdminApp } from './server/firestore-access.js';

describe('Live functional tests', function () {
  let firestore: Firestore;
  let pageObject: PageObject;

  before(async () => {
    const firebaseApp = createAdminApp();
    firestore = getFirestore(firebaseApp);
  });

  afterEach(async () => {
    await pageObject?.close();
  });

  async function expectStepComplete(page: GameSetupPage, step: SetupSteps) {
    const taskHandle = await page.getTaskElement(step);
    const stepStatus = await page.getTaskElementStatus(taskHandle);
    expect(stepStatus, `Step ${step} status`).to.equal(SetupStatus.Complete);
  }

  async function expectClockRunning(livePage: GameLivePage, running: boolean) {
    const timer = await livePage.getGameClock();
    expect(timer?.isRunning ?? false, 'Game clock running?').to.equal(running);
  }

  async function expectOnPlayers(livePage: GameLivePage, expectedPlayers: string[]) {
    const actualPlayers = await livePage.getOnPlayers();
    const playerIds = actualPlayers.map((player) => player.id);
    expect(playerIds, 'Actual players').to.have.members(expectedPlayers);
  }

  it('setup existing game, which is persisted after refresh', async function () {
    const gameSetupPage = pageObject = new GameSetupPage({
      userId: integrationTestData.TEAM2.OWNER_ID,
      team: { teamId: integrationTestData.TEAM2.ID },
      gameId: integrationTestData.TEAM2.games.NEW_WITH_ROSTER.ID
    });
    await gameSetupPage.init();
    await gameSetupPage.open({ signIn: true });

    // Complete the formation step.
    console.log('Set formation');
    await gameSetupPage.setFormation('4-3-3');
    console.log('check formation step status')
    await expectStepComplete(gameSetupPage, SetupSteps.Formation);

    console.log('reload at formation step');
    await gameSetupPage.reload({ signIn: true });
    console.log('after reload, check formation step status')
    await expectStepComplete(gameSetupPage, SetupSteps.Formation);

    // Roster is already populated on the game, mark the step as done.
    console.log('mark roster done')
    await gameSetupPage.markStepDone(SetupSteps.Roster);
    console.log('check roster step status')
    await expectStepComplete(gameSetupPage, SetupSteps.Roster);

    console.log('reload at roster step');
    await gameSetupPage.reload({ signIn: true });
    console.log('after reload, check roster step status')
    await expectStepComplete(gameSetupPage, SetupSteps.Roster);

    // Captains step is currently a no-op, mark the step as done.
    console.log('mark captains done')
    await gameSetupPage.markStepDone(SetupSteps.Captains);
    console.log('check captains step status')
    await expectStepComplete(gameSetupPage, SetupSteps.Captains);

    console.log('reload at captains step');
    await gameSetupPage.reload({ signIn: true });
    console.log('after reload, check captains step status')
    await expectStepComplete(gameSetupPage, SetupSteps.Captains);
  });

  it('game in-progress is restored after refresh', async function () {
    // Create a new game, with roster, by copying the existing game.
    const newGame = await copyGame(firestore,
      integrationTestData.TEAM2.games.NEW_WITH_ROSTER.ID,
      integrationTestData.TEAM2.OWNER_ID);
    const players = newGame.roster;

    const onPlayers = Object.keys(players).slice(0, 11);
    const offPlayers = Object.keys(players).slice(11);

    // Open the page *after* creating the game.
    // As the game is in "new" status, it starts on the setup view.
    const gameSetupPage = pageObject = new GameSetupPage({
      userId: integrationTestData.TEAM2.OWNER_ID,
      team: { teamId: integrationTestData.TEAM2.ID },
      gameId: newGame.id
    });
    await gameSetupPage.init();
    await gameSetupPage.open({ signIn: true });

    // Complete all the setup to get the game into Start status.
    await gameSetupPage.completeSetup(onPlayers);

    // With setup completed, the page should now be on the live view.
    const livePage = pageObject = gameSetupPage.swap(GameLivePage, {
      userId: integrationTestData.TEAM2.OWNER_ID,
      team: { teamId: integrationTestData.TEAM2.ID },
      gameId: newGame.id
    });

    // Start the game running.
    await expectClockRunning(livePage, /*running=*/false);

    await livePage.startGamePeriod();
    await expectClockRunning(livePage, /*running=*/true);
    await expectOnPlayers(livePage, onPlayers);

    // Check the game is still running after refresh.
    await livePage.reload({ signIn: true });

    await expectClockRunning(livePage, /*running=*/true);
    await expectOnPlayers(livePage, onPlayers);

    // Perform a substitution, and check that it's persisted after refresh.
    const subbedPlayers = onPlayers.slice(1);
    subbedPlayers.push(offPlayers[0]);
    await livePage.substitutePlayer(onPlayers[0], offPlayers[0]);
    await expectOnPlayers(livePage, subbedPlayers);

    await livePage.reload({ signIn: true });
    await expectOnPlayers(livePage, subbedPlayers);

    // TODO: implement reading from IDB
    /*
    const storedGame = await readLiveGame(livePage);
    expect(storedGame, 'New game should be saved to storage').to.deep.include({
      ...newGame,
      id: newGame.id,
      teamId: integrationTestData.TEAM2.ID
    });
    expect(storedGame.players).to.equal('all the players in the correct status, along with timers');
    */
  });

  it.skip('finished game is synced to storage', async function () {
    // TODO: Need game "3", which is in-progress, in Live status
    // TODO: Implement test for adding a new player to game roster,
    // including asserting that player is persisted to storage correctly.
  });
});
