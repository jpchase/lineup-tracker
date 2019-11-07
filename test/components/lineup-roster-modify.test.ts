import { EVENT_NEWPLAYERCREATED } from '@app/components/events';
import { LineupRosterModify } from '@app/components/lineup-roster-modify';
import '@app/components/lineup-roster-modify.js';
import { PlayerStatus } from '@app/models/player';
import { assert, expect, fixture } from '@open-wc/testing';

describe('lineup-roster-modify tests', () => {
  let el: LineupRosterModify;
  beforeEach(async () => {
    el = await fixture('<lineup-roster-modify></lineup-roster-modify>');
  });

  function getInputField(fieldId: string): HTMLInputElement {
    const field = el.shadowRoot!.querySelector(`#${fieldId} > input`);
    assert.isOk(field, `Missing field: ${fieldId}`);
    return field as HTMLInputElement;
  }

  function sleep(milliseconds: number) {
    return new Promise(resolve => setTimeout(resolve, milliseconds))
  }

  it('starts empty', () => {
    const nameField = getInputField('nameField');

    assert.equal(nameField.value, '', 'Name field should be empty');
  });

  it('clears fields when cancelled', () => {
    // TODO: Implement when cancel handling is implemented.
    assert.isTrue(true);
  });

  it('creates new player when saved', async () => {
    // TODO: Figure out better way to wait for component to be rendered
    await sleep(50);

    const nameField = getInputField('nameField');
    nameField.value = ' Player 1 '

    const uniformField = getInputField('uniformNumberField');
    uniformField.value = '2';

    let eventFired = false;
    let newPlayer = null;
    const handler = function (firedEvent: Event) {
      const event = firedEvent as CustomEvent;
      eventFired = true;
      newPlayer = event.detail.player;
      window.removeEventListener(EVENT_NEWPLAYERCREATED, handler);
    };

    window.addEventListener(EVENT_NEWPLAYERCREATED, handler);

    const saveButton = el.shadowRoot!.querySelector('mwc-button.save') as HTMLElement;
    saveButton.click();
    // TODO: Figure out better way than manual sleep
    await sleep(50);

    assert.isTrue(eventFired, `Event ${EVENT_NEWPLAYERCREATED} should be fired`);

    assert.deepEqual(newPlayer,
      {
        id: '',
        name: 'Player 1',
        uniformNumber: 2,
        positions: [],
        status: PlayerStatus.Off
      });
  });

  it('a11y', async () => {
    await expect(el).to.be.accessible();
  });
});
