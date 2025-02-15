/** @format */

import { LineupRosterModify } from '@app/components/lineup-roster-modify.js';
import { Player } from '@app/models/player.js';
import { ElementHandle } from 'puppeteer';
import { PageObject } from './page-object.js';

export class RosterPageObject extends PageObject {
  async getPlayers(allowEmpty?: boolean) {
    const rosterHandle = await this.maybeGetRosterComponent();
    if (!rosterHandle) {
      if (allowEmpty) {
        return [];
      }
      throw new Error('Roster component not found (and allowEmpty = false)');
    }
    return rosterHandle.evaluate(async (rosterNode) => {
      const items = rosterNode.shadowRoot!.querySelectorAll('mwc-list mwc-list-item');

      const players = [];
      for (const item of Array.from(items)) {
        const nameElement = item.querySelector('span.name');
        const numberElement = item.querySelector('span.avatar');
        const uniformNumber: number = parseInt(numberElement?.textContent?.replace('#', '')!, 10);
        players.push({
          id: item.id,
          name: nameElement?.textContent,
          uniformNumber,
        } as Player);
      }
      return players;
    });
  }

  async addPlayer(playerName: string, uniformNumber: number) {
    const modifyHandle = await this.getModifyComponent();

    await modifyHandle.evaluate(
      async (modifyNode, name, number) => {
        function getInputField(fieldId: string): HTMLInputElement {
          const field = modifyNode.shadowRoot!.querySelector(`#${fieldId} > input`);
          if (!field) {
            throw new Error(`Missing field: ${fieldId}`);
          }
          return field as HTMLInputElement;
        }

        const modifyRoot = modifyNode.shadowRoot!;

        const nameField = getInputField('nameField');
        nameField.value = name;

        const uniformField = getInputField('uniformNumberField');
        uniformField.value = `${number}`;

        // Save the new player, waiting a tick for updates to render.
        const saveButton = modifyRoot.querySelector('mwc-button.save') as HTMLElement;
        // eslint-disable-next-line no-console
        console.log(`Save the new player`);
        saveButton.click();
        await Promise.resolve();
      },
      playerName,
      uniformNumber,
    );

    // TODO: Wait until new player appears on the page?
    await this.waitForTimeout(1000);
  }

  async getRosterComponent() {
    const rosterHandle = await this.maybeGetRosterComponent();
    if (!rosterHandle) {
      throw new Error('Roster component not found');
    }
    return rosterHandle;
  }

  async maybeGetRosterComponent() {
    const rosterHandle = await this.querySelectorInView(this.componentName!, 'lineup-roster');
    return rosterHandle;
  }

  async getModifyComponent(existingRosterHandle?: ElementHandle<Element>) {
    const rosterHandle = existingRosterHandle ?? (await this.getRosterComponent());
    const modifyHandle = await rosterHandle.$('pierce/lineup-roster-modify');
    if (!modifyHandle) {
      throw new Error('Events component not found');
    }
    return modifyHandle as ElementHandle<LineupRosterModify>;
  }
}
