import '@app/components/lineup-view-games.js';
import { LineupViewGames } from '@app/components/lineup-view-games.js';
import { Games } from '@app/models/game.js';
import { getGameStoreConfigurator } from '@app/slices/game-store.js';
import { RootState, setupStore } from '@app/store.js';
import { Button } from '@material/mwc-button';
import { expect, fixture, html, nextFrame, oneEvent } from '@open-wc/testing';
import { buildGameStateWithGames } from '../helpers/game-state-setup.js';
import { buildRootState } from '../helpers/root-state-setup.js';
import { buildGames, getMockAuthState, getNewGame, getStoredGame, TEST_USER_ID } from '../helpers/test_data.js';
import { addElementAssertions } from '../helpers/element-assertions.js';

function getExistingGames(): Games {
  return buildGames([getStoredGame(), getNewGame()]);
}

function buildSignedInState(games: Games): RootState {
  const state = buildRootState(buildGameStateWithGames(games));
  state.auth = getMockAuthState({ signedIn: true, userId: TEST_USER_ID });
  return state;
}

describe('lineup-view-games tests', () => {
  let el: LineupViewGames;

  before(async () => {
    addElementAssertions();
  });

  async function setupElement(preloadedState?: RootState) {
    const store = setupStore(preloadedState, /*hydrate=*/false);

    const template = html`<lineup-view-games active .store=${store} .storeConfigurator=${getGameStoreConfigurator(/*hydrate=*/false)}></lineup-view-games>`;
    el = await fixture(template);
  }

  /*
  function getStore() {
    return el.store!;
  }
  */

  function getAddButton(allowMissing?: boolean) {
    const button = el.shadowRoot!.querySelector('#add-button');
    if (!allowMissing) {
      expect(button, 'Missing add game button').to.be.ok;
    }
    return button as Button;
  }

  function getCreateElement() {
    const element = el.shadowRoot!.querySelector('lineup-game-create');
    return element as Element;
  }

  it('shows signin placeholder when not signed in', async () => {
    const state = buildRootState();
    state.auth = getMockAuthState({ signedIn: false });
    await setupElement(state);

    const placeholder = el.shadowRoot!.querySelector('section p.unauthorized');
    expect(placeholder, 'Missing unauthorized placeholder element').to.be.ok;

    const listElement = el.shadowRoot!.querySelector('section lineup-game-list');
    expect(listElement, 'Game list element should not be shown').to.not.be.ok;

    const addButton = getAddButton(/*allowMissing=*/ true);
    expect(addButton, 'Add game button should not be shown').to.not.be.ok;

    await expect(el).shadowDom.to.equalSnapshot();
    await expect(el).to.be.accessible();
  });

  it('shows empty games list when team has no games', async () => {
    await setupElement(buildSignedInState({}));

    const listElement = el.shadowRoot!.querySelector('section lineup-game-list');
    expect(listElement, 'Game list element should be shown').to.be.ok;

    const placeholder = listElement!.shadowRoot!.querySelector('div p.empty-list');
    expect(placeholder, 'Missing empty placeholder element').to.be.ok;

    const addButton = getAddButton();
    expect(addButton.disabled, 'Add game button should be enabled').to.be.false;

    await expect(el).shadowDom.to.equalSnapshot();
    await expect(el).to.be.accessible();
  });

  it('shows games list when the team has games', async () => {
    const games = getExistingGames();

    await setupElement(buildSignedInState(games));

    const listElement = el.shadowRoot!.querySelector('section lineup-game-list');
    expect(listElement, 'Game list element should be shown').to.be.ok;

    await expect(el).shadowDom.to.equalSnapshot();
    await expect(el).to.be.accessible();
  });

  it('shows create widget when add clicked', async () => {
    await setupElement(buildSignedInState({}));

    const createElement = getCreateElement();
    expect(createElement, 'Missing create widget').to.exist;

    expect(createElement, 'Create element before add click').not.to.be.shown;

    const addButton = getAddButton();
    setTimeout(() => addButton!.click());
    await oneEvent(addButton!, 'click');

    expect(createElement, 'Create element after add click').to.be.shown;
  });

  // TODO: Enable test when fixed
  it.skip('closes create widget when cancel clicked', async () => {
    await setupElement(buildSignedInState({}));

    const createElement = getCreateElement();
    expect(createElement, 'Missing create widget').to.exist;

    expect(createElement, 'Create element before add click').not.to.be.shown;

    const addButton = getAddButton();
    setTimeout(() => addButton!.click());
    await oneEvent(addButton!, 'click');

    const cancelButton = createElement.shadowRoot!.querySelector('mwc-button.save') as HTMLElement;

    setTimeout(() => cancelButton!.click());
    await oneEvent(cancelButton!, 'click');
    await nextFrame();

    expect(createElement, 'Create element after cancel').not.to.be.shown;
  });

  it.skip('creates new game when saved', () => {
    expect.fail();
  });
});
