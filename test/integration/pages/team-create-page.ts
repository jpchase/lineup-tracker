/** @format */

import { ElementHandle } from 'puppeteer';
import { PageObject, PageOptions } from './page-object.js';

export class TeamCreatePage extends PageObject {
  private _getTeamCreateFuncExposed = false;

  constructor(options: PageOptions = {}) {
    super({
      ...options,
      scenarioName: options.scenarioName ?? 'addNewTeam',
      route: 'addNewTeam',
    });
  }

  async fillTeamDetails(teamName: string) {
    this.exposeGetTeamCreateFunc();
    /*   await this.page.evaluate(`async (teamName: string) => {
         console.log('in the evauate: ')//, 'getTeamCreateComponent' in window)
         // @ts-ignore
         const teamCreate = await window.getTeamCreateComponent();
         console.log('teamCreate is', teamCreate)
         const nameField: any = teamCreate!.shadowRoot!.querySelector('#team-name');
         console.log('name field is', nameField)
         nameField.value = teamName;
       }`, teamName);
   */
    /*
    await this.page.evaluate(`(async (teamName) => {
      console.log('in the evaluate');
      const teamCreate = ${this.getTeamCreateAsString};
      const nameField = teamCreate.shadowRoot.querySelector('#team-name');
      nameField.value = teamName;
    })('${teamName}')`);
  */
    await this.page.evaluate(`(async (teamName) => {
      console.log('in the evaluate: ' + teamName);
      const teamCreate = document.querySelector('lineup-app').shadowRoot.querySelector('lineup-view-team-create').shadowRoot.querySelector('lineup-team-create');
      const nameField = teamCreate.shadowRoot.querySelector('#team-name');
      nameField.value = teamName;
      console.log('done the evaluate: [' + nameField.value + ']');
    })('${teamName}')`);
  }

  async saveNewTeam() {
    this.exposeGetTeamCreateFunc();
    /*    await this.page.evaluate(async () => {
          // @ts-ignore
          const teamCreate = await window.getTeamCreateComponent();
          const saveButton = teamCreate!.shadowRoot!.querySelector('mwc-button.save') as HTMLElement;
          saveButton.click();
        });*/
    /* await this.page.evaluate(`(async () => {
        console.log('get team create')
        const teamCreate = document.querySelector('lineup-app').shadowRoot.querySelector('lineup-view-team-create').shadowRoot.querySelector('lineup-team-create');
        console.log('get save button')
        const saveButton = teamCreate.shadowRoot.querySelector('mwc-button.save');
        saveButton.click();
        await Promise.resolve();
      })()`); */
    const buttonHandle = (await this.page.evaluateHandle(`(async () => {
      console.log('get team create')
      const teamCreate = document.querySelector('lineup-app').shadowRoot.querySelector('lineup-view-team-create').shadowRoot.querySelector('lineup-team-create');
      console.log('get save button')
      const saveButton = teamCreate.shadowRoot.querySelector('mwc-button.save');
      return saveButton;
    })()`)) as ElementHandle;
    await buttonHandle.click();
    this.log(`team create button clicked`);
    // It appears to take ~2.5s for Firebase emulators to complete the write to storage.
    await this.waitForTimeout(3000);
    this.log(`wait for team create finished`);
  }

  async selectTeam(teamId: string) {
    // eslint-disable-next-line @typescript-eslint/no-shadow
    await this.page.evaluate((teamId: string) => {
      const app = document.querySelector('lineup-app');
      const selector = app!.shadowRoot!.querySelector('lineup-team-selector');
      const list = selector!.shadowRoot!.querySelector('paper-dropdown-menu paper-listbox');
      (list as any).select(teamId);
    }, teamId);
  }

  private async exposeGetTeamCreateFunc() {
    if (this._getTeamCreateFuncExposed) {
      this.log('Already done expose');
      return;
    }
    this.log('Time to expose');
    this._getTeamCreateFuncExposed = true;
    await this.page.exposeFunction('getTeamCreateComponent', () => {
      this.log('in exposed func');
      return document
        .querySelector('lineup-app')!
        .shadowRoot!.querySelector('lineup-view-team-create')
        ?.shadowRoot!.querySelector('lineup-team-create');
    });
  }

  // private get getTeamCreateAsString() {
  //   return `document.querySelector('lineup-app').shadowRoot.querySelector('lineup-view-team-create').shadowRoot.querySelector('lineup-team-create')`;
  // }
}
