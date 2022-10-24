import { expect } from 'chai';
import { integrationTestData } from './data/integration-data-constants.js';
import { GameSetupPage, SetupStatus, SetupSteps } from './pages/game-setup-page.js';
import { PageObject } from './pages/page-object.js';
import { DevServer, startTestServer } from './server/test-server.js';

describe('Live functional tests', function () {
  let server: DevServer;
  let pageObject: PageObject;

  before(async function () {
    server = await startTestServer();
  });

  after(async () => server.stop());

  afterEach(async () => {
    await pageObject?.close();
  });

  async function expectStepComplete(page: GameSetupPage, step: SetupSteps) {
    const taskHandle = await page.getTaskElement(step);
    const stepStatus = await page.getTaskElementStatus(taskHandle);
    expect(stepStatus, `Step ${step} status`).to.equal(SetupStatus.Complete);
  }

  it('setup existing game, which is persisted after refresh', async function () {
    const gameSetupPage = pageObject = new GameSetupPage({
      userId: integrationTestData.TEAM2.OWNER_ID,
      team: { teamId: integrationTestData.TEAM2.ID },
      gameId: integrationTestData.TEAM2.games.NEW_WITH_ROSTER
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
    // complete each setup step and refresh?
  });

  it.skip('game in-progress is restored after refresh', async function () {
    // TODO: Need game "2", which is already setup, in Start status
    // TODO: Implement test for adding a new player to game roster,
    // including asserting that player is persisted to storage correctly.
  });

  it.skip('finished game is synced to storage', async function () {
    // TODO: Need game "3", which is in-progress, in Live status
    // TODO: Implement test for adding a new player to game roster,
    // including asserting that player is persisted to storage correctly.
  });
});
