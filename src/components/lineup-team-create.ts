/**
@license
*/

import { LitElement, customElement, html, property } from 'lit-element';

import { Team } from '../models/team';

// These are the elements needed by this element.
import '@material/mwc-button';
import '@polymer/paper-dialog/paper-dialog.js';
import '@material/mwc-textfield';
import { TextField } from '@material/mwc-textfield';
import { PaperDialogElement } from '@polymer/paper-dialog/paper-dialog.js';

import { EVENT_NEWTEAMCREATED } from './events';

interface PaperDialogClosingReason {
  confirmed?: boolean;
}

// These are the shared styles needed by this element.
import { SharedStyles } from './shared-styles';

// This element is *not* connected to the Redux store.
@customElement('lineup-team-dialog')
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
        <mwc-textfield id="team-name" label="Team Name" required>
        </mwc-textfield>
        <div class="buttons">
          <mwc-button dialog-dismiss>Cancel</mwc-button>
          <mwc-button raised dialog-confirm autofocus>Save</mwc-button>
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

    const nameField = this.shadowRoot!.querySelector('#team-name') as TextField;
    const newTeam: Team = {
      id: '',
      name: nameField.value.trim()
    };

    // This event will be handled by lineup-app.
    this.dispatchEvent(new CustomEvent(EVENT_NEWTEAMCREATED, {
      bubbles: true, composed: true, detail: {
        team: newTeam
      }
    }));
  }
}
