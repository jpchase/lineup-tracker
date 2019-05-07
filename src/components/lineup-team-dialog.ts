/**
@license
*/

import { LitElement, html, property } from 'lit-element';

import { Team } from '../models/team.js';

// These are the elements needed by this element.
import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-dialog/paper-dialog.js';
import '@polymer/paper-input/paper-input.js';
import { PaperDialogElement } from '@polymer/paper-dialog/paper-dialog.js';
import { PaperInputElement } from '@polymer/paper-input/paper-input.js';

import { EVENT_NEWTEAMCREATED } from './events.js';

interface PaperDialogClosingReason {
  confirmed?: boolean;
}

// These are the shared styles needed by this element.
import { SharedStyles } from './shared-styles.js';

// This element is *not* connected to the Redux store.
export class LineupTeamDialog extends LitElement {
  protected render() {
    console.log('in render()');
    return html`
      ${SharedStyles}
      <style>
        paper-dialog {
          --iron-icon-fill-color: var(--app-dark-text-color);
          --paper-dropdown-menu-label: {
            color: var(--paper-pink-500);
            font-style: italic;
            text-align: center;
            font-weight: bold;
          };
        }
      </style>
      <paper-dialog id="teams-dialog" modal @opened-changed="${this._onOpenedChanged}">
        <h2>Add new team</h2>
        <paper-input id="team-name" label="Team Name">
        </paper-input>
        <div class="buttons">
          <paper-button dialog-dismiss>Cancel</paper-button>
          <paper-button dialog-confirm autofocus>Save</paper-button>
        </div>
      </paper-dialog>
    `;
  }

  @property({ type: Boolean })
  get opened(): boolean | null | undefined {
    return this._dialog && this._dialog.opened;
  }
  set opened(newValue: boolean | null | undefined) {
    if (this._dialog) {
      this._dialog.opened = newValue;
    }
  }

  @property({ type: Object })
  teams: Team[] = [];

  private _dialog: PaperDialogElement | undefined = undefined;

  protected firstUpdated() {
    this._dialog = this.shadowRoot!.querySelector('#teams-dialog') as PaperDialogElement;
  }

  open() {
    this._dialog!.open();
  }

  private _onOpenedChanged(e: CustomEvent) {
    console.log(`_onDialogClosed: ${JSON.stringify(e.detail)}`);
    if (e.detail.value) {
      // Dialog is opened
      return;
    }

    if (!this._dialog) {
      return;
    }

    const closingReason = this._dialog.closingReason as PaperDialogClosingReason;
    if (!closingReason || !closingReason.confirmed) {
      console.log('dialog was not closed');
      return;
    }

    console.log('actually closed');

    const nameField = this.shadowRoot!.querySelector('paper-dialog paper-input#team-name') as PaperInputElement;
    const newTeam: Team = {
      id: '',
      name: nameField.value!.trim()
    };

    // This event will be handled by lineup-app.
    this.dispatchEvent(new CustomEvent(EVENT_NEWTEAMCREATED, {
      bubbles: true, composed: true, detail: {
        team: newTeam
      }
    }));
  }
}

window.customElements.define('lineup-team-dialog', LineupTeamDialog);
