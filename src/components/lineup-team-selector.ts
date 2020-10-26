/**
@license
*/

import '@material/mwc-button';
import '@material/mwc-dialog';
import { Dialog } from '@material/mwc-dialog';
import '@material/mwc-list';
import '@material/mwc-list/mwc-list-item';
import '@polymer/paper-dropdown-menu/paper-dropdown-menu-light.js';
import '@polymer/paper-dropdown-menu/paper-dropdown-menu.js';
import '@polymer/paper-item/paper-icon-item.js';
import '@polymer/paper-item/paper-item.js';
import '@polymer/paper-listbox/paper-listbox.js';
import { customElement, html, internalProperty, LitElement, property, query } from 'lit-element';
import { Teams, Team } from '../models/team';
import { SharedStyles } from './shared-styles';
import { isEventMulti, SingleSelectedEvent } from '@material/mwc-list/mwc-list-foundation';
import { List } from '@material/mwc-list';

// This element is *not* connected to the Redux store.
@customElement('lineup-team-selector')
export class LineupTeamSelector extends LitElement {
  protected render() {
    return html`
      ${SharedStyles}
      <style>
      </style>
      <mwc-button id="team-switcher-button" icon="arrow_drop_down" trailingicon
          aria-label="${this.getTeamLabel()}" @click="${this.switcherClicked}">${this.teamName}</mwc-button>
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
    this.teamName = text;
  }

  private switcherClicked(e: CustomEvent) {
    console.log(`switcherClicked: ${e.detail}`)
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

export interface TeamChangedDetail {
  teamId: string;
}

const TEAM_CHANGED_EVENT_NAME = 'team-changed';
export class TeamChangedEvent extends CustomEvent<TeamChangedDetail> {
  static eventName = TEAM_CHANGED_EVENT_NAME;

  constructor(detail: TeamChangedDetail) {
    super(TeamChangedEvent.eventName, {
      detail,
      bubbles: true,
      composed: true
    });
  }
}

@customElement('lineup-team-selector-dialog')
export class LineupTeamSelectorDialog extends LitElement {
  protected render() {
    const teamList = Object.keys(this.teams).map((key) => this.teams[key]);
    const hasTeams = teamList.length > 0;
    return html`
      ${SharedStyles}
      <style>
      </style>
      <mwc-dialog @opening="${this.dialogEvent}" @opened="${this.dialogEvent}" @closing="${this.dialogEvent}" @closed="${this.dialogClosed}">
        <div>
          <div>
            <span>Select a team</span>
            <mwc-button label="New Team" dialogAction="new-team"></mwc-button>
          </div>
          ${hasTeams ? html`
          <mwc-list activatable @selected="${this.listSelected}">
            ${this.getTeamListItems(teamList)}
          </mwc-list>
          ` : html`
          <p class="empty-list">
            No teams created.
          </p>
          `}
        </div>
        <mwc-button slot="primaryAction" dialogAction="select" ?disabled=${!hasTeams}>Select</mwc-button>
        <mwc-button slot="secondaryAction" dialogAction="close">Cancel</mwc-button>
      </mwc-dialog>
    `;
  }

  private getTeamListItems(teamList: Team[]) {
    teamList.sort((a, b) => a.name.localeCompare(b.name));
    return teamList.map((team) => {
      return html`
            <mwc-list-item id="${team.id}" ?selected="${team.id === this.teamId}">${team.name}</mwc-list-item>
            <li divider role="separator"></li>
            `
    });
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
  protected dialog?: Dialog;

  @query('mwc-list')
  protected teamList?: List;

  // Tracks the newly-selected team in the list.
  protected changedTeamId = '';

  show() {
    this.dialog!.show();
  }

  private dialogEvent(e: CustomEvent) {
    console.log(`dialogEvent: [${e.type}] = ${JSON.stringify(e.detail)}`)
  }

  private dialogClosed(e: CustomEvent) {
    console.log(`dialogClosed: [${e.type}] = ${JSON.stringify(e.detail)}`);
    if (e.detail.action !== 'select') {
      return;
    }
    this.dispatchEvent(new TeamChangedEvent({ teamId: this.changedTeamId }));
  }

  private listSelected(e: CustomEvent) {
    if (isEventMulti(e)) {
      console.log(`Unexpected multi-selected event: ${JSON.stringify(e.detail)}`);
      return;
    }
    const selectedEvent = e as SingleSelectedEvent;
    this.changedTeamId = this.teamList!.items[selectedEvent.detail.index].id;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "lineup-team-selector": LineupTeamSelector;
    "lineup-team-selector-dialog": LineupTeamSelectorDialog;
  }
}


declare global {
  interface HTMLElementEventMap {
    [TEAM_CHANGED_EVENT_NAME]: TeamChangedEvent;
  }
}
