/**
@license
*/

import '@material/mwc-fab';
import '@material/mwc-list';
import { customElement, html, LitElement, property } from 'lit-element';
import { Player, Roster } from '../models/player';
import './lineup-roster-modify';
import { SharedStyles } from './shared-styles';

@customElement('lineup-roster')
export class LineupRoster extends LitElement {
  protected render() {
    const roster = this.roster;
    const playerList = roster ? Object.keys(roster).map(key => roster[key]) : [];
    return html`
      ${SharedStyles}
      <style>
        :host { display: block; }

        .avatar {
          background-color: var(--mdc-theme-secondary);
        }

        mwc-list-item {
          /* Text colour for the avatar */
          --mdc-theme-text-icon-on-background: var(--mdc-theme-on-secondary);
        }

        lineup-roster-modify {
          display: none;
        }

        lineup-roster-modify[active] {
          display: block;
        }
      </style>
      <div>
      ${playerList.length > 0 ? html`
        <mwc-list noninteractive>
          ${this.getPlayerListItems(playerList)}
        </mwc-list>
      ` : html`
        <p class="empty-list">
          No players in roster.
        </p>
      `}
      ${this.addPlayerEnabled ? html`
        <mwc-fab icon="person_add" label="Add Player" @click="${this.addButtonClicked}"></mwc-fab>
      ` : html``
      }
      <lineup-roster-modify ?active="${this._showCreate}"
                            @player-created="${this.newPlayerCreated}"
                            @player-create-cancelled="${this.newPlayerCancelled}" >
      </lineup-roster-modify>

      </div>`
  }

  private getPlayerListItems(playerList: Player[]) {
    const isGame = this.mode === 'game';
    playerList.sort((a, b) => a.name.localeCompare(b.name));
    return playerList.map((player) => {
      return html`
            <mwc-list-item id="${player.id}" graphic="avatar" twoline hasMeta>
              <span class="name">${player.name}</span>
              <span slot="secondary" class="positions">${player.positions.join(', ')}</span>
              <span slot="graphic" class="avatar">&#35${player.uniformNumber}</span>
              <span slot="meta" class="actions">${isGame ? `actions here` : `NN games`}</span>
            </mwc-list-item>
            <li divider role="separator"></li>
            `
    });
  }

  @property({ type: Object })
  roster: Roster = {};

  @property({ type: String })
  mode = '';

  @property({ type: Boolean })
  addPlayerEnabled = true;

  @property({ type: Boolean })
  private _showCreate = false;

  private addButtonClicked() {
    this._showCreate = true;
  }

  private newPlayerCreated(/*e: CustomEvent*/) {
    // TODO: Event bubbles up, but is processed by parent first, could make it
    // awkward to close widget, before handling/spinner for db saving.
    this.closePlayerModify();
  }

  private newPlayerCancelled() {
    this.closePlayerModify();
  }

  private closePlayerModify() {
    this._showCreate = false;
  }
}
