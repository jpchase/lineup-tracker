/**
@license
*/

import { LitElement, customElement, html, property } from 'lit-element';

import { Roster } from '../models/player';

// These are the elements needed by this element.
import '@material/mwc-fab';
import './lineup-roster-item';
import './lineup-roster-modify';

import { EVENT_NEWPLAYERCREATED, EVENT_NEWPLAYERCANCELLED } from './events';

// These are the shared styles needed by this element.
import { SharedStyles } from './shared-styles';

// This element is *not* connected to the Redux store.
@customElement('lineup-roster')
export class LineupRoster extends LitElement {
  protected render() {
    const roster = this.roster;
    const playerList = roster ? Object.keys(roster).map(key => roster[key]) : [];
    return html`
      ${SharedStyles}
      <style>
        :host { display: block; }

        lineup-roster-modify {
          display: none;
        }

        lineup-roster-modify[active] {
          display: block;
        }
      </style>
      <div>
      ${playerList.length > 0 ? html`
        <div class="list">
        ${playerList.map(player => html`
          <div>
            <lineup-roster-item .isGame="${this.mode === 'game'}" .player="${player}">
            </lineup-roster-item>
          </div>
        `)}
        </div>
      ` : html`
        <p class="empty-list">
          No players in roster.
        </p>
      `}
      <mwc-fab icon="person_add" label="Add Player" @click="${this._addButtonClicked}"></mwc-fab>
      <lineup-roster-modify ?active="${this._showCreate}"></lineup-roster-modify>

      </div>`
  }

  @property({ type: Object })
  roster: Roster = {};

  @property({ type: String })
  mode = '';

  @property({ type: Boolean })
  private _showCreate = false;

  protected firstUpdated() {
    window.addEventListener(EVENT_NEWPLAYERCREATED, this._newPlayerCreated.bind(this) as EventListener);
    window.addEventListener(EVENT_NEWPLAYERCANCELLED, this._newPlayerCancelled.bind(this) as EventListener);
  }

  private _addButtonClicked() {
    this._showCreate = true;
  }

  private _newPlayerCreated(/*e: CustomEvent*/) {
    // TODO: Event bubbles up, but is processed by parent first, could make it
    // awkward to close widget, before handling/spinner for db saving.
    this._closePlayerModify();
  }

  private _newPlayerCancelled() {
    this._closePlayerModify();
  }

  private _closePlayerModify() {
    this._showCreate = false;
  }
}
