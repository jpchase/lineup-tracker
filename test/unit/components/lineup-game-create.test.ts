/** @format */

import { GameCreatedEvent, LineupGameCreate } from '@app/components/lineup-game-create';
import '@app/components/lineup-game-create.js';
import { expect, fixture, html, nextFrame, oneEvent } from '@open-wc/testing';

describe('lineup-game-create tests', () => {
  let el: LineupGameCreate;
  beforeEach(async () => {
    el = await fixture(html`<lineup-game-create></lineup-game-create>`);
    await el.show();
  });

  function getInputField(fieldId: string) {
    const field = el.shadowRoot!.querySelector(`#${fieldId} > input`);
    expect(field, `Missing field: ${fieldId}`).to.be.ok;
    return field as HTMLInputElement;
  }

  it('starts empty', async () => {
    const dateField = getInputField('dateField');

    expect(dateField.value).to.equal('', 'Date field should be empty');

    await expect(el).shadowDom.to.equalSnapshot();
  });

  it('clears fields when shown again', async () => {
    const nameField = getInputField('nameField');
    nameField.value = ' G01 ';

    const dateField = getInputField('dateField');
    dateField.value = '2016-01-01';

    const timeField = getInputField('timeField');
    timeField.value = '14:30';

    const opponentField = getInputField('opponentField');
    opponentField.value = ' Some Opponent ';

    const cancelButton = el.shadowRoot!.querySelector(
      'mwc-button[dialogAction="close"]',
    ) as HTMLElement;
    cancelButton.click();
    await nextFrame();

    await el.show();

    expect(nameField.value, 'Name field should be empty').to.equal('');
    expect(dateField.value, 'Date field should be empty').to.equal('');
    expect(timeField.value, 'Time field should be empty').to.equal('');
    expect(opponentField.value, 'Opponent field should be empty').to.equal('');
  });

  it('creates new game when saved', async () => {
    const nameField = getInputField('nameField');
    nameField.value = ' G01 ';

    const gameDate = new Date(2016, 0, 1, 14, 30);
    const dateField = getInputField('dateField');
    dateField.value = '2016-01-01';

    const timeField = getInputField('timeField');
    timeField.value = '14:30';

    const opponentField = getInputField('opponentField');
    opponentField.value = ' Some Opponent ';

    const saveButton = el.shadowRoot!.querySelector(
      'mwc-button[dialogAction="save"]',
    ) as HTMLElement;
    setTimeout(() => saveButton.click());

    const { detail } = await oneEvent(el, GameCreatedEvent.eventName);

    expect(detail.game).to.deep.equal({
      name: 'G01',
      date: gameDate,
      opponent: 'Some Opponent',
    });
  });

  it('a11y', async () => {
    await expect(el).to.be.accessible();
  });
});
