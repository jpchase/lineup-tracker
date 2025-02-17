/** @format */

import { RootState, setupStore } from '@app/app/store.js';
import { PageRouter } from '@app/components/core/page-router.js';
import '@app/components/lineup-game-setup.js';
import { LineupGameSetup } from '@app/components/lineup-game-setup.js';
import { LineupOnPlayerList } from '@app/components/lineup-on-player-list.js';
import { LineupPlayerCard, PositionSelectedEvent } from '@app/components/lineup-player-card.js';
import { LineupPlayerList } from '@app/components/lineup-player-list.js';
import { FormationBuilder, FormationType, getPositions } from '@app/models/formation.js';
import { GameDetail, GameStatus } from '@app/models/game.js';
import {
  LiveGame,
  LiveGameBuilder,
  LivePlayer,
  SetupStatus,
  SetupSteps,
  SetupTask,
} from '@app/models/live.js';
import { PlayerStatus } from '@app/models/player.js';
import { actions as liveActions, selectLiveGameById } from '@app/slices/live/live-slice.js';
import { writer } from '@app/storage/firestore-writer.js';
import { Button } from '@material/mwc-button';
import { aTimeout, expect, fixture, html, oneEvent } from '@open-wc/testing';
import sinon from 'sinon';
import { ActionLogger } from '../helpers/action-logger.js';
import { buildGameStateWithCurrentGame } from '../helpers/game-state-setup.js';
import { buildLiveStateWithCurrentGame, buildSetupTasks } from '../helpers/live-state-setup.js';
import { mockPageRouter } from '../helpers/mock-page-router.js';
import { buildRootState } from '../helpers/root-state-setup.js';
import {
  STORED_GAME_ID,
  buildRoster,
  getNewGameDetail,
  getStoredPlayer,
} from '../helpers/test_data.js';

const LAST_SETUP_STEP = SetupSteps.Captains;

const {
  applyStarter,
  cancelStarter,
  captainsCompleted,
  completeRoster,
  configurePeriods,
  formationSelected,
  gameSetupCompleted,
  selectStarter,
  selectStarterPosition,
  startersCompleted,
} = liveActions;

interface TestSetupTask extends SetupTask {
  expectedName?: string;
}

function getGameDetail(): GameDetail {
  return getNewGameDetail(buildRoster([getStoredPlayer()]));
}

function getTestTasks(tasks: SetupTask[]): TestSetupTask[] {
  return tasks.map<TestSetupTask>((task) => {
    let expectedName: string;
    switch (task.step) {
      case SetupSteps.Captains:
        expectedName = 'Captains';
        break;
      case SetupSteps.Formation:
        expectedName = 'Formation';
        break;
      case SetupSteps.Periods:
        expectedName = 'Timing';
        break;
      case SetupSteps.Roster:
        expectedName = 'Roster';
        break;
      case SetupSteps.Starters:
        expectedName = 'Starting lineup';
        break;
      default:
        throw new Error(`Unexpected setup step: ${task.step}`);
    }
    return {
      ...task,
      expectedName,
    };
  });
}

function buildLiveStateWithTasks(
  newGame: GameDetail,
  lastCompletedStep: SetupSteps = -1 as SetupSteps,
) {
  const liveGame = LiveGameBuilder.create(newGame);

  buildSetupTasks(liveGame, lastCompletedStep);

  return buildLiveStateWithCurrentGame(liveGame);
}

function findPlayer(game: LiveGame, status: PlayerStatus) {
  return game.players!.find((player) => player.status === status);
}

describe('lineup-game-setup tests', () => {
  let el: LineupGameSetup;
  let dispatchStub: sinon.SinonSpy;
  let actionLogger: ActionLogger;

  beforeEach(async () => {
    actionLogger = new ActionLogger();
    actionLogger.setup();
  });

  afterEach(async () => {
    sinon.restore();
  });

  async function setupElement(preloadedState?: RootState, gameId?: string): Promise<PageRouter> {
    const store = setupStore(preloadedState, /*hydrate=*/ false);

    const mockRouter = {
      gotoPage: () => {
        // No-op, meant to be spied.
        return Promise.resolve();
      },
    };
    const parentNode = document.createElement('div');
    mockPageRouter(parentNode, mockRouter);
    const template = html`<lineup-game-setup
      .gameId="${gameId}"
      .store=${store}
    ></lineup-game-setup>`;
    el = await fixture(template, { parentNode });
    dispatchStub = sinon.spy(el, 'dispatch');
    return mockRouter;
  }

  function getStore() {
    return el.store!;
  }

  function getInputField(fieldId: string) {
    const field = el.shadowRoot!.querySelector(`#${fieldId} > input`);
    expect(field, `Missing field: ${fieldId}`).to.be.ok;
    return field as HTMLInputElement;
  }

  function getPlayerElement(list: LineupPlayerList, player: LivePlayer): LineupPlayerCard {
    const items = list.shadowRoot!.querySelectorAll('lineup-player-card');

    let playerElement: LineupPlayerCard | undefined;
    for (const element of Array.from(items)) {
      const playerCard = element as LineupPlayerCard;

      if (playerCard.player && playerCard.player.id === player.id) {
        playerElement = playerCard;
        break;
      }
    }

    expect(playerElement, `Missing element for player, id = ${player.id}`).to.be.ok;
    return playerElement!;
  }

  function getPositionElement(list: LineupOnPlayerList, position: string): LineupPlayerCard {
    const items = list.shadowRoot!.querySelectorAll('lineup-player-card');

    let playerElement: LineupPlayerCard | undefined;
    for (const element of Array.from(items)) {
      const playerCard = element as LineupPlayerCard;

      if (playerCard.data && playerCard.data.position && playerCard.data.position.id === position) {
        playerElement = playerCard;
        break;
      }
    }

    expect(playerElement, `Missing element for position, id = ${position}`).to.be.ok;
    return playerElement!;
  }

  function getPlayerSection(mode: string): HTMLDivElement {
    const section = el.shadowRoot!.querySelector(`#live-${mode}`);
    expect(section, `Missing section for mode ${mode}`).to.be.ok;

    return section as HTMLDivElement;
  }

  function getStartersList(): LineupOnPlayerList {
    const element = el.shadowRoot!.querySelector('lineup-on-player-list');
    expect(element, 'Missing starters player list').to.be.ok;

    return element as LineupOnPlayerList;
  }

  function getSubsList(): LineupPlayerList {
    const element = el.shadowRoot!.querySelector('lineup-player-list[mode="off"]');
    expect(element, 'Missing subs player list').to.be.ok;

    return element as LineupPlayerList;
  }

  function getTaskElements() {
    const items = el.shadowRoot!.querySelectorAll('div div.task');
    expect(items, 'Missing items for tasks').to.be.ok;
    return items;
  }

  function getTaskElement(index: number, step?: SetupSteps): HTMLDivElement {
    const items = getTaskElements();

    expect(items.length).to.be.greaterThanOrEqual(
      index + 1,
      `Items doesn't contain index ${index}`,
    );

    const taskElement = items[index];

    if (step) {
      // TODO: Validate the task element is actually for the given |step|
    }

    return taskElement as HTMLDivElement;
  }

  function getTaskDoneButton(step: SetupSteps) {
    const taskElement = getTaskElement(step, step);
    const button = taskElement.querySelector('.status mwc-button.finish');
    expect(button, `Missing task ${step} done button`).to.be.ok;
    return button as Button;
  }

  function getCompleteSetupButton() {
    const button = el.shadowRoot!.querySelector('#complete-button');
    expect(button, 'Missing complete setup button').to.be.ok;
    return button as Button;
  }

  it('starts empty', async () => {
    await setupElement();
    await el.updateComplete;

    const items = getTaskElements();
    expect(items.length).to.equal(0, 'Should be no rendered tasks');

    await expect(el).shadowDom.to.equalSnapshot();
  });

  it('renders all the tasks', async () => {
    const game = getGameDetail();
    const gameState = buildGameStateWithCurrentGame(game);
    const liveState = buildLiveStateWithTasks(game);
    const liveGame = liveState.games![game.id];

    await setupElement(buildRootState(gameState, liveState), game.id);
    await el.updateComplete;

    const items = getTaskElements();
    expect(items.length).to.equal(5, 'Rendered task count');

    const tasks = getTestTasks(liveGame.setupTasks!);
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];

      const taskElement = items[i];

      const nameElement = taskElement.querySelector('.name');
      expect(nameElement, 'Missing name element').to.be.ok;

      const nameAnchor = nameElement!.querySelector('a');
      expect(nameAnchor, 'Missing name anchor').to.be.ok;
      expect(nameAnchor!.textContent).to.equal(task.expectedName);

      const statusElement = taskElement.querySelector('.status');
      expect(statusElement, 'Missing status element').to.be.ok;
      // TODO: Verify elements/content in status div
    }

    await expect(el).shadowDom.to.equalSnapshot();
  });

  it('task links are disabled unless task is active', async () => {
    const game = getGameDetail();
    const gameState = buildGameStateWithCurrentGame(game);
    const liveState = buildLiveStateWithTasks(game);

    await setupElement(buildRootState(gameState, liveState), game.id);
    await el.updateComplete;

    // Verify that test tasks cover active and non-active status.
    const liveGame = selectLiveGameById(getStore().getState(), game.id)!;
    const tasks = liveGame.setupTasks!;
    expect(tasks[0].status).to.equal(SetupStatus.Active);
    expect(tasks[1].status).to.equal(SetupStatus.Pending);

    const items = getTaskElements();

    const activeTaskAnchor = items[0].querySelector('.name a') as HTMLAnchorElement;
    expect(activeTaskAnchor, 'Missing anchor for active task').to.be.ok;
    expect(activeTaskAnchor.href).to.not.be.empty;
    const lastCharIndex = activeTaskAnchor.href.length - 1;
    expect(activeTaskAnchor.href[lastCharIndex]).to.equal('#');

    const pendingTaskAnchor = items[1].querySelector('.name a') as HTMLAnchorElement;
    expect(pendingTaskAnchor, 'Missing anchor for pending task').to.be.ok;
    expect(pendingTaskAnchor.href).to.equal('');
  });

  describe('Setup steps', () => {
    const stepTests = [
      {
        step: SetupSteps.Captains,
        hasDoneButton: true,
        doneActionType: captainsCompleted.type,
      },
      {
        step: SetupSteps.Formation,
        hasDoneButton: false,
      },
      {
        step: SetupSteps.Periods,
        hasDoneButton: false,
      },
      {
        step: SetupSteps.Roster,
        hasDoneButton: true,
        doneActionType: completeRoster.type,
      },
      {
        step: SetupSteps.Starters,
        hasDoneButton: true,
        doneActionType: startersCompleted.type,
      },
    ];

    for (const stepTest of stepTests) {
      const stepName = SetupSteps[stepTest.step];
      // eslint-disable-next-line no-loop-func
      describe(stepName, () => {
        let pageRouterSpy: sinon.SinonSpy;
        let gameId: string;

        beforeEach(async () => {
          const newGame = getGameDetail();
          expect(newGame.status).to.equal(GameStatus.New);

          gameId = newGame.id;

          const gameState = buildGameStateWithCurrentGame(newGame);

          // Sets up the current step as active.
          const liveState = buildLiveStateWithTasks(newGame, stepTest.step - 1);

          const mockRouter = await setupElement(buildRootState(gameState, liveState), gameId);
          pageRouterSpy = sinon.spy(mockRouter, 'gotoPage');
          await el.updateComplete;
        });

        afterEach(() => {
          pageRouterSpy?.restore();
        });

        it('perform handler fires only when active', async () => {
          const taskElement = getTaskElement(stepTest.step, stepTest.step);

          // Spies on the handler, because we want it to execute to verify other behaviour.
          const performSpy = sinon.spy(el, <any>'performStep');

          // Simulates a click on the step link.
          const stepLink = taskElement.querySelector('a.step') as HTMLAnchorElement;
          expect(stepLink, 'Missing perform link for task').to.be.ok;
          stepLink.click();

          // Verifies that handler executed.
          expect(performSpy).to.have.callCount(1);

          if (stepTest.step === SetupSteps.Formation) {
            // Verifies that the formation selector is now showing.
            await el.updateComplete;
            const formationSection = el.shadowRoot!.querySelector('.formation');
            expect(formationSection, 'Missing formation selector widget').to.be.ok;
            expect(formationSection!.hasAttribute('active'), 'Should have active attribute').to.be
              .true;
          } else if (stepTest.step === SetupSteps.Periods) {
            // Verifies that the periods dialog is now showing.
            await el.updateComplete;
            const periodsDialog = el.shadowRoot!.querySelector('#periods-dialog');
            expect(periodsDialog, 'Missing periods dialog').to.be.ok;
            expect(periodsDialog!.hasAttribute('open'), 'Should have open attribute').to.be.true;
          } else if (stepTest.step === SetupSteps.Roster) {
            // Verifies that it navigated to the roster page.
            await el.updateComplete;
            expect(pageRouterSpy).to.be.calledOnceWith(`/gameroster/${gameId}`);
          } else {
            // Other steps should do nothing (they don't have an href on the link).
            expect(dispatchStub).to.not.have.been.called;
          }
        });

        if (stepTest.hasDoneButton) {
          it('done handler dispatches action', async () => {
            // Spies on the handler, because we want it to execute to verify dispatch of actions.
            const doneSpy = sinon.spy(el, <any>'finishStep');

            // Simulates a click on the done button.
            const doneButton = getTaskDoneButton(stepTest.step);
            doneButton.click();

            // Verifies that action dispatched.
            expect(doneSpy).to.have.callCount(1);
            // TODO: Verify param to dispatch call when it's a simple action instead of a thunk.
            expect(dispatchStub).to.have.callCount(1);
          });
        }
      }); // describe(stepName)
    } // for each stepTest
  }); // describe('Setup steps')

  describe('complete setup', () => {
    it('complete setup button is disabled initially', async () => {
      const game = getGameDetail();
      const gameState = buildGameStateWithCurrentGame(game);
      const liveState = buildLiveStateWithTasks(game);

      await setupElement(buildRootState(gameState, liveState), game.id);
      await el.updateComplete;

      const completeButton = getCompleteSetupButton();
      expect(completeButton.disabled, 'Complete setup should be disabled').to.be.true;
    });

    it('complete setup button is enabled after tasks are completed', async () => {
      const game = getGameDetail();
      const gameState = buildGameStateWithCurrentGame(game);
      const liveState = buildLiveStateWithTasks(game);

      await setupElement(buildRootState(gameState, liveState), game.id);
      await el.updateComplete;

      let completeButton = getCompleteSetupButton();
      expect(completeButton.disabled, 'Complete setup should be disabled').to.be.true;

      // Simulates the completion of all the setup tasks.
      const store = getStore();
      store.dispatch(completeRoster(game.id, game.roster));
      store.dispatch(formationSelected(game.id, FormationType.F4_3_3));
      store.dispatch(startersCompleted(game.id));
      store.dispatch(configurePeriods(game.id, 2, 45));
      store.dispatch(captainsCompleted(game.id));
      await el.updateComplete;

      completeButton = getCompleteSetupButton();
      expect(completeButton.disabled, 'Complete setup should be enabled, disabled attribute').to.be
        .false;
    });

    it('dispatches game setup completed action when complete button clicked', async () => {
      // Mock the call to update the game in storage.
      const writerStub = sinon.stub<typeof writer>(writer);
      writerStub.updateDocument.returns();

      const newGame = getGameDetail();
      newGame.id = STORED_GAME_ID;

      const gameState = buildGameStateWithCurrentGame(newGame);
      const liveState = buildLiveStateWithTasks(newGame, LAST_SETUP_STEP);

      await setupElement(buildRootState(gameState, liveState), newGame.id);
      await el.updateComplete;

      const liveGame = selectLiveGameById(getStore().getState(), newGame.id)!;

      const completeButton = getCompleteSetupButton();
      expect(completeButton.disabled, 'Complete setup should be enabled').to.be.false;

      completeButton.click();

      // Verifies that the start game action was dispatched.
      expect(dispatchStub).to.have.callCount(1);

      expect(actionLogger.lastAction()).to.deep.include(gameSetupCompleted(newGame.id, liveGame));
    });
  }); // describe('complete setup')

  describe('Starters', () => {
    let liveGame: LiveGame;
    let gameId: string;

    beforeEach(async () => {
      // Set state to have setup tasks prior to starters completed.
      const newGame = getGameDetail();
      expect(newGame.status).to.equal(GameStatus.New);

      const gameState = buildGameStateWithCurrentGame(newGame);
      const liveState = buildLiveStateWithTasks(newGame, SetupSteps.Starters - 1);

      await setupElement(buildRootState(gameState, liveState), newGame.id);
      await el.updateComplete;

      liveGame = selectLiveGameById(getStore().getState(), newGame.id)!;
      gameId = liveGame.id;
    });

    it('shows starter player sections for new game', async () => {
      const starters = getPlayerSection('on');
      const onHeader = starters.querySelector('h3');
      expect(onHeader, 'Missing starters header').to.be.ok;
      expect(onHeader!.textContent!.trim()).to.equal('Starters');

      const offPlayers = getPlayerSection('off');
      const offHeader = offPlayers.querySelector('h3');
      expect(offHeader, 'Missing subs header').to.be.ok;
      expect(offHeader!.textContent!.trim()).to.equal('Subs');
    });

    it('dispatches starter selected action when sub selected', async () => {
      const foundPlayer = findPlayer(liveGame, PlayerStatus.Off);
      expect(foundPlayer, 'Missing player with off status').to.be.ok;
      const player = foundPlayer!;

      const subsList = getSubsList();
      const playerElement = getPlayerElement(subsList, player);

      // Simulates selection of the player.
      playerElement.click();

      // Verifies that the player selected action was dispatched.
      expect(dispatchStub).to.have.callCount(1);

      expect(actionLogger.lastAction()).to.deep.include(selectStarter(gameId, player.id, true));
    });

    it('dispatches starter position selected action when card in formation selected', async () => {
      const startersList = getStartersList();
      const playerElement = getPositionElement(startersList, 'S');

      // Simulates selection of the position.
      playerElement.click();

      // Verifies that the position selected action was dispatched.
      expect(dispatchStub).to.have.callCount(1);

      expect(actionLogger.lastAction()).to.deep.include(
        selectStarterPosition(gameId, playerElement.data!.position),
      );
    });

    it('position card is selected after selection is processed', async () => {
      const startersList = getStartersList();
      const playerElement = getPositionElement(startersList, 'S');

      // Simulates selection of the position.
      setTimeout(() => playerElement.click());

      const { detail } = (await oneEvent(
        el,
        PositionSelectedEvent.eventName,
      )) as PositionSelectedEvent;
      await el.updateComplete;

      expect(startersList.selectedPosition, 'selectedPosition').to.equal(detail.position);
      expect(playerElement.selected, 'Position card should be selected').to.be.true;
    });

    it('shows confirm starter UI when proposed starter exists', async () => {
      const foundPlayer = findPlayer(liveGame, PlayerStatus.Off);
      expect(foundPlayer, 'Missing player with off status').to.be.ok;
      const player = foundPlayer!;

      const store = getStore();
      store.dispatch(selectStarter(gameId, player.id, /*selected =*/ true));
      store.dispatch(selectStarterPosition(gameId, { id: 'AM1', type: 'AM' }));
      await el.updateComplete;

      const confirmSection = el.shadowRoot!.querySelector('#confirm-starter');
      expect(confirmSection, 'Missing confirm starter div').to.be.ok;

      const positionElement = confirmSection!.querySelector('.proposed-position');
      expect(positionElement, 'Missing proposed position element').to.be.ok;
      expect(positionElement!.textContent!.trim()).to.equal('AM1');

      await expect(confirmSection).dom.to.equalSnapshot();
    });

    it('dispatches apply starter action when confirmed', async () => {
      const foundPlayer = findPlayer(liveGame, PlayerStatus.Off);
      expect(foundPlayer, 'Missing player with off status').to.be.ok;
      const player = foundPlayer!;

      const store = getStore();
      store.dispatch(selectStarter(gameId, player.id, /*selected =*/ true));
      store.dispatch(selectStarterPosition(gameId, { id: 'LW', type: 'W' }));
      await el.updateComplete;

      const confirmSection = el.shadowRoot!.querySelector('#confirm-starter');
      expect(confirmSection, 'Missing confirm starter div').to.be.ok;

      const applyButton = confirmSection!.querySelector('mwc-button.ok') as Button;
      expect(applyButton, 'Missing apply button').to.be.ok;

      applyButton.click();

      // Verifies that the apply starter action was dispatched.
      expect(dispatchStub).to.have.callCount(1);

      expect(actionLogger.lastAction()).to.deep.include(applyStarter(gameId));
    });

    it('dispatches cancel starter action when cancelled', async () => {
      const foundPlayer = findPlayer(liveGame, PlayerStatus.Off);
      expect(foundPlayer, 'Missing player with off status').to.be.ok;
      const player = foundPlayer!;

      const store = getStore();
      store.dispatch(selectStarter(gameId, player.id, /*selected =*/ true));
      store.dispatch(selectStarterPosition(gameId, { id: 'RW', type: 'W' }));
      await el.updateComplete;

      const confirmSection = el.shadowRoot!.querySelector('#confirm-starter');
      expect(confirmSection, 'Missing confirm starter div').to.be.ok;

      const cancelButton = confirmSection!.querySelector('mwc-button.cancel') as Button;
      expect(cancelButton, 'Missing cancel button').to.be.ok;

      cancelButton.click();

      // Verifies that the cancel starter action was dispatched.
      expect(dispatchStub).to.have.callCount(1);

      expect(actionLogger.lastAction()).to.deep.include(cancelStarter(gameId));
    });

    it('shows errors when all starter positions are empty', async () => {
      const doneButton = getTaskDoneButton(SetupSteps.Starters);
      expect(doneButton, 'Missing done button for starters').to.be.ok;

      doneButton.click();
      await el.updateComplete;

      const errorElement = el.shadowRoot!.querySelector('#starter-errors');
      expect(errorElement, 'Missing starter error element').to.be.ok;

      const errorText = errorElement!.querySelector('.error');
      expect(errorText, 'Missing starter error text').to.be.ok;

      const expectedInvalidPositions = getPositions(
        FormationBuilder.create(liveGame.formation!.type),
      )
        .map((position) => position.id)
        .sort()
        .join(', ');
      expect(
        errorText!.textContent,
        'Starter error text should contain invalid positions',
      ).to.contain(expectedInvalidPositions);

      await expect(errorElement).dom.to.equalSnapshot();
    });
  }); // describe('Starters')

  describe('periods', () => {
    let liveGame: LiveGame;
    let gameId: string;

    beforeEach(async () => {
      // Set state to have setup tasks prior to periods completed.
      const newGame = getGameDetail();
      expect(newGame.status).to.equal(GameStatus.New);

      const gameState = buildGameStateWithCurrentGame(newGame);
      const liveState = buildLiveStateWithTasks(newGame, SetupSteps.Periods - 1);

      await setupElement(buildRootState(gameState, liveState), newGame.id);
      await el.updateComplete;

      liveGame = selectLiveGameById(getStore().getState(), newGame.id)!;
      gameId = liveGame.id;

      // Click on the Periods step, to show the dialog.
      const taskElement = getTaskElement(SetupSteps.Periods, SetupSteps.Periods);
      const stepLink = taskElement.querySelector('a.step') as HTMLAnchorElement;
      stepLink.click();
      await el.updateComplete;
    });

    it('shows periods sections for new game', async () => {
      const periodsDialog = el.shadowRoot!.querySelector('#periods-dialog');
      expect(periodsDialog, 'Missing periods dialog').to.be.ok;

      await expect(periodsDialog).dom.to.equalSnapshot();
      // TODO: Address accessibility errors
      // await expect(periodsDialog).to.be.accessible();
    });

    it('dispatches configure periods action when fields valid', async () => {
      const periodsDialog = el.shadowRoot!.querySelector('#periods-dialog');
      expect(periodsDialog, 'Missing periods dialog').to.be.ok;

      const numPeriodsField = getInputField('num-periods');
      numPeriodsField.valueAsNumber = 3;

      const periodLengthField = getInputField('period-length');
      periodLengthField.valueAsNumber = 25;

      const saveButton = periodsDialog!.querySelector('mwc-button[dialogAction="save"]') as Button;
      expect(saveButton, 'Missing save button').to.be.ok;

      saveButton.click();
      await aTimeout(100);

      // Verifies that the configure periods action was dispatched.
      expect(dispatchStub).to.have.callCount(1);

      expect(actionLogger.lastAction()).to.deep.include(configurePeriods(gameId, 3, 25));
    });

    it.skip('shows errors when period fields are invalid', async () => {
      const periodsDialog = el.shadowRoot!.querySelector('#periods-dialog');
      expect(periodsDialog, 'Missing periods dialog').to.be.ok;

      const numPeriodsField = getInputField('num-periods');
      numPeriodsField.value = 'xxx';

      const saveButton = periodsDialog!.querySelector('mwc-button[dialogAction="save"]') as Button;
      expect(saveButton, 'Missing save button').to.be.ok;

      saveButton.click();
      await el.updateComplete;

      const errorElement = el.shadowRoot!.querySelector('#periods-errors');
      expect(errorElement, 'Missing periods error element').to.be.ok;

      const errorText = errorElement!.querySelector('.error');
      expect(errorText, 'Missing period error text').to.be.ok;

      const expectedError = 'invalid periods and stuff';
      expect(errorText!.textContent, 'Periods error text').to.contain(expectedError);

      await expect(errorElement).dom.to.equalSnapshot();
    });
  }); // describe('periods')

  it('a11y', async () => {
    await setupElement();
    await el.updateComplete;

    await expect(el).to.be.accessible();
  });
});
