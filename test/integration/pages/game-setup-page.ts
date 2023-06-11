/** @format */

import { LineupPlayerCard } from '@app/components/lineup-player-card.js';
import { LivePlayer } from '@app/models/live.js';
import { ElementHandle } from 'puppeteer';
import { GameDetailPage } from './game-detail-page.js';
import { PageOpenFunction, PageOptions } from './page-object.js';

// TODO: Reuse src definitions
export enum SetupSteps {
  Roster,
  Formation,
  Starters,
  Periods,
  Captains,
}

export enum SetupStatus {
  Pending,
  Active,
  InProgress,
  Complete,
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
    const setupHandle = await this.querySelectorInView(
      'lineup-view-game-detail',
      'lineup-game-setup'
    );
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
    const statusText = await taskHandle.$eval('div.status', (element) => {
      return element.textContent;
    });
    console.log(`Task status is ${statusText}`);
    if (statusText?.trim() === 'done') {
      return SetupStatus.Complete;
    }
    return SetupStatus.InProgress;
  }

  async getStarters(setupHandle?: ElementHandle<Element>) {
    if (!setupHandle) {
      setupHandle = await this.getSetupComponent();
    }
    return setupHandle.evaluate(async (setupNode) => {
      const starterList = setupNode!.shadowRoot!.querySelector('lineup-on-player-list');
      if (!starterList) {
        return [];
      }
      const items =
        starterList.shadowRoot!.querySelectorAll<LineupPlayerCard>('lineup-player-card');

      const players = [];
      for (const item of Array.from(items)) {
        const nameElement = item.shadowRoot!.querySelector('span.playerName');
        players.push({
          id: item.data?.player?.id,
          name: nameElement?.textContent,
        } as LivePlayer);
      }
      return players;
    });
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

  async setStarters(starters: string[], setupHandle?: ElementHandle<Element>) {
    if (starters.length !== 11) {
      throw new Error(`Starters requires 11 players: ${starters.length} provided`);
    }
    if (!setupHandle) {
      setupHandle = await this.getSetupComponent();
    }

    // Populate the starters.
    await setupHandle.evaluate(async (setupNode, starterIds) => {
      const setupRoot = setupNode!.shadowRoot!;
      const startersList = setupRoot.querySelector('lineup-on-player-list');
      const subsList = setupRoot.querySelector('lineup-player-list');
      if (!startersList || !subsList) {
        throw new Error(`Lists not found`);
      }
      const positions = Array.from<LineupPlayerCard>(
        startersList.shadowRoot!.querySelectorAll('lineup-player-card')
      );
      let index = 0;
      for (const playerId of starterIds) {
        // Select the |index|'th position in the formation.
        positions[index].click();

        // Select the |playerId| in the subs list.
        const subs = Array.from<LineupPlayerCard>(
          subsList.shadowRoot!.querySelectorAll('lineup-player-card')
        );
        const subCard = subs.find((card) => card.player?.id === playerId);
        if (!subCard) {
          throw new Error(`Starter not found in list: ${playerId}`);
        }
        subCard.click();

        // Confirm the starter.
        /* eslint-disable-next-line no-await-in-loop --
         * The await allows the UI to update, and loop iterations must be sequential.
         */
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
        index += 1;
      }
    }, starters);

    // Brief wait for components to render updates.
    await this.page.waitForTimeout(100);
  }

  async setPeriods(
    totalPeriods: number,
    periodLength: number,
    setupHandle?: ElementHandle<Element>
  ) {
    if (!setupHandle) {
      setupHandle = await this.getSetupComponent();
    }

    // Click the Periods step link, to show the dialog.
    const taskHandle = await this.getTaskElement(SetupSteps.Periods, setupHandle);
    const linkHandle = await this.getTaskLink(taskHandle);
    linkHandle.click();
    await this.page.waitForTimeout(100);

    await setupHandle.evaluate(
      async (setupNode, totalPeriods, periodLength) => {
        const setupRoot = setupNode!.shadowRoot!;

        const periodsDialog = setupRoot.querySelector('#periods-dialog');
        if (!periodsDialog) {
          throw new Error(`Periods dialog not found`);
        }
        const numPeriodsField = setupRoot.querySelector(`#num-periods > input`) as HTMLInputElement;
        numPeriodsField.value = `${totalPeriods}`;

        const periodLengthField = setupRoot.querySelector(
          `#period-length > input`
        ) as HTMLInputElement;
        periodLengthField.valueAsNumber = periodLength;

        const saveButton = periodsDialog.querySelector(
          'mwc-button[dialogAction="save"]'
        ) as HTMLButtonElement;
        saveButton.click();
      },
      totalPeriods,
      periodLength
    );

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

    // Roster is already populated on the game, mark the step as done.
    await this.markStepDone(SetupSteps.Roster, setupHandle);

    // Complete the formation step.
    await this.setFormation('4-3-3');

    // Populate the starters.
    await this.setStarters(starters, setupHandle);

    // Mark the Starters step done.
    await this.markStepDone(SetupSteps.Starters, setupHandle);

    // Complete the Periods step.
    await this.setPeriods(2, 45, setupHandle);

    // Captains step is currently a no-op, mark the step as done.
    await this.markStepDone(SetupSteps.Captains, setupHandle);

    // Finalize the setup.
    await this.markAllSetupDone(setupHandle);
  }
}
