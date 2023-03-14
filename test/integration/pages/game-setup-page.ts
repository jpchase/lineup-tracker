import { LineupPlayerCard } from '@app/components/lineup-player-card.js';
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

  async setFormation(formationType: string, setupHandle?: ElementHandle<Element>) {
    if (!setupHandle) {
      setupHandle = await this.getSetupComponent();
    }

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

  async markStepDone(step: SetupSteps, setupHandle?: ElementHandle<Element>) {
    const taskHandle = await this.getTaskElement(step, setupHandle);
    const buttonHandle = await taskHandle.$('.status mwc-button.finish');
    if (!buttonHandle) {
      throw new Error('Finish step button not found');
    }
    await buttonHandle.click();
  }

  async markAllSetupDone(setupHandle: ElementHandle<Element>) {
    await setupHandle.$eval('pierce/#complete-button', (completeButton) => {
      (completeButton as HTMLElement).click();
    });
    // Brief wait for components to render updates.
    await this.page.waitForTimeout(50);
  }

  async completeSetup(starters: string[]) {
    if (starters.length !== 11) {
      throw new Error(`Starters requires 11 players: ${starters.length} provided`);
    }
    const setupHandle = await this.getSetupComponent();

    // Complete the formation step.
    await this.setFormation('4-3-3');

    // Roster is already populated on the game, mark the step as done.
    await this.markStepDone(SetupSteps.Roster, setupHandle);

    // Captains step is currently a no-op, mark the step as done.
    await this.markStepDone(SetupSteps.Captains, setupHandle);

    // Populate the starters.
    await setupHandle.evaluate(async (setupNode, starterIds) => {
      const setupRoot = setupNode!.shadowRoot!;
      const startersList = setupRoot.querySelector('lineup-on-player-list');
      const subsList = setupRoot.querySelector('lineup-player-list');
      if (!startersList || !subsList) {
        throw new Error(`Lists not found`);
      }
      const positions = Array.from<LineupPlayerCard>(startersList.shadowRoot!.querySelectorAll('lineup-player-card'));
      let index = 0;
      for (const playerId of starterIds) {
        // Select the |index|'th position in the formation.
        positions[index].click();

        // Select the |playerId| in the subs list.
        const subs = Array.from<LineupPlayerCard>(subsList.shadowRoot!.querySelectorAll('lineup-player-card'));
        const subCard = subs.find(card => (card.player?.id === playerId));
        if (!subCard) {
          throw new Error(`Starter not found in list: ${playerId}`);
        }
        subCard.click();

        // Confirm the starter.
        await Promise.resolve();
        const confirmSection = setupRoot.querySelector('#confirm-starter');
        if (!confirmSection) {
          throw new Error(`Missing confirm starter for: ${playerId}`);
        }
        const applyButton = confirmSection.querySelector('mwc-button.ok');
        if (!applyButton) {
          throw new Error(`Missing apply button for: ${playerId}`);
        }
        (applyButton as HTMLElement).click();
        index++;
      }
    }, starters);

    // Mark the Starters step done.
    await this.markStepDone(SetupSteps.Starters, setupHandle);

    // Finalize the setup.
    await this.markAllSetupDone(setupHandle);
  }

}
