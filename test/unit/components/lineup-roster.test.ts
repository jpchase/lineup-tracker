import { LineupRoster } from '@app/components/lineup-roster';
import { PlayerCreatedEvent, PlayerCreateCancelledEvent, PlayerEditCancelledEvent, PlayerEditedEvent } from '@app/components/lineup-roster-modify';
import '@app/components/lineup-roster.js';
import { PlayerStatus, Roster } from '@app/models/player';
import { ListItem } from '@material/mwc-list/mwc-list-item';
import { expect, fixture, nextFrame, oneEvent } from '@open-wc/testing';

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
      name: `Player [${size - i} for sorting] ${i}`,
      uniformNumber: i + (i % 3) * 10,
      positions: pos,
      status: PlayerStatus.Off
    };
  }
  return roster;
}

describe('lineup-roster tests', () => {
  let el: LineupRoster;
  beforeEach(async () => {
    el = await fixture('<lineup-roster></lineup-roster>');
  });

  function getPlayerItems() {
    const items = el.shadowRoot!.querySelectorAll('mwc-list mwc-list-item');
    return items;
  }

  function getCreateElement() {
    const element = el.shadowRoot!.querySelector('lineup-roster-modify');
    return element as Element;
  }

  function getEditElement() {
    const element = el.shadowRoot!.querySelector('lineup-roster-modify');
    return element as Element;
  }

  function getFirstEditButton() {
    const button = el.shadowRoot!.querySelector('mwc-list mwc-list-item mwc-icon-button[icon="edit"]');
    return button as HTMLElement;
  }

  function getInputField(parent: Element, fieldId: string): HTMLInputElement {
    const field = parent.shadowRoot!.querySelector(`#${fieldId} > input`);
    expect(field, `Missing field: ${fieldId}`).to.exist;
    return field as HTMLInputElement;
  }

  function getVisibility(element: Element) {
    return getComputedStyle(element, null).display;
  }

  it('starts empty', () => {
    expect(el.roster).to.deep.equal({});
    expect(el.addPlayerEnabled, 'addPlayerEnabled should default to true').to.be.true;
  });

  it('shows no players placeholder for empty roster', () => {
    expect(el.roster).to.deep.equal({});
    const placeholder = el.shadowRoot!.querySelector('div p.empty-list');
    expect(placeholder, 'Missing empty placeholder element').to.exist;
    expect(el).shadowDom.to.equalSnapshot();
  });

  for (const numPlayers of [1, 6]) {
    const testName = numPlayers === 1 ? 'single player' : 'multiple players';
    it(`renders list with ${testName}`, async () => {
      const roster = getRoster(numPlayers);
      el.roster = roster;
      await el.updateComplete;

      const items = getPlayerItems();
      expect(items.length).to.equal(numPlayers, 'Rendered player count');

      let index = 0;
      const sortedPlayers = Object.keys(roster).map(key => roster[key]).
        sort((a, b) => a.name.localeCompare(b.name));
      for (const player of sortedPlayers) {
        const rosterItem = (items[index] as ListItem)!;
        index++;

        const avatar = rosterItem.querySelector('.avatar');
        expect(avatar, 'Missing avatar').to.exist;
        expect(avatar!.textContent).to.equal(`#${player.uniformNumber}`, 'Player number');

        const nameElement = rosterItem.querySelector('.name');
        expect(nameElement, 'Missing name element').to.exist;
        expect(nameElement!.textContent).to.equal(player.name, 'Player name');

        const positionsElement = rosterItem.querySelector('.positions');
        expect(positionsElement, 'Missing positions element').to.exist;
        expect(positionsElement!.textContent).to.equal(player.positions.join(', '), 'Player positions');
      }
      expect(el).shadowDom.to.equalSnapshot();
    });

    it(`a11y - ${testName}`, async () => {
      expect(el).to.be.accessible();
    });
  }

  it('shows stats in team mode', async () => {
    const roster = getRoster(1);
    el.roster = roster;
    el.mode = 'team';
    await el.updateComplete;

    const items = getPlayerItems();
    const actionsElement = items[0].querySelector('.actions');
    expect(actionsElement, 'Missing actions element').to.exist;
    expect(actionsElement!.textContent!.trim()).to.equal('NN games');
  });

  it('shows actions in game mode', async () => {
    const roster = getRoster(1);
    el.roster = roster;
    el.mode = 'game';
    await el.updateComplete;

    const items = getPlayerItems();
    const actionsElement = items[0].querySelector('.actions');
    expect(actionsElement, 'Missing actions element').to.exist;
    expect(actionsElement!.textContent!.trim()).to.equal('actions here');
  });

  it('add button hidden when adds are not allowed', async () => {
    el.addPlayerEnabled = false;
    await el.updateComplete;

    const addButton = el.shadowRoot!.querySelector('mwc-fab');
    expect(addButton, 'Add player button should not exist').not.to.exist;

    expect(el).shadowDom.to.equalSnapshot();
  });

  it('shows create widget when add clicked', async () => {
    const createElement = getCreateElement();
    expect(createElement, 'Missing create widget').to.exist;

    let display = getVisibility(createElement);
    expect(display).to.equal('none', 'Create element should not be visible');

    const addButton = el.shadowRoot!.querySelector('mwc-fab');
    setTimeout(() => addButton!.click());
    await oneEvent(addButton!, 'click');

    display = getVisibility(createElement);
    expect(display).to.equal('block', 'Create element should now be visible');
  });

  it('creates new player when saved', async () => {
    // Open the create player widget.
    const createElement = getCreateElement();
    expect(createElement, 'Missing create widget').to.exist;

    const addButton = el.shadowRoot!.querySelector('mwc-fab');
    setTimeout(() => addButton!.click());
    await oneEvent(addButton!, 'click');

    // Fill the required fields.
    const nameField = getInputField(createElement, 'nameField');
    nameField.value = ' Player 1 '
    const uniformField = getInputField(createElement, 'uniformNumberField');
    uniformField.value = '2';

    // Click save to trigger the expected event.
    const saveButton = createElement.shadowRoot!.querySelector('mwc-button.save') as HTMLElement;
    setTimeout(() => saveButton.click());

    const { detail } = await oneEvent(el, PlayerCreatedEvent.eventName) as PlayerCreatedEvent;

    expect(detail).to.include(
      {
        id: '',
        name: 'Player 1',
        uniformNumber: 2,
      });
  });

  it('closes create widget when cancel clicked', async () => {
    // Open the create player widget.
    const createElement = getCreateElement();
    expect(createElement, 'Missing create widget').to.exist;

    const addButton = el.shadowRoot!.querySelector('mwc-fab');
    setTimeout(() => addButton!.click());
    await oneEvent(addButton!, 'click');

    // Click cancel to close the widget.
    const cancelButton = createElement.shadowRoot!.querySelector('mwc-button.cancel') as HTMLElement;
    setTimeout(() => cancelButton.click());

    await oneEvent(el, PlayerCreateCancelledEvent.eventName);
    await nextFrame();

    const display = getVisibility(createElement);
    expect(display).to.equal('none', 'Create element should not be visible anymore');
  });

  describe('editing', () => {
    let roster: Roster;

    beforeEach(async () => {
      roster = getRoster(4);
      el.roster = roster;
      el.editPlayerEnabled = true;
      await el.updateComplete;
    })

    it('edit button hidden when edits are not allowed', async () => {
      el.editPlayerEnabled = false;
      await el.updateComplete;

      const editButton = getFirstEditButton();
      expect(editButton, 'Edit player button should not exist').not.to.exist;
    });

    it('edit button shows when edits are allowed', async () => {
      el.editPlayerEnabled = true;
      await el.updateComplete;

      const editButton = getFirstEditButton();
      expect(editButton, 'Edit player button should exist').to.exist;

      expect(editButton.dataset.playerId,
        'Edit player button should have playerId set as data attribute').to.exist;

      expect(roster[editButton.dataset.playerId!],
        'Edit player button should have playerId found in roster').to.exist;

      expect(el).shadowDom.to.equalSnapshot();
    });

    it('shows edit widget when edit clicked for player', async () => {
      const editElement = getEditElement();
      expect(editElement, 'Missing edit widget').to.exist;

      let display = getVisibility(editElement);
      expect(display).to.equal('none', 'Edit element should not be visible');

      // Open the edit player widget.
      const editButton = getFirstEditButton();
      setTimeout(() => editButton!.click());
      await oneEvent(editButton!, 'click');

      display = getVisibility(editElement);
      expect(display).to.equal('block', 'Edit element should now be visible');
    });

    it('edit widget is populated with player details', async () => {
      // Open the edit player widget.
      const editElement = getEditElement();
      expect(editElement, 'Missing edit widget').to.exist;

      const editButton = getFirstEditButton();
      setTimeout(() => editButton!.click());
      await oneEvent(editButton!, 'click');

      const nameField = getInputField(editElement, 'nameField');
      const uniformNumberField = getInputField(editElement, 'uniformNumberField');

      const player = roster[editButton.dataset.playerId!];

      expect(nameField.value, 'Name field should be populated')
        .to.equal(player.name);
      expect(uniformNumberField.value, 'Uniform number field should be populated')
        .to.equal(`${player.uniformNumber}`);
    });

    it('updates existing player when saved', async () => {
      // Open the edit player widget.
      const editElement = getEditElement();
      expect(editElement, 'Missing edit widget').to.exist;

      const editButton = getFirstEditButton();
      setTimeout(() => editButton!.click());
      await oneEvent(editButton!, 'click');

      const existingPlayer = roster[editButton.dataset.playerId!];

      const nameField = getInputField(editElement, 'nameField');
      nameField.value = 'Updated name'

      const uniformField = getInputField(editElement, 'uniformNumberField');
      uniformField.value = '99';

      const saveButton = editElement.shadowRoot!.querySelector('mwc-button.save') as HTMLElement;
      setTimeout(() => saveButton.click());

      const { detail } = await oneEvent(el, PlayerEditedEvent.eventName) as PlayerEditedEvent;

      expect(detail).to.deep.equal(
        {
          ...existingPlayer,
          name: 'Updated name',
          uniformNumber: 99,
        });

      const display = getVisibility(editElement);
      expect(display).to.equal('none', 'Edit element should not be visible anymore');
    });

    it('closes edit widget when cancel clicked', async () => {
      // Open the edit player widget.
      const editElement = getEditElement();
      expect(editElement, 'Missing edit widget').to.exist;

      const editButton = getFirstEditButton();
      setTimeout(() => editButton!.click());
      await oneEvent(editButton!, 'click');

      // Click cancel to close the widget.
      const cancelButton = editElement.shadowRoot!.querySelector('mwc-button.cancel') as HTMLElement;
      setTimeout(() => cancelButton.click());

      await oneEvent(el, PlayerEditCancelledEvent.eventName);
      await nextFrame();

      const display = getVisibility(editElement);
      expect(display).to.equal('none', 'Edit element should not be visible anymore');
    });

    it('a11y', async () => {
      expect(el).to.be.accessible();
    });

  }); // describe('editing')

});
