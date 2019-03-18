/**
@license
*/

import { LitElement, html, property } from 'lit-element';

import { Teams } from '../models/team.js';

// These are the elements needed by this element.
import '@polymer/paper-dropdown-menu/paper-dropdown-menu.js';
import '@polymer/paper-dropdown-menu/paper-dropdown-menu-light.js';
import '@polymer/paper-item/paper-icon-item.js';
import '@polymer/paper-item/paper-item.js';
import '@polymer/paper-listbox/paper-listbox.js';

// These are the shared styles needed by this element.
import { SharedStyles } from './shared-styles.js';

// This element is *not* connected to the Redux store.
class LineupTeamSelector extends LitElement {
  protected render() {
    return html`
      ${SharedStyles}
      <style>
        paper-dropdown-menu.teams {
          width: 115px;
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
          };
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
      <paper-dropdown-menu class="teams" label="Select team" no-label-float>
        <paper-listbox slot="dropdown-content"
                       class="dropdown-content"
                       selected="${this.teamId}"
                       attr-for-selected="id"
                       @iron-select="${this._onIronSelect}">
          ${Object.keys(this.teams).map((key) => {
            const team = this.teams[key];
            return html`
              <paper-item id="${team.id}">${team.name}</paper-item>
            `
          })}
          <paper-item addNew id="addnewteam">+ Add team</paper-item>
        </paper-listbox>
      </paper-dropdown-menu>
    `;
  }

  private _onIronSelect(e: CustomEvent) {
    if (e.detail.item && e.detail.item.hasAttribute('addNew')) {
      this.dispatchEvent(new CustomEvent('add-new-team', {bubbles: true}));
    }
  }

  @property({type: String})
  teamId = '';

  @property({type: Object})
  teams: Teams = {};
}

window.customElements.define('lineup-team-selector', LineupTeamSelector);
