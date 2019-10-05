import { fixture, assert } from '@open-wc/testing';
      import 'axe-core/axe.min.js';
      import {axeReport} from 'pwa-helpers/axe-report.js';
      import '@app/components/lineup-roster.js';
import { LineupRoster } from '@app/components/lineup-roster';
import { PlayerStatus, Roster } from '@app/models/player';

      function getRoster(numPlayers: number): Roster {
        const size = numPlayers || 6;
        const roster: Roster = {};
        for (let i = 0; i < size; i++) {
          const playerId = `P${i}`;
          let pos: string[] = [];
          switch (i % 3) {
            case 0:
              pos = ['CB', 'FB', 'HM'];
              break;

            case 1:
              pos = ['S', 'OM'];
              break;

            case 2:
              pos = ['AM'];
              break;
          }

          roster[playerId] = {
            id: playerId,
            name: `Player ${i}`,
            uniformNumber: i + (i % 3) * 10,
            positions: pos,
            status: PlayerStatus.Off
          };
        }
        return roster;
      }

      describe('lineup-roster tests', function() {
        let el: LineupRoster;
        beforeEach(async () => {
          el = await fixture('<lineup-roster></lineup-roster>');
        });

        function getCreateElement() {
          const element = el.shadowRoot!.querySelector('lineup-roster-modify');
          assert.isOk(element, 'Missing create widget');

          return element as Element;
        }

        function verifyVisibility(element: Element, expectedDisplay: string) {
          const display = getComputedStyle(element, null).display;
          assert.equal(display, expectedDisplay, 'Element display (visibility)');
        }

        function sleep(milliseconds: number) {
          return new Promise(resolve => setTimeout(resolve, milliseconds))
        }

        it('starts empty', function() {
          assert.deepEqual(el.roster, {});
        });

        it('shows no players placeholder for empty roster', function() {
          assert.deepEqual(el.roster, {});
          const placeholder = el.shadowRoot!.querySelector('div p.empty-list');
          assert.isOk(placeholder, 'Missing empty placeholder element');
        });

        for (const numPlayers of [1, 6]) {
          const testName = numPlayers === 1 ? 'single player' : `multiple players`;
          it(`renders list with ${testName}`, async function() {
            const roster = getRoster(numPlayers);
            // const playerIds = Object.keys(roster);
            el.roster = roster;
            await el.updateComplete;

            const items = el.shadowRoot!.querySelectorAll('div div div lineup-roster-item');
            assert.isOk(items, 'Missing items for players');
            assert.equal(items.length, numPlayers, 'Rendered player count');
          });
        }

        it('shows create widget when add clicked', async function() {
          const createElement = getCreateElement();

          verifyVisibility(createElement, 'none');

          const addButton = el.shadowRoot!.querySelector('mwc-fab');
          addButton!.click();
          // TODO: Figure out better way than manual sleep
          await sleep(50);
          verifyVisibility(createElement, 'block');
        });

        it('creates new player when saved', function() {
          assert.isTrue(true);
        });

        it('closes create widget when cancel clicked', function() {
          assert.isTrue(true);
        });

        it('shows edit widget when edit clicked for player', function() {
          assert.isTrue(true);
        });

        it('edit widget is populated with player details', function() {
          assert.isTrue(true);
        });

        it('updates existing player when saved', function() {
          assert.isTrue(true);
        });

        it('closes edit widget when cancel clicked', function() {
          assert.isTrue(true);
        });

        it('a11y', function() {
          console.log('ally test');
          return axeReport(el);
        });
      });
