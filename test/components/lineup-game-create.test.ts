import { fixture, assert } from '@open-wc/testing';
      import 'axe-core/axe.min.js';
      import {axeReport} from 'pwa-helpers/axe-report.js';
      import '@app/components/lineup-game-create.js';
import { LineupGameCreate } from '@app/components/lineup-game-create';

      describe('lineup-game-create tests', function() {
        let el: LineupGameCreate;
        beforeEach(async () => {
          el = await fixture('<lineup-game-create></lineup-game-create>');
        });

        function getInputField(fieldId: string) {
          const field = el.shadowRoot!.querySelector(`#${fieldId} > input`);
          assert.isOk(field, `Missing field: ${fieldId}`);
          return field as HTMLInputElement;
        }

        function sleep(milliseconds: number) {
          return new Promise(resolve => setTimeout(resolve, milliseconds))
        }

        it('starts empty', function() {
          const dateField = getInputField('dateField');

          assert.equal(dateField.value, '', 'Date field should be empty');
        });

        it('clears fields when cancelled', function() {
          // TODO: Implement when cancel handling is implemented.
          assert.isTrue(true);
        });

        it('creates new game when saved', async function() {
          // TODO: Figure out better way to wait for component to be rendered
          await sleep(50);

          const nameField = getInputField('nameField');
          nameField.value = ' G01 '

          const gameDate = new Date(2016, 0, 1, 14, 30);
          const dateField = getInputField('dateField');
          dateField.value = '2016-01-01';

          const timeField = getInputField('timeField');
          timeField.value = '14:30';

          const opponentField = getInputField('opponentField');
          opponentField.value = ' Some Opponent ';

          let eventFired = false;
          let newGame = null;
          const handler = function (firedEvent: Event) {
            eventFired = true;
            const event = firedEvent as CustomEvent;
            newGame = event.detail.game;
            window.removeEventListener('newgamecreated', handler);
          };

          window.addEventListener('newgamecreated', handler);

          const saveButton = el.shadowRoot!.querySelector('mwc-button.save') as HTMLElement;
          saveButton.click();
          // TODO: Figure out better way than manual sleep
          await sleep(50);

          assert.isTrue(eventFired, 'Event newgamecreated should be fired');

          assert.deepEqual(newGame,
            {
              name: 'G01',
              date: gameDate,
              opponent: 'Some Opponent'
            });
        });

        it('a11y', function() {
          return axeReport(el);
        });
      });
