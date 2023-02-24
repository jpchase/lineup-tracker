import { ElementHandle } from 'puppeteer';
import { GameDetailPage } from './game-detail-page.js';
import { PageOpenFunction, PageOptions } from './page-object.js';

export enum SetupSteps {
  Formation,
  Roster,
  Captains,
  Starters
}

export enum SetupStatus {
  Pending,
  Active,
  InProgress,
  Complete
}

export class GameSetupPage extends GameDetailPage {
  constructor(options: PageOptions = {}) {
    super({
      ...options,
      scenarioName: options.scenarioName ?? 'viewGameDetail',
      route: `game/${options.gameId}`
    });
  }

  override get openFunc(): PageOpenFunction | undefined {
    return async () => {
      this.log('in openFunc for more waiting');
      await this.page.waitForTimeout(2000);
    };
  }

  private async getSetupComponent() {
    const setupHandle = await this.querySelectorInView('lineup-view-game-detail', 'lineup-game-setup');
    if (!setupHandle) {
      throw new Error('Setup component not found');
    }
    return setupHandle;
  }

  async getTaskElement(step: SetupSteps, setupHandle?: ElementHandle<Element>) {
    if (!setupHandle) {
      setupHandle = await this.getSetupComponent();
    }
    const taskHandle = await setupHandle.$(`pierce/div > div.task.step${step}`);
    if (!taskHandle) {
      throw new Error(`Element for task ${step} not found`);
    }
    return taskHandle;
  }

  async getTaskLink(taskHandle: ElementHandle<Element>) {
    const linkHandle = await taskHandle.$('.name a.step');
    if (!linkHandle) {
      throw new Error('Step link not found');
    }
    return linkHandle;
  }

  async getTaskElementStatus(taskHandle: ElementHandle<Element>) {
    const statusText = await taskHandle.$eval('div.status', element => {
      return element.textContent;
    });
    console.log(`Task status is ${statusText}`);
    switch (statusText?.trim()) {
      case 'done':
        return SetupStatus.Complete;
    }
    return SetupStatus.InProgress;
  }

  async setFormation(formationType: string) {
    const setupHandle = await this.getSetupComponent();

    // Click the Formation step link, to show the formation widget.
    const taskHandle = await this.getTaskElement(SetupSteps.Formation, setupHandle);
    const linkHandle = await this.getTaskLink(taskHandle);
    linkHandle.click();

    // Fill in the formation widget.
    const formationSelect = await setupHandle.$('pierce/.formation > select');
    if (!formationSelect) {
      throw new Error('Formation select not found');
    }
    await formationSelect.select(formationType);

    // Brief wait for components to render updates.
    await this.page.waitForTimeout(100);
  }

  async markStepDone(step: SetupSteps) {
    const taskHandle = await this.getTaskElement(step);
    const buttonHandle = await taskHandle.$('.status mwc-button.finish');
    if (!buttonHandle) {
      throw new Error('Finish step button not found');
    }
    await buttonHandle.click();
  }

}
