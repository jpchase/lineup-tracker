/** @format */

import { ElementHandle } from 'puppeteer';
import { PageObject, PageOptions } from './page-object.js';

export class TeamCreatePage extends PageObject {
  constructor(options: PageOptions = {}) {
    super({
      ...options,
      scenarioName: options.scenarioName ?? 'addNewTeam',
      route: 'addNewTeam',
      componentName: 'lineup-view-team-create',
    });
  }

  async fillTeamDetails(teamName: string, existingCreateHandle?: ElementHandle<Element>) {
    const createHandle = existingCreateHandle ?? (await this.getCreateComponent());

    await createHandle.evaluate(async (createNode, name) => {
      const createRoot = createNode.shadowRoot!;

      const nameField = createRoot.querySelector(`#team-name`);
      (nameField as any).value = name;
    }, teamName);
  }

  async saveNewTeam(existingCreateHandle?: ElementHandle<Element>) {
    const createHandle = existingCreateHandle ?? (await this.getCreateComponent());

    await createHandle.evaluate(async (createNode) => {
      const createRoot = createNode.shadowRoot!;

      const saveButton = createRoot.querySelector<HTMLButtonElement>('mwc-button.save')!;
      saveButton.click();
    });
    this.log(`team create button clicked`);
    // It appears to take ~2.5s for Firebase emulators to complete the write to storage.
    await this.waitForTimeout(4000);
    this.log(`wait for team create finished`);
  }

  async selectTeam(teamId: string) {
    const teamListHandle = await this.querySelectorInView(
      'lineup-team-selector',
      'paper-dropdown-menu paper-listbox',
    );
    if (!teamListHandle) {
      throw new Error('Team list component not found');
    }
    await teamListHandle.evaluate(async (listNode, id) => {
      (listNode as any).select(id);
    }, teamId);
  }

  async getCreateComponent() {
    const createHandle = await this.querySelectorInView(this.componentName!, 'lineup-team-create');
    if (!createHandle) {
      throw new Error('Create component not found');
    }
    return createHandle;
  }
}
