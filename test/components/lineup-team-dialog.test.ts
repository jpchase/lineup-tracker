import { fixture, assert } from '@open-wc/testing';
      import 'axe-core/axe.min.js';
      import {axeReport} from 'pwa-helpers/axe-report.js';
      import '@app/components/lineup-team-dialog.js';
import { LineupTeamDialog } from '@app/components/lineup-team-dialog';

      describe('lineup-team-dialog tests', function() {
        let el: LineupTeamDialog;
        beforeEach(async () => {
          el = await fixture('<lineup-team-dialog></lineup-team-dialog>');
        });

        function getDialog() {
          let dialog = el.shadowRoot!.querySelector('paper-dialog');
          assert.isOk(dialog, 'Missing dialog');
          return dialog!;
        }

        function sleep(milliseconds: number) {
          return new Promise(resolve => setTimeout(resolve, milliseconds))
        }

        it('starts empty', function() {
          assert.isArray(el.teams, 'teams');
          assert.equal(el.teams.length, 0, 'teams array length');
          // assert.isUndefined(el.newTeam, 'newTeam');
        });

        it('starts closed', function() {
          assert.isFalse(el.opened, 'opened');
        });

        it('shows dialog when opened', async function() {
          el.open();
          await el.updateComplete;
          // TODO: Figure out better way than manual sleep
          await sleep(150);

          assert.isTrue(el.opened, 'should be opened');

          const dialog = getDialog();
          const display = getComputedStyle(dialog, null).display;
          assert.equal(display, 'block', 'Dialog display');

          assert.isOk(el.shadowRoot!.querySelector('paper-dialog paper-input#team-name'), 'name field');
        });

        it('closes dialog when cancelled', async function() {
          el.open();
          await el.updateComplete;
          // TODO: Figure out better way than manual sleep
          await sleep(0);

          assert.isTrue(el.opened, 'should be opened');

          const nameField = el.shadowRoot!.querySelector('paper-dialog paper-input#team-name') as HTMLInputElement;
          nameField.value = 'Cancel team 01'

          const cancelButton = el.shadowRoot!.querySelector('paper-dialog paper-button[dialog-dismiss]') as HTMLElement;
          cancelButton.click();
          // TODO: Figure out better way than manual sleep
          await sleep(50);

          assert.isFalse(el.opened, 'should be closed');

          const dialog = getDialog();
          const display = getComputedStyle(dialog, null).display;
          assert.equal(display, 'none', 'Dialog display');

          // assert.isUndefined(el.newTeam, 'newTeam');
        });

        it('creates new team when dialog saved', async function() {
          el.open();
          await el.updateComplete;
          // TODO: Figure out better way than manual sleep
          await sleep(0);

          assert.isTrue(el.opened, 'should be opened');

          const nameField = el.shadowRoot!.querySelector('paper-dialog paper-input#team-name') as HTMLInputElement;
          nameField.value = ' Club team 01 '

          let eventFired = false;
          let newTeam = null;
          const handler = function (firedEvent: Event) {
            eventFired = true;
            const event = firedEvent as CustomEvent;
            newTeam = event.detail.team;
            window.removeEventListener('new-team-created', handler);
          };

          window.addEventListener('new-team-created', handler);

          const saveButton = el.shadowRoot!.querySelector('paper-dialog paper-button[dialog-confirm]') as HTMLElement;
          saveButton.click();
          // TODO: Figure out better way than manual sleep
          await sleep(50);

          assert.isFalse(el.opened, 'should be closed');

          const dialog = getDialog();
          const display = getComputedStyle(dialog, null).display;
          assert.equal(display, 'none', 'Dialog display');

          assert.isTrue(eventFired, 'Event new-team-created should be fired');

          assert.deepEqual(newTeam,
            {
              id: '',
              name: 'Club team 01'
            });
        });

        it('a11y', function() {
          return axeReport(el);
        });
      });
