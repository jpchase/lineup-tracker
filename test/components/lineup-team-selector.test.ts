import { fixture, assert } from '@open-wc/testing';
      import 'axe-core/axe.min.js';
      // import {axeReport} from 'pwa-helpers/axe-report.js';
      import '@app/components/lineup-team-selector.js';
import { LineupTeamSelector } from '@app/components/lineup-team-selector';
import { buildTeams } from '../helpers/test_data';
import { PaperListboxElement } from '@polymer/paper-listbox';

      describe('lineup-team-selector tests', function() {
        let el: LineupTeamSelector;
        beforeEach(async () => {
          el = await fixture('<lineup-team-selector></lineup-team-selector>');
        });

        function getItems() {
          const items = el.shadowRoot!.querySelectorAll('paper-dropdown-menu paper-listbox paper-item');
          assert.isOk(items, 'Missing items for teams');
          return items;
        }

        it('starts empty', function() {
          assert.equal(el.teamId, '', 'teamId');
          assert.deepEqual(el.teams, {}, 'teams');
        });

        it('renders items for each team', async function() {
          const teams = [{
            id: 't1',
            name: 'First team',
          }];
          el.teams = buildTeams(teams);
          await el.updateComplete;

          const items = getItems();
          assert.isOk(items, 'Missing items for teams');
          assert.equal(items.length - 1, teams.length, 'Rendered item count');

          const firstTeam = items[0];
          assert.equal(firstTeam.getAttribute('id'), teams[0].id, 'Team id');
          assert.equal(firstTeam.textContent, teams[0].name, 'Team name');
        });

        it('fires event when team selected', async function() {
          const teams = [{
            id: 't1',
            name: 'First team',
          }];
          el.teams = buildTeams(teams);
          await el.updateComplete;

          let eventFired = false;
          let eventTeamId = null;
          const handler = function (firedEvent: Event) {
            eventFired = true;
            const event = firedEvent as CustomEvent;
            eventTeamId = event.detail.teamId;
            window.removeEventListener('team-changed', handler);
          };

          window.addEventListener('team-changed', handler);

          const list = el.shadowRoot!.querySelector('paper-dropdown-menu paper-listbox') as PaperListboxElement;
          list.select(teams[0].id);

          await 0;
          assert.isTrue(eventFired, 'Event team-changed should be fired');
          assert.deepEqual(eventTeamId, teams[0].id);
        });

        it('renders item to add new team when empty', async function() {
          await el.updateComplete;
          const items = getItems();
          const addTeam = items[0];
          assert.isOk(addTeam, 'Missing item to add new team');
          assert.equal(addTeam.textContent, '+ Add team', 'Add new team item');
        });

        it('renders item to add new team with existing teams', async function() {
          const teams = [{
            id: 't1',
            name: 'First team',
          }];
          el.teams = buildTeams(teams);
          await el.updateComplete;

          const items = getItems();
          const addTeam = items[items.length - 1];
          assert.isOk(addTeam, 'Missing item to add new team');
          assert.equal(addTeam.textContent, '+ Add team', 'Add new team item');
        });

        it('fires event to add new team', async function() {
          await el.updateComplete;

          let eventFired = false;
          const handler = function() {
            eventFired = true;
            window.removeEventListener('add-new-team', handler);
          };

          window.addEventListener('add-new-team', handler);

          const list = el.shadowRoot!.querySelector('paper-dropdown-menu paper-listbox') as PaperListboxElement;
          list.select('addnewteam');

          await 0;
          assert.isTrue(eventFired, 'Event add-new-team should be fired');
        });

        // TODO: Fix various accessibility warnings
        // test('a11y', function() {
        //   return axeReport(el);
        // });
      });
