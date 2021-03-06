/**
@license
*/

import { PageObject, PageOptions, PageOpenFunction } from './page-object';

export class TeamSelectPage extends PageObject {

  constructor(options: PageOptions = {}) {
    super({
      ...options,
      scenarioName: 'selectTeam'
    });
  }

  protected get openFunc(): PageOpenFunction | undefined {
    return async () => {
      await this.page.evaluate(`(async () => {
        const teamSelector = document.querySelector('lineup-app').shadowRoot.querySelector('lineup-team-selector').shadowRoot.querySelector('mwc-button');
        await teamSelector.click();
      })()`);
    };
  }
}
