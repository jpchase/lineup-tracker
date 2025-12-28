/** @format */

import '@app/components/lineup-roster-modify.js';
import { LineupRosterModify, NewPlayerCreatedEvent } from '@app/components/lineup-roster-modify.js';
import { PlayerStatus } from '@app/models/player.js';
import { expect, fixture, html, oneEvent } from '@open-wc/testing';

describe('lineup-roster-modify tests', () => {
  let el: LineupRosterModify;
  beforeEach(async () => {
    el = await fixture(html`<lineup-roster-modify></lineup-roster-modify>`);
  });

  function getInputField(fieldId: string): HTMLInputElement {
    const field = el.shadowRoot!.querySelector(`#${fieldId} > input`);
    expect(field, `Missing field: ${fieldId}`).to.be.ok;
    return field as HTMLInputElement;
  }

  it('starts empty', () => {
    const nameField = getInputField('nameField');

    expect(nameField.value, 'Name field should be empty').to.equal('');
  });

  it.skip('clears fields when cancelled', () => {
    // TODO: Implement when cancel handling is implemented.
    expect.fail();
  });

  it('creates new player when saved', async () => {
    const nameField = getInputField('nameField');
    nameField.value = ' Player 1 ';

    const uniformField = getInputField('uniformNumberField');
    uniformField.value = '2';

    const saveButton = el.shadowRoot!.querySelector('mwc-button.save') as HTMLElement;
    setTimeout(() => saveButton.click());

    const { detail } = (await oneEvent(
      el,
      NewPlayerCreatedEvent.eventName,
    )) as NewPlayerCreatedEvent;

    expect(detail.player).to.deep.equal({
      id: '',
      name: 'Player 1',
      uniformNumber: 2,
      positions: [],
      status: PlayerStatus.Off,
    });
  });

  it('a11y', async () => {
    await expect(el).to.be.accessible();
  });
});
