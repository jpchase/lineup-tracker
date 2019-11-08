import { LineupTeamDialog } from '@app/components/lineup-team-dialog';
import '@app/components/lineup-team-dialog.js';
import { assert, expect, fixture, nextFrame } from '@open-wc/testing';

describe('lineup-team-dialog tests', () => {
  let el: LineupTeamDialog;
  beforeEach(async () => {
    el = await fixture('<lineup-team-dialog></lineup-team-dialog>');
  });

  function getDialog() {
    let dialog = el.shadowRoot!.querySelector('paper-dialog');
    assert.isOk(dialog, 'Missing dialog');
    return dialog!;
  }

  function getInputField(fieldId: string) {
    const field = el.shadowRoot!.querySelector(`#${fieldId}`);
    assert.isOk(field, `Missing field: ${fieldId}`);
    return field as HTMLInputElement;
  }

  it('starts empty', () => {
    assert.isArray(el.teams, 'teams');
    assert.equal(el.teams.length, 0, 'teams array length');
  });

  it('starts closed', () => {
    assert.isFalse(el.opened, 'opened');
  });

  it('shows dialog when opened', async () => {
    el.open();
    await el.updateComplete;

    // Waits a frame, to allow the dialog to be shown.
    await nextFrame();

    assert.isTrue(el.opened, 'should be opened');

    const dialog = getDialog();
    const display = getComputedStyle(dialog, null).display;
    assert.equal(display, 'block', 'Dialog display');

    // Gets and asserts the input field.
    getInputField('team-name');
  });

  it('closes dialog when cancelled', async () => {
    el.open();
    await el.updateComplete;

    // Waits a frame, to allow the dialog to be shown.
    await nextFrame();

    assert.isTrue(el.opened, 'should be opened');

    const nameField = getInputField('team-name');
    nameField.value = 'Cancel team 01'

    const cancelButton = el.shadowRoot!.querySelector('paper-dialog mwc-button[dialog-dismiss]') as HTMLElement;
    cancelButton.click();

    // Waits a frame, to allow the dialog to be closed.
    await nextFrame();

    assert.isFalse(el.opened, 'should be closed');

    const dialog = getDialog();
    const display = getComputedStyle(dialog, null).display;
    assert.equal(display, 'none', 'Dialog display');
  });

  it('creates new team when dialog saved', async () => {
    el.open();
    await el.updateComplete;

    assert.isTrue(el.opened, 'should be opened');

    const nameField = getInputField('team-name');
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

    const saveButton = el.shadowRoot!.querySelector('paper-dialog mwc-button[dialog-confirm]') as HTMLElement;
    saveButton.click();

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

  it('a11y', async () => {
    await expect(el).to.be.accessible();
  });
});
