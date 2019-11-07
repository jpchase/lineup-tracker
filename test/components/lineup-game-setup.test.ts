import {
  CAPTAINS_DONE,
  GET_GAME_SUCCESS,
  ROSTER_DONE,
  SET_FORMATION,
  STARTERS_DONE
} from '@app/actions/game-types';
import { LineupGameSetup } from '@app/components/lineup-game-setup';
import '@app/components/lineup-game-setup.js';
import { FormationType } from '@app/models/formation';
import { GameDetail, SetupStatus, SetupSteps, SetupTask } from '@app/models/game';
// Need to load the reducer, as lineup-game-setup relies on lineup-view-game-detail to do so.
import { game } from '@app/reducers/game';
import { store, resetState } from '@app/store';
import { Button } from '@material/mwc-button';
import { assert, expect, fixture } from '@open-wc/testing';
import { stub } from 'sinon';
import { buildRoster, getNewGameWithLiveDetail, getStoredPlayer } from '../helpers/test_data';

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
  beforeEach(async () => {
    store.addReducers({
      game
    });
    // Resets to the initial store state.
    store.dispatch(resetState());

    el = await fixture('<lineup-game-setup></lineup-game-setup>');
  });

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

  it('step done handler dispatches action', async () => {
    // Makes the Roster step active, as the Formation step doesn't show a done button.
    const game = getGameDetail();
    game.liveDetail!.setupTasks![0].status = SetupStatus.Complete;
    game.liveDetail!.setupTasks![1].status = SetupStatus.Active;

    store.dispatch({ type: GET_GAME_SUCCESS, game: game });
    await el.updateComplete;

    const taskElement = getTaskElement(1, SetupSteps.Roster);

    const doneStub = stub(el, <any>'_stepDone');

    // Simulates a click on the done button.
    const doneButton = taskElement.querySelector('.status mwc-button.finish') as Button;
    assert.isOk(doneButton, 'Missing done button for task');
    doneButton.click();

    // Verifies that action dispatched.
    expect(doneStub).to.have.callCount(1);
    // TODO: Verify that the actions are actually dispatched, with middleware to log actions
    // assert.equal(false, false, 'forcing failure yall');
  });

  it('start game is disabled initially', async () => {
    store.dispatch({ type: GET_GAME_SUCCESS, game: getGameDetail() });
    await el.updateComplete;

    const startGame = el.shadowRoot!.querySelector('div div.start mwc-button') as Button;
    assert.isOk(startGame, 'Missing start game button');
    assert.equal(startGame.disabled, true, 'Start game is not disabled');
  });

  it('start game is enabled after tasks are completed', async () => {
    const game = getGameDetail();
    store.dispatch({ type: GET_GAME_SUCCESS, game });
    await el.updateComplete;

    let startGame = el.shadowRoot!.querySelector('div div.start mwc-button') as Button;
    assert.isOk(startGame, 'Missing start game button');
    assert.equal(startGame.disabled, true, 'Start game should be disabled');

    // Simulates the completion of all the setup tasks.
    store.dispatch({ type: SET_FORMATION, formationType: FormationType.F4_3_3 });
    store.dispatch({ type: ROSTER_DONE });
    store.dispatch({ type: CAPTAINS_DONE });
    store.dispatch({ type: STARTERS_DONE });
    await el.updateComplete;

    startGame = el.shadowRoot!.querySelector('div div.start mwc-button') as Button;
    assert.isOk(startGame, 'Missing start game button');
    assert.equal(startGame.disabled, false, 'Start game should be enabled');
  });

  it('a11y', async () => {
    await expect(el).to.be.accessible();
  });
});
