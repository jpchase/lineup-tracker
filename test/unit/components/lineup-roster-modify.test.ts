import { LineupRosterModify, ModifyMode, PlayerCreateCancelledEvent, PlayerCreatedEvent, PlayerEditCancelledEvent, PlayerEditedEvent } from '@app/components/lineup-roster-modify';
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

    it('starts empty when reused after save', async () => {
      const nameField = getInputField('nameField');
      const uniformNumberField = getInputField('uniformNumberField');

      // Populate and save values
      nameField.value = 'Player 1'
      uniformNumberField.value = '2';

      const saveButton = el.shadowRoot!.querySelector('mwc-button.save') as HTMLElement;
      setTimeout(() => saveButton.click());

      await oneEvent(el, PlayerCreatedEvent.eventName);

      // Check that fields are empty, after save completes.
      await el.updateComplete;

      expect(nameField.value, 'Name field should be empty').to.equal('');
      expect(uniformNumberField.value, 'Uniform number field should be empty').to.equal('');
    });

    it('starts empty when reused after cancel', async () => {
      const nameField = getInputField('nameField');
      const uniformNumberField = getInputField('uniformNumberField');

      // Populate and save values
      nameField.value = 'Player 1'
      uniformNumberField.value = '2';

      const cancelButton = el.shadowRoot!.querySelector('mwc-button.cancel') as HTMLElement;
      setTimeout(() => cancelButton.click());

      await oneEvent(el, PlayerCreateCancelledEvent.eventName);

      // Check that fields are empty, after cancel completes.
      await el.updateComplete;

      expect(nameField.value, 'Name field should be empty').to.equal('');
      expect(uniformNumberField.value, 'Uniform number field should be empty').to.equal('');
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

    it('fires event when create cancelled', async () => {
      const cancelButton = el.shadowRoot!.querySelector('mwc-button.cancel') as HTMLElement;
      setTimeout(() => cancelButton.click());

      const { detail } = await oneEvent(el, PlayerCreateCancelledEvent.eventName) as PlayerCreateCancelledEvent;

      expect(detail).to.deep.equal(
        {
          mode: ModifyMode.Create
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
    const anotherPlayer: Player = {
      id: 'P2',
      name: 'Another Player',
      uniformNumber: 5,
      positions: ['AM'],
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

    it('starts with another player data populated when reused after save', async () => {
      // Save, with the values from the existing player unchanged.
      const saveButton = el.shadowRoot!.querySelector('mwc-button.save') as HTMLElement;
      setTimeout(() => saveButton.click());

      await oneEvent(el, PlayerEditedEvent.eventName);

      // Set a different player.
      el.player = anotherPlayer
      await el.updateComplete;

      const nameField = getInputField('nameField');
      const uniformNumberField = getInputField('uniformNumberField');

      expect(nameField.value, 'Name field should be populated')
        .to.equal(anotherPlayer.name);
      expect(uniformNumberField.value, 'Uniform number field should be populated')
        .to.equal(`${anotherPlayer.uniformNumber}`);
    });

    it('starts with another player data populated when reused after cancel', async () => {
      const nameField = getInputField('nameField');
      const uniformNumberField = getInputField('uniformNumberField');

      // Cancel, with the values from the existing player unchanged.
      const cancelButton = el.shadowRoot!.querySelector('mwc-button.cancel') as HTMLElement;
      setTimeout(() => cancelButton.click());

      await oneEvent(el, PlayerEditCancelledEvent.eventName);

      // Set a different player.
      el.player = anotherPlayer
      await el.updateComplete;

      expect(nameField.value, 'Name field should be populated')
        .to.equal(anotherPlayer.name);
      expect(uniformNumberField.value, 'Uniform number field should be populated')
        .to.equal(`${anotherPlayer.uniformNumber}`);
    });

    it('starts with same player data reset when reused after cancel', async () => {
      const nameField = getInputField('nameField');
      const uniformNumberField = getInputField('uniformNumberField');

      // Cancel, after updating the values for the existing player.
      nameField.value = existingPlayer.name + ' - updated';
      uniformNumberField.value = `${existingPlayer.uniformNumber + 1}`;

      const cancelButton = el.shadowRoot!.querySelector('mwc-button.cancel') as HTMLElement;
      setTimeout(() => cancelButton.click());

      await oneEvent(el, PlayerEditCancelledEvent.eventName);

      // Set to the same player again.
      el.player = existingPlayer
      await el.updateComplete;

      expect(nameField.value, 'Name field should be populated')
        .to.equal(existingPlayer.name);
      expect(uniformNumberField.value, 'Uniform number field should be populated')
        .to.equal(`${existingPlayer.uniformNumber}`);
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

    it('fires event when edit cancelled', async () => {
      const cancelButton = el.shadowRoot!.querySelector('mwc-button.cancel') as HTMLElement;
      setTimeout(() => cancelButton.click());

      const { detail } = await oneEvent(el, PlayerEditCancelledEvent.eventName) as PlayerEditCancelledEvent;

      expect(detail).to.deep.equal(
        {
          mode: ModifyMode.Edit
        });
    });

    it('a11y - edit', async () => {
      expect(el).to.be.accessible();
    });
  }); // describe('edit mode')

});
