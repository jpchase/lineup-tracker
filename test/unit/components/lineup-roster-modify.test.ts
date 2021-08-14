import { LineupRosterModify, PlayerCreatedEvent, PlayerEditedEvent } from '@app/components/lineup-roster-modify';
import '@app/components/lineup-roster-modify.js';
import { Player, PlayerStatus } from '@app/models/player';
import { expect, fixture, oneEvent } from '@open-wc/testing';

describe('lineup-roster-modify tests', () => {
  let el: LineupRosterModify;

  function getInputField(fieldId: string): HTMLInputElement {
    const field = el.shadowRoot!.querySelector(`#${fieldId} > input`);
    expect(field, `Missing field: ${fieldId}`).to.exist;
    return field as HTMLInputElement;
  }

  describe('create mode', () => {
    beforeEach(async () => {
      el = await fixture('<lineup-roster-modify mode="create"></lineup-roster-modify>');
    });

    it('starts empty', () => {
      const nameField = getInputField('nameField');
      expect(nameField.value, 'Name field should be empty').to.equal('');

      const uniformNumberField = getInputField('uniformNumberField');
      expect(uniformNumberField.value, 'Uniform number field should be empty').to.equal('');

      expect(el).shadowDom.to.equalSnapshot();
    });

    it.skip('clears fields when cancelled', () => {
      // TODO: Implement when cancel handling is implemented.
      expect.fail();
    });

    it('creates new player when saved', async () => {
      const nameField = getInputField('nameField');
      nameField.value = ' Player 1 '

      const uniformField = getInputField('uniformNumberField');
      uniformField.value = '2';

      const saveButton = el.shadowRoot!.querySelector('mwc-button.save') as HTMLElement;
      setTimeout(() => saveButton.click());

      const { detail } = await oneEvent(el, PlayerCreatedEvent.eventName) as PlayerCreatedEvent;

      expect(detail).to.deep.equal(
        {
          id: '',
          name: 'Player 1',
          uniformNumber: 2,
          positions: [],
          status: PlayerStatus.Off
        });
    });

    it('a11y - create', async () => {
      expect(el).to.be.accessible();
    });

  }); // describe('create mode')

  describe('edit mode', () => {
    const existingPlayer: Player = {
      id: 'P1',
      name: 'Existing Player',
      uniformNumber: 2,
      positions: ['CB'],
      status: PlayerStatus.Off
    };

    beforeEach(async () => {
      el = await fixture('<lineup-roster-modify mode="edit"></lineup-roster-modify>');
      el.player = existingPlayer;
      await el.updateComplete;
    });

    it('starts with existing player data populated', () => {
      const nameField = getInputField('nameField');
      expect(nameField.value, 'Name field should be populated')
        .to.equal(existingPlayer.name);

      const uniformNumberField = getInputField('uniformNumberField');
      expect(uniformNumberField.value, 'Uniform number field should be populated')
        .to.equal(`${existingPlayer.uniformNumber}`);

      expect(el).shadowDom.to.equalSnapshot();
    });

    it('edits existing player when saved', async () => {
      const nameField = getInputField('nameField');
      nameField.value = ' Updated name '

      const uniformField = getInputField('uniformNumberField');
      uniformField.value = '99';

      const saveButton = el.shadowRoot!.querySelector('mwc-button.save') as HTMLElement;
      setTimeout(() => saveButton.click());

      const { detail } = await oneEvent(el, PlayerEditedEvent.eventName) as PlayerEditedEvent;

      expect(detail).to.deep.equal(
        {
          ...existingPlayer,
          name: 'Updated name',
          uniformNumber: 99,
        });
    });

    it('a11y - edit', async () => {
      expect(el).to.be.accessible();
    });
  }); // describe('edit mode')

});
