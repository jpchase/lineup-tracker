/** @format */

import '@app/components/lineup-view-team-create.js';
import { LineupViewTeamCreate } from '@app/components/lineup-view-team-create.js';
import { Team } from '@app/models/team.js';
import { addNewTeam } from '@app/slices/team/index.js';
import { writer } from '@app/storage/firestore-writer.js';
import { RootState, setupStore } from '@app/store.js';
import { aTimeout, expect, fixture, html, nextFrame } from '@open-wc/testing';
import sinon from 'sinon';
import { ActionLogger } from '../helpers/action-logger.js';
import { mockPageRouter } from '../helpers/mock-page-router.js';
import { buildRootState } from '../helpers/root-state-setup.js';
import { getMockAuthState, TEST_USER_ID } from '../helpers/test_data.js';

function buildSignedInState(): RootState {
  const state = buildRootState();
  state.auth = getMockAuthState({ signedIn: true, userId: TEST_USER_ID });
  return state;
}

describe('lineup-view-team-create tests', () => {
  let el: LineupViewTeamCreate;
  let dispatchStub: sinon.SinonSpy;
  let pageRouterSpy: sinon.SinonSpy;
  let actionLogger: ActionLogger;

  beforeEach(async () => {
    actionLogger = new ActionLogger();
    actionLogger.setup();
  });

  afterEach(async () => {
    sinon.restore();
  });

  async function setupElement(preloadedState?: RootState) {
    const store = setupStore(preloadedState, /*hydrate=*/ false);

    const mockRouter = {
      gotoPage: () => {
        // No-op, meant to be spied.
        return Promise.resolve();
      },
    };
    const parentNode = document.createElement('div');
    mockPageRouter(parentNode, mockRouter);
    const template = html`<lineup-view-team-create active .store=${store}>
    </lineup-view-team-create>`;
    el = await fixture(template, { parentNode });
    dispatchStub = sinon.spy(el, 'dispatch');
    pageRouterSpy = sinon.spy(mockRouter, 'gotoPage');
  }

  function getCreateElement() {
    const element = el.shadowRoot!.querySelector('section lineup-team-create');
    expect(element, 'Create element should be shown').to.be.ok;
    return element as Element;
  }

  it('shows signin placeholder when not signed in', async () => {
    const state = buildRootState();
    state.auth = getMockAuthState({ signedIn: false });

    await setupElement(state);

    const placeholder = el.shadowRoot!.querySelector('section p.unauthorized') as HTMLElement;
    expect(placeholder, 'Missing unauthorized placeholder element').to.be.ok;
    expect(placeholder.innerText.trim()).to.equal('Sign in to create a new team.');

    await expect(el).shadowDom.to.equalSnapshot();
    await expect(el).to.be.accessible();
  });

  it('shows create component when signed in', async () => {
    await setupElement(buildSignedInState());
    await el.updateComplete;

    const teamCreateElement = getCreateElement();
    expect(teamCreateElement, 'Create element should be shown').to.be.ok;

    await expect(el).shadowDom.to.equalSnapshot();
    await expect(el).to.be.accessible();
  });

  it('creates new team when saved', async () => {
    // Mock the call to add the team in storage.
    const writerStub = sinon.stub<typeof writer>(writer);
    writerStub.updateDocument.returns();

    await setupElement(buildSignedInState());
    await el.updateComplete;

    // Fill in fields in the create element, and save.
    const createElement = getCreateElement();

    const newName = 'A created team';
    const nameField = createElement.shadowRoot!.querySelector('#team-name') as HTMLInputElement;
    nameField.value = newName;

    const saveButton = createElement.shadowRoot!.querySelector('mwc-button.save') as HTMLElement;
    saveButton.click();

    // Allow promises to resolve, in the persistence of the team.
    await Promise.race([nextFrame(), aTimeout(10)]);

    // Verify that the add team action was dispatched.
    expect(dispatchStub).to.have.been.called;

    const expectedTeam = {
      id: '',
      name: newName,
    } as Team;
    expect(actionLogger.lastAction()).to.deep.include(addNewTeam(expectedTeam));

    // Verify that it navigated to the home page.
    await el.updateComplete;
    expect(pageRouterSpy).to.be.calledOnceWith(`/viewHome`);
  });
});
