/** @format */

import { expect } from 'chai';
import { integrationTestData } from './data/integration-data-constants.js';
import { GameLivePage } from './pages/game-live-page.js';
import { GameSetupPage, SetupStatus, SetupSteps } from './pages/game-setup-page.js';
import { PageObject, logWithTime } from './pages/page-object.js';
import { Firestore, createAdminApp, getFirestore } from './server/firestore-access.js';

describe('Live functional tests', () => {
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

  async function expectStarters(page: GameSetupPage, expectedPlayers: string[]) {
    const actualPlayers = await page.getStarters();
    const playerIds = actualPlayers.map((player) => player.id);
    expect(playerIds, 'Actual starters').to.have.members(expectedPlayers);
  }

  async function expectClockRunning(livePage: GameLivePage, running: boolean) {
    const timer = await livePage.getGameClock();
    expect(timer?.isRunning ?? false, 'Game clock running?').to.equal(running);
  }

  async function expectClockStart(livePage: GameLivePage, startTime: number) {
    const timer = await livePage.getGameClock();
    expect(timer?.startTime, 'Game clock start').to.equal(startTime);
  }

  async function expectOnPlayers(livePage: GameLivePage, expectedPlayers: string[]) {
    const actualPlayers = await livePage.getOnPlayers();
    const playerIds = actualPlayers.map((player) => player.id);
    expect(playerIds, 'Actual players').to.have.members(expectedPlayers);
  }

  it('setup existing game, which is persisted after refresh', async () => {
    const gameSetupPage = new GameSetupPage({
      userId: integrationTestData.TEAM2.OWNER_ID,
      team: { teamId: integrationTestData.TEAM2.ID },
      gameId: integrationTestData.TEAM2.games.NEW_WITH_ROSTER.ID,
    });
    pageObject = gameSetupPage;
    await gameSetupPage.init();
    await gameSetupPage.open({ signIn: true });

    // Roster is already populated on the game, mark the step as done.
    logWithTime('mark roster done');
    await gameSetupPage.markStepDone(SetupSteps.Roster);
    logWithTime('check roster step status');
    await expectStepComplete(gameSetupPage, SetupSteps.Roster);

    logWithTime('reload at roster step');
    await gameSetupPage.reload({ signIn: true });
    logWithTime('after reload, check roster step status');
    await expectStepComplete(gameSetupPage, SetupSteps.Roster);

    // Complete the formation step.
    logWithTime('Set formation');
    await gameSetupPage.setFormation('4-3-3');
    logWithTime('check formation step status');
    await expectStepComplete(gameSetupPage, SetupSteps.Formation);

    logWithTime('reload at formation step');
    await gameSetupPage.reload({ signIn: true });
    logWithTime('after reload, check formation step status');
    await expectStepComplete(gameSetupPage, SetupSteps.Formation);

    // Complete the starters step.
    const starters = integrationTestData.TEAM2.games.NEW_WITH_ROSTER.PLAYER_IDS.slice(0, 11);

    logWithTime('Set starters');
    await gameSetupPage.setStarters(starters);
    logWithTime('check starters are populated');
    await expectStarters(gameSetupPage, starters);

    logWithTime('reload at starters step');
    await gameSetupPage.reload({ signIn: true });
    logWithTime('after reload, check starters are still populated');
    await expectStarters(gameSetupPage, starters);

    logWithTime('reload (again) at starters step');
    await gameSetupPage.reload({ signIn: true });
    logWithTime('mark starters done');
    await gameSetupPage.markStepDone(SetupSteps.Starters);
    logWithTime('check starters step status');
    await expectStepComplete(gameSetupPage, SetupSteps.Starters);

    logWithTime('reload (last time) at starters step');
    await gameSetupPage.reload({ signIn: true });
    logWithTime('after reload, check starters step status');
    await expectStepComplete(gameSetupPage, SetupSteps.Starters);

    // Complete the periods step.
    logWithTime('Set periods');
    await gameSetupPage.setPeriods(4, 20);
    logWithTime('check periods step status');
    await expectStepComplete(gameSetupPage, SetupSteps.Periods);

    logWithTime('reload at periods step');
    await gameSetupPage.reload({ signIn: true });
    logWithTime('after reload, check periods step status');
    await expectStepComplete(gameSetupPage, SetupSteps.Periods);

    // Captains step is currently a no-op, mark the step as done.
    logWithTime('mark captains done');
    await gameSetupPage.markStepDone(SetupSteps.Captains);
    logWithTime('check captains step status');
    await expectStepComplete(gameSetupPage, SetupSteps.Captains);

    logWithTime('reload at captains step');
    await gameSetupPage.reload({ signIn: true });
    logWithTime('after reload, check captains step status');
    await expectStepComplete(gameSetupPage, SetupSteps.Captains);
  });

  it('game in-progress is restored after refresh', async () => {
    // Create page in live view, with game ready to be started.
    const { livePage, newGame, starters } = await GameLivePage.createLivePage(
      {
        userId: integrationTestData.TEAM2.OWNER_ID,
        team: { teamId: integrationTestData.TEAM2.ID },
        gameId: integrationTestData.TEAM2.games.NEW_WITH_ROSTER.ID,
      },
      firestore
    );
    pageObject = livePage;

    // Until game is started running, all players still have Off status.
    const onPlayers = starters;
    const offPlayers = Object.keys(newGame.roster).filter(
      (playerId) => !starters.includes(playerId)
    );

    // Start the game running.
    await expectClockRunning(livePage, /*running=*/ false);

    await livePage.startGamePeriod();
    await expectClockRunning(livePage, /*running=*/ true);
    await expectOnPlayers(livePage, onPlayers);

    // Check the game is still running after refresh.
    await livePage.reload({ signIn: true });

    await expectClockRunning(livePage, /*running=*/ true);
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

  it.only('game event edits are applied', async () => {
    // Create page in live view, with game ready to be started.
    const { livePage, newGame, starters } = await GameLivePage.createLivePage(
      {
        userId: integrationTestData.TEAM2.OWNER_ID,
        team: { teamId: integrationTestData.TEAM2.ID },
        gameId: integrationTestData.TEAM2.games.NEW_WITH_ROSTER.ID,
      },
      firestore
    );
    pageObject = livePage;

    // Until game is started running, all players still have Off status.
    const onPlayers = starters;
    const offPlayers = Object.keys(newGame.roster).filter(
      (playerId) => !starters.includes(playerId)
    );

    // Start the game running.
    await expectClockRunning(livePage, /*running=*/ false);

    await livePage.startGamePeriod();
    await expectClockRunning(livePage, /*running=*/ true);
    await expectOnPlayers(livePage, onPlayers);

    // Perform a substitution.
    const subbedPlayers = onPlayers.slice(1);
    subbedPlayers.push(offPlayers[0]);
    await livePage.substitutePlayer(onPlayers[0], offPlayers[0]);
    await expectOnPlayers(livePage, subbedPlayers);

    // Edit the period start time.
    const clockData = (await livePage.getGameClock())!;
    const newStartTime = clockData.startTime! - 30;
    await livePage.editPeriodStart(newStartTime);
    await expectClockStart(livePage, newStartTime);
  });

  it.skip('finished game is synced to storage', async () => {
    // TODO: Need game "3", which is in-progress, in Live status
    // TODO: Implement test for adding a new player to game roster,
    // including asserting that player is persisted to storage correctly.
  });
});
