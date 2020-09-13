/**
@license
*/

import '@polymer/paper-dropdown-menu/paper-dropdown-menu-light.js';
import '@polymer/paper-dropdown-menu/paper-dropdown-menu.js';
import '@polymer/paper-item/paper-icon-item.js';
import '@polymer/paper-item/paper-item.js';
import '@polymer/paper-listbox/paper-listbox.js';
import { customElement, html, internalProperty, LitElement, property, query } from 'lit-element';
import { Teams } from '../models/team';
import { SharedStyles } from './shared-styles';
import '@material/mwc-button';
import '@material/mwc-dialog';
import '@material/mwc-list';
import { Dialog } from '@material/mwc-dialog';
// import '@material/mwc-list';

// This element is *not* connected to the Redux store.
@customElement('lineup-team-selector')
export class LineupTeamSelector extends LitElement {
  protected render() {
    return html`
      ${SharedStyles}
      <style>
        paper-dropdown-menu.teams {
          width: 115px;
          /*
          --paper-input-container-label: {
            color: var(--paper-pink-500);
            font-style: italic;
            text-align: center;
            font-weight: bold;
          };
          --paper-input-container-input: {
            color: var(--paper-indigo-500);
            font-style: normal;
            font-family: serif;
            text-transform: uppercase;
          };*/
          /* no underline */
          --paper-input-container-underline: {
            display: none;
          };
        }
        /* TODO: Figure out why this style isn't being applied */
        paper-dropdown-menu-light {
        --paper-dropdown-menu-input: {
            color: var(--paper-indigo-500);
            font-style: normal;
            font-family: serif;
            text-transform: uppercase;
            border-bottom: none;
          };
        }

        paper-dropdown-menu-light.teams {
          --iron-icon-fill-color: var(--app-dark-text-color);
          --paper-dropdown-menu-label: {
            color: var(--paper-pink-500);
            font-style: italic;
            text-align: center;
            font-weight: bold;
          };
          /*
          --paper-dropdown-menu-input: {
            color: var(--paper-indigo-500);
            font-style: normal;
            font-family: serif;
            text-transform: uppercase;
            border-bottom: none;
          };*/
        }
      </style>
      <mwc-button id="team-switcher-button" icon="arrow_drop_down" trailingicon
          label="${this.getTeamLabel()}" @click="${this.switcherClicked}">${this.teamName}</mwc-button>
    `;
  }

  @property({ type: String })
  private teamId_ = '';

  get teamId() {
    return this.teamId_;
  }
  set teamId(value: string) {
    const oldValue = this.teamId_;
    this.teamId_ = value;
    if (value !== oldValue) {
      this.updateTeamName();
      if (this.teamDialog) {
        this.teamDialog.teamId = value;
      }
    }
    this.requestUpdate('teamId', oldValue);
  }

  @property({ type: Object })
  private teams_: Teams = {};

  get teams() {
    return this.teams_;
  }
  set teams(value: Teams) {
    const oldValue = this.teams_;
    this.teams_ = value;
    if (value !== oldValue) {
      this.updateTeamName();
      if (this.teamDialog) {
        this.teamDialog.teams = value;
      }
    }
    this.requestUpdate('teams', oldValue);
  }

  @property({ type: Object })
  dialogContainer: Node | null | undefined;

  @internalProperty()
  protected teamName = '';

  @internalProperty()
  protected showSelectDialog = false;

  private teamDialog: LineupTeamSelectorDialog | undefined

  private getTeamLabel() {
    return `You are currently working with team ${this.teamName}. Hit enter to switch teams.`;
  }

  private updateTeamName() {
    let text = '';
    if (this.teamId && this.teams) {
      const currentTeam = this.teams[this.teamId];
      if (currentTeam) {
        text = currentTeam.name;
      }
    }
    this.teamName = text || '<add team>';
  }

  private switcherClicked(e: CustomEvent) {
    console.log(`switcherClicked: ${e.detail}`)
    this.showSelectDialog = true;
    // this.requestUpdate();
    // this.render();
    this.showDialog();
  }

  private async showDialog() {
    if (!this.teamDialog) {
      this.teamDialog = document.createElement('lineup-team-selector-dialog') as LineupTeamSelectorDialog;
      (this.dialogContainer || this.shadowRoot!).appendChild(this.teamDialog);
      this.teamDialog.teams = this.teams;
      this.teamDialog.teamId = this.teamId;
      await this.teamDialog.updateComplete;
    }
    this.teamDialog.show();
    this.requestUpdate();
  }

}

@customElement('lineup-team-selector-dialog')
export class LineupTeamSelectorDialog extends LitElement {
  protected render() {
    return html`
      ${SharedStyles}
      <style>
        paper-dropdown-menu.teams {
          width: 115px;
          /*
          --paper-input-container-label: {
            color: var(--paper-pink-500);
            font-style: italic;
            text-align: center;
            font-weight: bold;
          };
          --paper-input-container-input: {
            color: var(--paper-indigo-500);
            font-style: normal;
            font-family: serif;
            text-transform: uppercase;
          };*/
          /* no underline */
          --paper-input-container-underline: {
            display: none;
          };
        }
        /* TODO: Figure out why this style isn't being applied */
        paper-dropdown-menu-light {
        --paper-dropdown-menu-input: {
            color: var(--paper-indigo-500);
            font-style: normal;
            font-family: serif;
            text-transform: uppercase;
            border-bottom: none;
          };
        }

        paper-dropdown-menu-light.teams {
          --iron-icon-fill-color: var(--app-dark-text-color);
          --paper-dropdown-menu-label: {
            color: var(--paper-pink-500);
            font-style: italic;
            text-align: center;
            font-weight: bold;
          };
          /*
          --paper-dropdown-menu-input: {
            color: var(--paper-indigo-500);
            font-style: normal;
            font-family: serif;
            text-transform: uppercase;
            border-bottom: none;
          };*/
        }
      </style>
      <mwc-dialog @opening="${this.dialogEvent}" @opened="${this.dialogEvent}" @closing="${this.dialogEvent}" @closed="${this.dialogEvent}">
        <div>
          <div>
            <span>Select a team</span>
            <mwc-button label="New Team" dialogAction="new-team"></mwc-button>
          </div>
          <mwc-list>
            ${Object.keys(this.teams).map((key) => {
      const team = this.teams[key];
      return html`
            <mwc-list-item id="${team.id}" ?selected="${team.id == this.teamId}">${team.name}</mwc-list-item>
            <li divider role="separator"></li>
            `
    })}
          </mwc-list>
        </div>
        <mwc-button slot="primaryAction" dialogAction="select">Select</mwc-button>
        <mwc-button slot="secondaryAction" dialogAction="close">Cancel</mwc-button>
      </mwc-dialog>
    `;
  }
  /*
    private _onIronSelect(e: CustomEvent) {
      if (!e.detail.item) {
        return;
      }

      if (e.detail.item.hasAttribute('addNew')) {
        this.dispatchEvent(new CustomEvent('add-new-team', { bubbles: true }));
      } else {
        this.dispatchEvent(new CustomEvent('team-changed', {
          bubbles: true,
          detail: {
            teamId: e.detail.item.getAttribute('id')
          }
        }));
      }
    }*/

  @property({ type: String })
  teamId = '';

  @property({ type: Object })
  teams: Teams = {};

  @query('mwc-dialog')
  dialog?: Dialog;

  show() {
    this.dialog!.show();
  }

  private dialogEvent(e: CustomEvent) {
    console.log(`dialogEvent: [${e.type}] = ${JSON.stringify(e.detail)}`)
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "lineup-team-selector": LineupTeamSelector;
    "lineup-team-selector-dialog": LineupTeamSelectorDialog;
  }
}
