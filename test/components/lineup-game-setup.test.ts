/*
import { fixture, assert } from '@open-wc/testing';
      import 'axe-core/axe.min.js';
      import {axeReport} from 'pwa-helpers/axe-report.js';
      import '@app/components/lineup-game-setup.js';
import { LineupGameSetup } from '@app/components/lineup-game-setup';
import { Button } from '@material/mwc-button';
import { GameDetail, SetupStatus, SetupTask, SetupSteps } from '@app/models/game';
import { FormationType } from '@app/models/formation';
import { getNewGameWithLiveDetail, buildRoster, getStoredPlayer } from '../helpers/test_data';

      // import {} from '../helpers/test_data.js';
          // @ts-ignore
          window.process = { env: { NODE_ENV: 'production' } };

      import { store } from '@app/store';
      import {
        // GET_GAME_REQUEST,
        GET_GAME_SUCCESS,
        CAPTAINS_DONE,
        ROSTER_DONE,
        STARTERS_DONE,
        SET_FORMATION
      } from '@app/actions/game-types';

      // Need to load the reducer, as lineup-game-setup relies on lineup-view-game-detail to do so.
      import { game } from '@app/reducers/game';
      // store.addReducers({
      //   game
      // });

interface TestSetupTask extends SetupTask {
  expectedName?: string;
}
      function getGameDetail(): GameDetail {
        /*
        return {
          id: 'G1',
          teamId: 'T1',
          status: GameStatus.New,
          name: `G01`,
          opponent: `Other team`,
          date: new Date(2016, 1, 1),
          roster: [
            {
              id: 'AC',
              name: 'Amanda',
              uniformNumber: 2,
              positions: ['CB', 'FB', 'HM'],
            }
          ]
        };
        * /
       return getNewGameWithLiveDetail(buildRoster([getStoredPlayer()]));
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

      describe('lineup-game-setup tests', function() {
        let el: LineupGameSetup;
        beforeEach(async () => {
          // @ts-ignore
          // window.process = { env: { NODE_ENV: 'production' } };
          store.addReducers({
            game
          });
          el = await fixture('<lineup-game-setup></lineup-game-setup>');
        });

        it('starts empty', function() {
          // assert.equal(el._game, undefined);
          const items = el.shadowRoot!.querySelectorAll('div div.task');
          assert.isOk(items, 'Missing items for tasks');
          assert.equal(items.length, 0, 'Should be no rendered tasks');
        });

        it('renders all the tasks', async function() {
          store.dispatch({type: GET_GAME_SUCCESS, game: getGameDetail()});
          await el.updateComplete;

          const items = el.shadowRoot!.querySelectorAll('div div.task');
          assert.isOk(items, 'Missing items for tasks');
          assert.equal(items.length, 4, 'Rendered task count');

          const tasks = getTasks();
          for (let i = 0; i < tasks.length; i++) {
            const task = tasks[i];

            const taskElement = items[i];

            const nameElement = taskElement.querySelector('.name');
            assert.isOk(nameElement, 'Missing name element');

            const nameAnchor = nameElement!.querySelector('a');
            assert.isOk(nameAnchor, 'Missing name nameAnchor');
            assert.equal(nameAnchor!.textContent, task.expectedName);

            const statusElement = taskElement.querySelector('.status');
            assert.isOk(statusElement, 'Missing status element');
            // TODO: Verify elements/content in status div
          }

        });

        it('task links are disabled unless task is active', async function() {
          assert.equal(true, false);
        });

        it('start game is disabled initially', async function() {
          store.dispatch({type: GET_GAME_SUCCESS, game: getGameDetail()});
          await el.updateComplete;

          const startGame = el.shadowRoot!.querySelector('div div.start mwc-button') as Button;
          assert.isOk(startGame, 'Missing start game button');
          assert.equal(startGame.disabled, true, 'Start game is not disabled');
        });

        it('start game is enabled after tasks are completed', async function() {
          const game = getGameDetail();
          game.liveDetail!.setupTasks = getTasks();
          store.dispatch({type: GET_GAME_SUCCESS, game});
          await el.updateComplete;

          let startGame = el.shadowRoot!.querySelector('div div.start mwc-button') as Button;
          assert.isOk(startGame, 'Missing start game button');
          assert.equal(startGame.disabled, true, 'Start game should be disabled');

          // Simulates the completion of all the setup tasks.
          store.dispatch({type: SET_FORMATION, formationType: FormationType.F4_3_3});
          store.dispatch({type: ROSTER_DONE});
          store.dispatch({type: CAPTAINS_DONE});
          store.dispatch({type: STARTERS_DONE});
          await el.updateComplete;

          startGame = el.shadowRoot!.querySelector('div div.start mwc-button') as Button;
          assert.isOk(startGame, 'Missing start game button');
          assert.equal(startGame.disabled, false, 'Start game should be enabled');
        });

        it('a11y', function() {
          console.log('ally test');
          return axeReport(el);
        });
      });
*/
