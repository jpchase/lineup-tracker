import { EVENT_POSITIONSELECTED } from '@app/components/events';
import { LineupGameSetup } from '@app/components/lineup-game-setup';
import '@app/components/lineup-game-setup.js';
import { LineupOnPlayerList } from '@app/components/lineup-on-player-list';
import { LineupPlayerCard } from '@app/components/lineup-player-card';
import { LineupPlayerList } from '@app/components/lineup-player-list';
import { PageRouter } from '@app/components/page-router.js';
import { addMiddleware, removeMiddleware } from '@app/middleware/dynamic-middlewares';
import { FormationBuilder, FormationType, getPositions } from '@app/models/formation';
import { GameDetail, GameStatus, SetupStatus, SetupSteps, SetupTask } from '@app/models/game.js';
import { LiveGame, LiveGameBuilder, LivePlayer } from '@app/models/live.js';
import { PlayerStatus } from '@app/models/player';
import { getLiveStoreConfigurator } from '@app/slices/live-store';
import { applyStarter, cancelStarter, captainsCompleted, completeRoster, formationSelected, gameSetupCompleted, selectLiveGameById, selectStarter, selectStarterPosition, startersCompleted } from '@app/slices/live/live-slice.js';
import { writer } from '@app/storage/firestore-writer.js';
import { RootState, setupStore } from '@app/store';
import { Button } from '@material/mwc-button';
import { expect, fixture, html, oneEvent } from '@open-wc/testing';
import sinon from 'sinon';
import { buildGameStateWithCurrentGame } from '../helpers/game-state-setup.js';
import { buildLiveStateWithCurrentGame } from '../helpers/live-state-setup.js';
import { mockPageRouter } from '../helpers/mock-page-router.js';
import { buildRootState } from '../helpers/root-state-setup.js';
import { buildRoster, getNewGameDetail, getStoredPlayer, STORED_GAME_ID } from '../helpers/test_data';

const LAST_SETUP_STEP = SetupSteps.Starters;

let actions: string[] = [];
const actionLoggerMiddleware = (/* api */) => (next: any) => (action: any) => {
  actions.push(action);
  return next(action);
}

interface TestSetupTask extends SetupTask {
  expectedName?: string;
}

function getGameDetail(): GameDetail {
  return getNewGameDetail(buildRoster([getStoredPlayer()]));
}

function getTasks(includeTestMetadata = false): TestSetupTask[] {
  const tasks: TestSetupTask[] = [
    {
      step: SetupSteps.Formation,
      status: SetupStatus.Active,
      expectedName: 'Set formation'
    },
    {
      step: SetupSteps.Roster,
      status: SetupStatus.Pending,
      expectedName: 'Set game roster'
    },
    {
      step: SetupSteps.Captains,
      status: SetupStatus.Pending,
      expectedName: 'Set captains'
    },
    {
      step: SetupSteps.Starters,
      status: SetupStatus.Pending,
      expectedName: 'Setup the starting lineup'
    },
  ];
  if (!includeTestMetadata) {
    tasks.forEach((task) => {
      delete task.expectedName;
    });
  }
  return tasks;
}

function buildLiveStateWithTasks(newGame: GameDetail, lastCompletedStep?: SetupSteps) {
  if (lastCompletedStep === undefined) {
    lastCompletedStep = -1;
  }
  // Set status for all steps up to the last completed.
  const tasks = getTasks();
  for (let index = 0; index <= Math.min(lastCompletedStep, tasks.length - 1); index++) {
    tasks[index].status = SetupStatus.Complete;
  }
  // Set the current step after the last completed to active.
  if ((lastCompletedStep + 1) < tasks.length) {
    tasks[lastCompletedStep + 1].status = SetupStatus.Active;
  }

  const liveGame = LiveGameBuilder.create(newGame);
  liveGame.setupTasks = tasks;

  // If the current step is after Formation, the game formation must be
  // initialized to a valid value.
  if (lastCompletedStep >= SetupSteps.Formation) {
    liveGame.formation = { type: FormationType.F4_3_3 };
  }

  return buildLiveStateWithCurrentGame(liveGame);
}

function findPlayer(game: LiveGame, status: PlayerStatus) {
  return game.players!.find(player => (player.status === status));
}

describe('lineup-game-setup tests', () => {
  let el: LineupGameSetup;
  let dispatchStub: sinon.SinonSpy;

  beforeEach(async () => {
    sinon.restore();

    actions = [];
    addMiddleware(actionLoggerMiddleware);

    await setupElement();
  });

  afterEach(async () => {
    removeMiddleware(actionLoggerMiddleware);
  });

  async function setupElement(preloadedState?: RootState): Promise<PageRouter> {
    const store = setupStore(preloadedState);

    const mockRouter = {
      gotoPage: () => {
        // No-op, meant to be spied.
        return Promise.resolve();
      }
    }
    const parentNode = document.createElement('div');
    mockPageRouter(parentNode, mockRouter);
    const template = html`<lineup-game-setup .store=${store} .storeConfigurator=${getLiveStoreConfigurator(false)}></lineup-game-setup>`;
    el = await fixture(template, { parentNode });
    dispatchStub = sinon.spy(el, 'dispatch');
    return mockRouter;
  }

  function getStore() {
    return el.store!;
  }

  function getPlayerElement(list: LineupPlayerList, player: LivePlayer): LineupPlayerCard {
    const items = list.shadowRoot!.querySelectorAll('lineup-player-card');

    let playerElement: LineupPlayerCard | undefined;
    for (let element of Array.from(items)) {
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
    for (let element of Array.from(items)) {
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

    expect(items.length).to.be.greaterThanOrEqual(index + 1, `Items doesn't contain index ${index}`);

    const taskElement = items[index];

    if (step) {

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
    const items = getTaskElements();
    expect(items.length).to.equal(0, 'Should be no rendered tasks');

    await expect(el).shadowDom.to.equalSnapshot();
  });

  it('renders all the tasks', async () => {
    const game = getGameDetail();
    const gameState = buildGameStateWithCurrentGame(game);
    const liveState = buildLiveStateWithTasks(game);

    await setupElement(buildRootState(gameState, liveState));
    await el.updateComplete;

    const items = getTaskElements();
    expect(items.length).to.equal(4, 'Rendered task count');

    const tasks = getTasks(/*includeTestMetadata=*/true);
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

    await setupElement(buildRootState(gameState, liveState));
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
        step: SetupSteps.Formation,
        hasDoneButton: false,
      },
      {
        step: SetupSteps.Roster,
        hasDoneButton: true,
        doneActionType: completeRoster.type,
      },
      {
        step: SetupSteps.Captains,
        hasDoneButton: true,
        doneActionType: captainsCompleted.type,
      },
      {
        step: SetupSteps.Starters,
        hasDoneButton: true,
        doneActionType: startersCompleted.type,
      },
    ];

    for (const stepTest of stepTests) {
      const stepName = SetupSteps[stepTest.step];
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

          const mockRouter = await setupElement(buildRootState(gameState, liveState));
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
            expect(formationSection!.hasAttribute('active'), 'Should have active attribute').to.be.true;

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

      await setupElement(buildRootState(gameState, liveState));
      await el.updateComplete;

      const completeButton = getCompleteSetupButton();
      expect(completeButton.disabled, 'Complete setup should be disabled').to.be.true;
    });

    it('complete setup button is enabled after tasks are completed', async () => {
      const game = getGameDetail();
      const gameState = buildGameStateWithCurrentGame(game);
      const liveState = buildLiveStateWithTasks(game);

      await setupElement(buildRootState(gameState, liveState));
      await el.updateComplete;

      let completeButton = getCompleteSetupButton();
      expect(completeButton.disabled, 'Complete setup should be disabled').to.be.true;

      // Simulates the completion of all the setup tasks.
      const store = getStore();
      store.dispatch(formationSelected(game.id, FormationType.F4_3_3));
      store.dispatch(completeRoster(game.id, game.roster));
      store.dispatch(captainsCompleted(game.id));
      store.dispatch(startersCompleted(game.id));
      await el.updateComplete;

      completeButton = getCompleteSetupButton();
      expect(completeButton.disabled, 'Complete setup should be enabled').to.be.false;
    });

    it('dispatches game setup completed action when complete button clicked', async () => {
      // Mock the call to update the game in storage.
      const writerStub = sinon.stub<typeof writer>(writer);
      writerStub.updateDocument.returns();

      const newGame = getGameDetail();
      newGame.id = STORED_GAME_ID;

      const gameState = buildGameStateWithCurrentGame(newGame);
      const liveState = buildLiveStateWithTasks(newGame, LAST_SETUP_STEP);

      await setupElement(buildRootState(gameState, liveState));
      await el.updateComplete;

      const liveGame = selectLiveGameById(getStore().getState(), newGame.id)!;

      const completeButton = getCompleteSetupButton();
      expect(completeButton.disabled, 'Complete setup should be enabled').to.be.false;

      completeButton.click();

      // Verifies that the start game action was dispatched.
      expect(dispatchStub).to.have.callCount(1);

      expect(actions).to.have.lengthOf.at.least(1);
      expect(actions[actions.length - 1]).to.deep.include(gameSetupCompleted(newGame.id, liveGame));
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

      await setupElement(buildRootState(gameState, liveState));
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

      expect(actions).to.have.lengthOf.at.least(1);
      expect(actions[actions.length - 1]).to.deep.include(selectStarter(gameId, player.id, true));
    });

    it('dispatches starter position selected action when card in formation selected', async () => {
      const startersList = getStartersList();
      const playerElement = getPositionElement(startersList, 'S');

      // Simulates selection of the position.
      playerElement.click();

      // Verifies that the position selected action was dispatched.
      expect(dispatchStub).to.have.callCount(1);

      expect(actions).to.have.lengthOf.at.least(1);
      expect(actions[actions.length - 1]).to.deep.include(
        selectStarterPosition(gameId, playerElement.data!.position));
    });

    it('position card is selected after selection is processed', async () => {
      const startersList = getStartersList();
      const playerElement = getPositionElement(startersList, 'S');

      // Simulates selection of the position.
      setTimeout(() => playerElement.click());

      const { detail } = await oneEvent(el, EVENT_POSITIONSELECTED);
      await el.updateComplete;

      expect(startersList.selectedPosition, 'selectedPosition').to.equal(detail.position);
      expect(playerElement.selected, 'Position card should be selected').to.be.true;
    });

    it('shows confirm starter UI when proposed starter exists', async () => {
      const foundPlayer = findPlayer(liveGame, PlayerStatus.Off);
      expect(foundPlayer, 'Missing player with off status').to.be.ok;
      const player = foundPlayer!;

      const store = getStore();
      store.dispatch(selectStarter(gameId, player.id, /*selected =*/true));
      store.dispatch(selectStarterPosition(gameId, { id: 'AM1', type: 'AM' }));
      await el.updateComplete;

      const confirmSection = el.shadowRoot!.querySelector('#confirm-starter');
      expect(confirmSection, 'Missing confirm starter div').to.be.ok;

      await expect(confirmSection).dom.to.equalSnapshot();
    });

    it('dispatches apply starter action when confirmed', async () => {
      const foundPlayer = findPlayer(liveGame, PlayerStatus.Off);
      expect(foundPlayer, 'Missing player with off status').to.be.ok;
      const player = foundPlayer!;

      const store = getStore();
      store.dispatch(selectStarter(gameId, player.id, /*selected =*/true));
      store.dispatch(selectStarterPosition(gameId, { id: 'LW', type: 'W' }));
      await el.updateComplete;

      const confirmSection = el.shadowRoot!.querySelector('#confirm-starter');
      expect(confirmSection, 'Missing confirm starter div').to.be.ok;

      const positionElement = confirmSection!.querySelector('.proposed-position');
      expect(positionElement, 'Missing proposed position element').to.be.ok;
      expect(positionElement!.textContent!.trim()).to.equal('W (Left)');

      const applyButton = confirmSection!.querySelector('mwc-button.ok') as Button;
      expect(applyButton, 'Missing apply button').to.be.ok;

      applyButton.click();

      // Verifies that the apply starter action was dispatched.
      expect(dispatchStub).to.have.callCount(1);

      expect(actions).to.have.lengthOf.at.least(1);
      expect(actions[actions.length - 1]).to.deep.include(applyStarter(gameId));
    });

    it('dispatches cancel starter action when cancelled', async () => {
      const foundPlayer = findPlayer(liveGame, PlayerStatus.Off);
      expect(foundPlayer, 'Missing player with off status').to.be.ok;
      const player = foundPlayer!;

      const store = getStore();
      store.dispatch(selectStarter(gameId, player.id, /*selected =*/true));
      store.dispatch(selectStarterPosition(gameId, { id: 'RW', type: 'W' }));
      await el.updateComplete;

      const confirmSection = el.shadowRoot!.querySelector('#confirm-starter');
      expect(confirmSection, 'Missing confirm starter div').to.be.ok;

      const positionElement = confirmSection!.querySelector('.proposed-position');
      expect(positionElement, 'Missing proposed position element').to.be.ok;
      expect(positionElement!.textContent!.trim()).to.equal('W (Right)');

      const cancelButton = confirmSection!.querySelector('mwc-button.cancel') as Button;
      expect(cancelButton, 'Missing cancel button').to.be.ok;

      cancelButton.click();

      // Verifies that the cancel starter action was dispatched.
      expect(dispatchStub).to.have.callCount(1);

      expect(actions).to.have.lengthOf.at.least(1);
      expect(actions[actions.length - 1]).to.deep.include(cancelStarter(gameId));
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
        FormationBuilder.create(liveGame.formation!.type))
        .map(position => position.id).sort().join(', ');
      expect(errorText!.textContent, 'Starter error text should contain invalid positions').to.contain(expectedInvalidPositions);

      await expect(errorElement).dom.to.equalSnapshot();
    });

  }); // describe('Starters')

  it('a11y', async () => {
    await expect(el).to.be.accessible();
  });
});
