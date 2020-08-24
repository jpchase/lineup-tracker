import { LineupTeamCreate } from '@app/components/lineup-team-create';
import '@app/components/lineup-team-create.js';
import { expect, fixture, oneEvent } from '@open-wc/testing';

describe('lineup-team-create tests', () => {
  let el: LineupTeamCreate;
  beforeEach(async () => {
    el = await fixture('<lineup-team-create></lineup-team-create>');
  });

  function getInputField(fieldId: string) {
    const field = el.shadowRoot!.querySelector(`#${fieldId}`);
    expect(field, `Missing field: ${fieldId}`).to.be.ok;
    return field as HTMLInputElement;
  }

  it('starts empty', () => {
    const nameField = getInputField('team-name');
    expect(nameField.value, '', 'Name field should be empty').to.be.equal;
    expect(el).shadowDom.to.equalSnapshot();
  });

  it('creates new team when saved', async () => {
    const nameField = getInputField('team-name');
    nameField.value = ' Club team 01 ';

    const saveButton = el.shadowRoot!.querySelector('mwc-button.save') as HTMLElement;
    setTimeout(() => saveButton.click());

    const { detail } = await oneEvent(el, 'new-team-created');

    expect(detail.team).to.deep.equal(
      {
        id: '',
        name: 'Club team 01'
      });
  });

  // TODO: Enable test when cancel handling is implemented.
  it.skip('clears fields when cancelled', async () => {
    expect(true).to.be.true;
    const nameField = getInputField('team-name');
    nameField.value = 'Temp team name';

    const cancelButton = el.shadowRoot!.querySelector('mwc-button.cancel') as HTMLElement;
    setTimeout(() => cancelButton.click());

    const { } = await oneEvent(el, 'new-team-created');
  });

  it('a11y', async () => {
    await expect(el).to.be.accessible();
  });
});
