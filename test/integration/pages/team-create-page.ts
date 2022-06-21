/**
@license
*/

import { PageObject, PageOptions } from './page-object.js';
import { ElementHandle } from 'puppeteer';

export class TeamCreatePage extends PageObject {
  private _getTeamCreateFuncExposed = false;

  constructor(options: PageOptions = {}) {
    super({
      ...options,
      scenarioName: 'addNewTeam',
      route: 'addNewTeam'
    });
  }

  async getCurrentTeam() {
    this.exposeGetTeamSelectorFunc();
    /*
    return await this.page.evaluate(() => {
      // @ts-ignore
      const teamSelector = window.getTeamSelectorComponent();
      if (!teamSelector) { return; }
      const selectedItem = teamSelector.selectedItem;
      return {
        id: selectedItem.id,
        name: teamSelector.value
      }
    });
    */
    return await this.page.evaluate(`(async () => {
  // @ts-ignore
  const teamSelector = document.querySelector('lineup-app').shadowRoot.querySelector('lineup-team-selector').shadowRoot.querySelector('#team-switcher-button');
  if (!teamSelector) { return; }
  /* const selectedItem = teamSelector.selectedItem; */
  console.log('selected: ',teamSelector,'value: ',teamSelector.innerText);
  return {
    id: '', // teamSelector.contentElement.selected, /* selectedItem.id,*/
    name: teamSelector.innerText
  }
})()`) as { id: string, name: string };
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
    const buttonHandle = await this.page.evaluateHandle(`(async () => {
      console.log('get team create')
      const teamCreate = document.querySelector('lineup-app').shadowRoot.querySelector('lineup-view-team-create').shadowRoot.querySelector('lineup-team-create');
      console.log('get save button')
      const saveButton = teamCreate.shadowRoot.querySelector('mwc-button.save');
      return saveButton;
    })()`) as ElementHandle;
    await buttonHandle.click();
    // await this.page.waitFor(500);
  }

  async selectTeam(teamId: string) {
    await this.page.evaluate((teamId: string) => {
      const app = document.querySelector('lineup-app');
      const selector = app!.shadowRoot!.querySelector('lineup-team-selector');
      const list = selector!.shadowRoot!.querySelector('paper-dropdown-menu paper-listbox');
      (list as any).select(teamId);
    }, teamId);
  }

  private async exposeGetTeamCreateFunc() {
    if (this._getTeamCreateFuncExposed) {
      console.log('Already done expose');
      return;
    }
    console.log('Time to expose');
    this._getTeamCreateFuncExposed = true;
    await this.page.exposeFunction('getTeamCreateComponent', () => {
      console.log('in exposed func')
      return document.querySelector('lineup-app')!.
        shadowRoot!.querySelector('lineup-view-team-create')?.
        shadowRoot!.querySelector('lineup-team-create');
    });
  }

  // private get getTeamCreateAsString() {
  //   return `document.querySelector('lineup-app').shadowRoot.querySelector('lineup-view-team-create').shadowRoot.querySelector('lineup-team-create')`;
  // }

  private async exposeGetTeamSelectorFunc() {
    await this.page.exposeFunction('getTeamSelectorComponent', () => {
      return document.querySelector('lineup-app')?.
        shadowRoot!.querySelector('lineup-team-selector')?.
        shadowRoot!.querySelector('paper-dropdown-menu');
    });
  }
}
