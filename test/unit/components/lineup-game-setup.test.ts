import { EVENT_POSITIONSELECTED } from '@app/components/events';
import { LineupGameSetup } from '@app/components/lineup-game-setup';
import '@app/components/lineup-game-setup.js';
import { LineupOnPlayerList } from '@app/components/lineup-on-player-list';
import { LineupPlayerCard } from '@app/components/lineup-player-card';
import { LineupPlayerList } from '@app/components/lineup-player-list';
import { addMiddleware, removeMiddleware } from '@app/middleware/dynamic-middlewares';
import { FormationType } from '@app/models/formation';
import { GameDetail, GameStatus, LivePlayer, SetupStatus, SetupSteps, SetupTask } from '@app/models/game';
import { PlayerStatus } from '@app/models/player';
import {
  CAPTAINS_DONE,
  GET_GAME_REQUEST,
  GET_GAME_SUCCESS,
  ROSTER_DONE,
  SET_FORMATION,
  STARTERS_DONE,
  START_GAME
} from '@app/slices/game-types';
import { getLiveStoreConfigurator } from '@app/slices/live-store';
import {
  APPLY_STARTER,
  CANCEL_STARTER,
  SELECT_STARTER,
  SELECT_STARTER_POSITION
} from '@app/slices/live-types';
import { resetState, store } from '@app/store';
import { Button } from '@material/mwc-button';
import { assert, expect, fixture, html, oneEvent } from '@open-wc/testing';
import * as sinon from 'sinon';
import { mockFirestoreAccessor } from '../helpers/mock-firebase-factory';
import { buildRoster, getNewGameWithLiveDetail, getStoredPlayer, STORED_GAME_ID } from '../helpers/test_data';

let actions: string[] = [];
const actionLoggerMiddleware = (/* api */) => (next: any) => (action: any) => {
  actions.push(action);
  return next(action);
}

interface TestSetupTask extends SetupTask {
  expectedName?: string;
}

function getGameDetail(): GameDetail {
  return getNewGameWithLiveDetail(buildRoster([getStoredPlayer()]), getTasks());
}

function getTasks(): TestSetupTask[] {
  return [
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
}

describe('lineup-game-setup tests', () => {
  let el: LineupGameSetup;
  let dispatchStub: sinon.SinonSpy;
  beforeEach(async () => {
    // Resets to the initial store state.
    store.dispatch(resetState());

    sinon.restore();

    actions = [];
    addMiddleware(actionLoggerMiddleware);

    const template = html`<lineup-game-setup .store=${store} .storeConfigurator=${getLiveStoreConfigurator(false)}></lineup-game-setup>`;
    el = await fixture(template);
    dispatchStub = sinon.spy(el, 'dispatch');
  });

  afterEach(async () => {
    removeMiddleware(actionLoggerMiddleware);
  });

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
    assert.isOk(items, 'Missing items for tasks');

    return items;
  }

  function getTaskElement(index: number, step?: SetupSteps): HTMLDivElement {
    const items = getTaskElements();

    assert.isAtLeast(items.length, index + 1, `Items doesn't contain index ${index}`);

    const taskElement = items[index];

    if (step) {

    }

    return taskElement as HTMLDivElement;
  }

  it('starts empty', () => {
    const items = getTaskElements();
    assert.equal(items.length, 0, 'Should be no rendered tasks');

    expect(el).shadowDom.to.equalSnapshot();
  });

  it('renders all the tasks', async () => {
    store.dispatch({ type: GET_GAME_SUCCESS, game: getGameDetail() });
    await el.updateComplete;

    const items = getTaskElements();
    assert.equal(items.length, 4, 'Rendered task count');

    const tasks = getTasks();
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];

      const taskElement = items[i];

      const nameElement = taskElement.querySelector('.name');
      assert.isOk(nameElement, 'Missing name element');

      const nameAnchor = nameElement!.querySelector('a');
      assert.isOk(nameAnchor, 'Missing name anchor');
      assert.equal(nameAnchor!.textContent, task.expectedName);

      const statusElement = taskElement.querySelector('.status');
      assert.isOk(statusElement, 'Missing status element');
      // TODO: Verify elements/content in status div
    }

    expect(el).shadowDom.to.equalSnapshot();
  });

  it('task links are disabled unless task is active', async () => {
    const tasks = getTasks();
    // Verify that test tasks cover active and non-active status.
    assert.equal(tasks[0].status, SetupStatus.Active);
    assert.equal(tasks[1].status, SetupStatus.Pending);

    store.dispatch({ type: GET_GAME_SUCCESS, game: getGameDetail() });
    await el.updateComplete;

    const items = getTaskElements();

    const activeTaskAnchor = items[0].querySelector('.name a') as HTMLAnchorElement;
    assert.isOk(activeTaskAnchor, 'Missing anchor for active task');
    assert.isNotEmpty(activeTaskAnchor.href);
    const lastCharIndex = activeTaskAnchor.href.length - 1;
    assert.equal(activeTaskAnchor.href[lastCharIndex], '#');

    const pendingTaskAnchor = items[1].querySelector('.name a') as HTMLAnchorElement;
    assert.isOk(pendingTaskAnchor, 'Missing anchor for pending task');
    assert.equal(pendingTaskAnchor.href, '');
  });

  describe('Setup steps', () => {
    let newGame: GameDetail;

    beforeEach(async () => {
      newGame = getGameDetail();
      expect(newGame.status).to.equal(GameStatus.New);
    });

    const stepTests = [
      {
        step: SetupSteps.Formation,
        hasDoneButton: false,
      },
      {
        step: SetupSteps.Roster,
        hasDoneButton: true,
        doneActionType: ROSTER_DONE,
      },
      {
        step: SetupSteps.Captains,
        hasDoneButton: true,
        doneActionType: CAPTAINS_DONE,
      },
      {
        step: SetupSteps.Starters,
        hasDoneButton: true,
        doneActionType: STARTERS_DONE,
      },
    ];

    for (const stepTest of stepTests) {
      const stepName = SetupSteps[stepTest.step];
      describe(stepName, () => {

        beforeEach(async () => {
          // Sets up the current step as active.
          for (let index = 0; index < stepTest.step; index++) {
            newGame.liveDetail!.setupTasks![index].status = SetupStatus.Complete;
          }
          newGame.liveDetail!.setupTasks![stepTest.step].status = SetupStatus.Active;

          store.dispatch({ type: GET_GAME_SUCCESS, game: newGame });
          await el.updateComplete;
          newGame = store.getState().game!.game!;
        });

        it('perform handler fires only when active', async () => {
          const taskElement = getTaskElement(stepTest.step, stepTest.step);

          // Spies on the handler, because we want it to execute to verify other behaviour.
          const performSpy = sinon.spy(el, <any>'performStep');

          // Simulates a click on the step link.
          const stepLink = taskElement.querySelector('a.step') as HTMLAnchorElement;
          assert.isOk(stepLink, 'Missing perform link for task');
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
            // TODO: Verify param to dispatch call when it's a simple action instead of a thunk.
            expect(dispatchStub).to.have.callCount(1);
          } else {
            // Other steps should do nothing (they don't have an href on the link).
            expect(dispatchStub).to.not.have.been.called;
          }
        });

        if (stepTest.hasDoneButton) {
          it('done handler dispatches action', async () => {
            const taskElement = getTaskElement(stepTest.step, stepTest.step);

            // Spies on the handler, because we want it to execute to verify dispatch of actions.
            const doneSpy = sinon.spy(el, <any>'finishStep');

            // Simulates a click on the done button.
            const doneButton = taskElement.querySelector('.status mwc-button.finish') as Button;
            assert.isOk(doneButton, 'Missing done button for task');
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

  it('start game button is disabled initially', async () => {
    store.dispatch({ type: GET_GAME_SUCCESS, game: getGameDetail() });
    await el.updateComplete;

    const startGame = el.shadowRoot!.querySelector('div div.start mwc-button') as Button;
    assert.isOk(startGame, 'Missing start game button');
    assert.equal(startGame.disabled, true, 'Start game is not disabled');
  });

  it('start game button is enabled after tasks are completed', async () => {
    const game = getGameDetail();
    store.dispatch({ type: GET_GAME_SUCCESS, game });
    await el.updateComplete;

    let startGame = el.shadowRoot!.querySelector('div div.start mwc-button') as Button;
    assert.isOk(startGame, 'Missing start game button');
    assert.equal(startGame.disabled, true, 'Start game should be disabled');

    // Simulates the completion of all the setup tasks.
    store.dispatch({ type: SET_FORMATION, formationType: FormationType.F4_3_3 });
    store.dispatch({ type: ROSTER_DONE, roster: game.roster });
    store.dispatch({ type: CAPTAINS_DONE });
    store.dispatch({ type: STARTERS_DONE });
    await el.updateComplete;

    startGame = el.shadowRoot!.querySelector('div div.start mwc-button') as Button;
    assert.isOk(startGame, 'Missing start game button');
    assert.equal(startGame.disabled, false, 'Start game should be enabled');
  });

  it('dispatches start game action when start button clicked', async () => {
    mockFirestoreAccessor();

    const newGame = getGameDetail();
    newGame.id = STORED_GAME_ID;
    newGame.liveDetail!.setupTasks![SetupSteps.Formation].status = SetupStatus.Complete;
    newGame.liveDetail!.setupTasks![SetupSteps.Roster].status = SetupStatus.Complete;
    newGame.liveDetail!.setupTasks![SetupSteps.Captains].status = SetupStatus.Complete;
    newGame.liveDetail!.setupTasks![SetupSteps.Starters].status = SetupStatus.Complete;

    store.dispatch({ type: GET_GAME_REQUEST, gameId: newGame.id });
    store.dispatch({ type: GET_GAME_SUCCESS, game: newGame });
    await el.updateComplete;

    const startGameButton = el.shadowRoot!.querySelector('div div.start mwc-button') as Button;
    expect(startGameButton, 'Missing start game button').to.be.ok;
    expect(startGameButton.disabled, 'Start game should be enabled').to.equal(false);

    startGameButton.click();

    // Verifies that the start game action was dispatched.
    expect(dispatchStub).to.have.callCount(1);

    expect(actions).to.have.lengthOf.at.least(1);
    expect(actions[actions.length - 1]).to.include({ type: START_GAME });
  });

  describe('Starters', () => {
    let newGame: GameDetail;

    beforeEach(async () => {
      newGame = getGameDetail();
      expect(newGame.status).to.equal(GameStatus.New);

      newGame.liveDetail!.setupTasks![SetupSteps.Formation].status = SetupStatus.Complete;
      newGame.liveDetail!.setupTasks![SetupSteps.Roster].status = SetupStatus.Active;

      store.dispatch({ type: GET_GAME_SUCCESS, game: newGame });

      // Simulates the completion of the setup tasks need to work on starters.
      store.dispatch({ type: SET_FORMATION, formationType: FormationType.F4_3_3 });
      store.dispatch({ type: ROSTER_DONE, roster: newGame.roster });
      await el.updateComplete;
      newGame = store.getState().game!.game!;
    });

    it('shows starter player sections for new game', async () => {
      const starters = getPlayerSection('on');
      const onHeader = starters.querySelector('h5');
      expect(onHeader, 'Missing starters header').to.be.ok;
      expect(onHeader!.textContent!.trim()).to.equal('Starters');

      const offPlayers = getPlayerSection('off');
      const offHeader = offPlayers.querySelector('h5');
      expect(offHeader, 'Missing subs header').to.be.ok;
      expect(offHeader!.textContent!.trim()).to.equal('Subs');
    });

    it('dispatches starter selected action when sub selected', async () => {
      const foundPlayer = newGame.liveDetail!.players!.find(player => (player.status === PlayerStatus.Off));
      expect(foundPlayer, 'Missing player with off status').to.be.ok;
      const player = foundPlayer!;

      const subsList = getSubsList();
      const playerElement = getPlayerElement(subsList, player);

      // Simulates selection of the player.
      playerElement.click();

      // Verifies that the player selected action was dispatched.
      expect(dispatchStub).to.have.callCount(1);

      expect(actions).to.have.lengthOf.at.least(1);
      expect(actions[actions.length - 1]).to.include({ type: SELECT_STARTER });
    });

    it('dispatches starter position selected action when card in formation selected', async () => {
      const startersList = getStartersList();
      const playerElement = getPositionElement(startersList, 'S');

      // Simulates selection of the position.
      playerElement.click();

      // Verifies that the position selected action was dispatched.
      expect(dispatchStub).to.have.callCount(1);

      expect(actions).to.have.lengthOf.at.least(1);
      expect(actions[actions.length - 1]).to.include({ type: SELECT_STARTER_POSITION });
    });

    it('position card is selected after selection is processed', async () => {
      const startersList = getStartersList();
      const playerElement = getPositionElement(startersList, 'S');

      // Simulates selection of the position.
      playerElement.click();

      setTimeout(() => playerElement.click());

      const { detail } = await oneEvent(el, EVENT_POSITIONSELECTED);

      expect(startersList.selectedPosition).to.equal(detail.position);
      expect(playerElement.selected, 'Position card should be selected').to.be.true;
    });

    it('shows confirm starter UI when proposed starter exists', async () => {
      const foundPlayer = newGame.liveDetail!.players!.find(player => (player.status === PlayerStatus.Off));
      expect(foundPlayer, 'Missing player with off status').to.be.ok;
      const player = foundPlayer!;

      store.dispatch({ type: SELECT_STARTER, playerId: player.id, selected: true });
      store.dispatch({ type: SELECT_STARTER_POSITION, position: { id: 'AM1', type: 'AM' } });
      await el.updateComplete;

      const confirmSection = el.shadowRoot!.querySelector('#confirm-starter');
      expect(confirmSection, 'Missing confirm starter div').to.be.ok;

      expect(confirmSection).dom.to.equalSnapshot();
    });

    it('dispatches apply starter action when confirmed', async () => {
      const foundPlayer = newGame.liveDetail!.players!.find(player => (player.status === PlayerStatus.Off));
      expect(foundPlayer, 'Missing player with off status').to.be.ok;
      const player = foundPlayer!;

      store.dispatch({ type: SELECT_STARTER, playerId: player.id, selected: true });
      store.dispatch({ type: SELECT_STARTER_POSITION, position: { id: 'LW', type: 'W' } });
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
      expect(actions[actions.length - 1]).to.include({ type: APPLY_STARTER });
    });

    it('dispatches cancel starter action when cancelled', async () => {
      const foundPlayer = newGame.liveDetail!.players!.find(player => (player.status === PlayerStatus.Off));
      expect(foundPlayer, 'Missing player with off status').to.be.ok;
      const player = foundPlayer!;

      store.dispatch({ type: SELECT_STARTER, playerId: player.id, selected: true });
      store.dispatch({ type: SELECT_STARTER_POSITION, position: { id: 'RW', type: 'W' } });
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
      expect(actions[actions.length - 1]).to.include({ type: CANCEL_STARTER });
    });

  }); // describe('Starters')

  it('a11y', async () => {
    await expect(el).to.be.accessible();
  });
});
