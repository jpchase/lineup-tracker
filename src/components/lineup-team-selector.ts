/** @format */

import '@material/mwc-button';
import '@material/mwc-list';
import '@material/mwc-list/mwc-list-item.js';
import { html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { Team } from '../models/team.js';
import { SharedStyles } from './shared-styles.js';

const SELECT_TEAM_EVENT_NAME = 'select-team';
export class SelectTeamEvent extends CustomEvent<{}> {
  static eventName = SELECT_TEAM_EVENT_NAME;

  constructor() {
    super(SelectTeamEvent.eventName, {
      bubbles: true,
      composed: true,
    });
  }
}

@customElement('lineup-team-selector')
export class LineupTeamSelector extends LitElement {
  override render() {
    const teamName = this.currentTeam ? this.currentTeam.name : 'Select a team';

    return html`
      ${SharedStyles}
      <style>
        mwc-button {
          /* Cannot override ripple colour, see https://github.com/material-components/material-components-web-components/issues/1102 */
          --mdc-ripple-color: var(--app-secondary-color);
          --mdc-theme-primary: var(--app-header-text-color);
          --mdc-typography-button-text-transform: none;
        }
      </style>
      <mwc-button
        id="team-switcher-button"
        data-team-id="${ifDefined(this.currentTeam?.id)}"
        icon="arrow_drop_down"
        trailingicon
        aria-label="${this.getTeamLabel()}"
        @click="${this.switcherClicked}"
        >${teamName}</mwc-button
      >
    `;
  }

  @property({ type: Object })
  currentTeam?: Team;

  private getTeamLabel() {
    if (this.currentTeam) {
      return `You are currently working with team ${this.currentTeam.name}. Hit enter to switch teams.`;
    }
    return 'No team selected. Hit enter to select a team.';
  }

  private switcherClicked() {
    this.dispatchEvent(new SelectTeamEvent());
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lineup-team-selector': LineupTeamSelector;
  }
}

declare global {
  interface HTMLElementEventMap {
    [SELECT_TEAM_EVENT_NAME]: SelectTeamEvent;
  }
}
