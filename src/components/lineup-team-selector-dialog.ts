/**
@license
*/

import '@material/mwc-button';
import '@material/mwc-dialog';
import { Dialog } from '@material/mwc-dialog';
import '@material/mwc-list';
import { List } from '@material/mwc-list';
import { isEventMulti, SingleSelectedEvent } from '@material/mwc-list/mwc-list-foundation';
import '@material/mwc-list/mwc-list-item';
import { html, LitElement } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { Team, Teams } from '../models/team.js';
import { SharedStyles } from './shared-styles.js';

@customElement('lineup-team-selector-dialog')
export class LineupTeamSelectorDialog extends LitElement {
  override render() {
    const teamList = Object.keys(this.teams).map((key) => this.teams[key]);
    const hasTeams = teamList.length > 0;
    const selectEnabled = hasTeams && this.changedTeamId && (this.changedTeamId !== this.teamId);
    return html`
      ${SharedStyles}
      <style>
        mwc-dialog {
          /* Width should be 600px on wide screens, or 90% of viewport, but at least 260px */
          --mdc-dialog-min-width: max(min(600px, 90vw), 260px);
        }
        .dialog-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
      </style>
      <mwc-dialog
                  @opening="${this.dialogEvent}" @opened="${this.dialogEvent}"
                  @closing="${this.dialogEvent}" @closed="${this.dialogClosed}">
        <div>
          <div class="dialog-header">
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
        <mwc-button slot="primaryAction" dialogAction="select" ?disabled=${!selectEnabled}>Select</mwc-button>
        <mwc-button slot="secondaryAction" dialogAction="close">Cancel</mwc-button>
      </mwc-dialog>
    `;
  }

  private getTeamListItems(teamList: Team[]) {
    teamList.sort((a, b) => a.name.localeCompare(b.name));
    return teamList.map((team) => {
      const isCurrentTeam = team.id === this.teamId;
      return html`
            <mwc-list-item id="${team.id}" graphic="icon">
              <span>${team.name}</span>
              ${isCurrentTeam ? html`<mwc-icon slot="graphic">check</mwc-icon>` : html``}
            </mwc-list-item>
            <li divider role="separator"></li>
            `
    });
  }

  @property({ type: String })
  teamId?= '';

  @property({ type: Object })
  teams: Teams = {};

  @query('mwc-dialog')
  protected dialog?: Dialog;

  @query('mwc-list')
  protected teamList?: List;

  // Tracks the newly-selected team in the list.
  @state()
  protected changedTeamId = '';

  async show() {
    this.clearSelection();
    this.dialog!.show();
    await this.requestUpdate();
  }

  private dialogEvent(e: CustomEvent) {
    console.log(`dialogEvent: [${e.type}] = ${JSON.stringify(e.detail)}`)
  }

  private dialogClosed(e: CustomEvent) {
    console.log(`dialogClosed: [${e.type}] = ${JSON.stringify(e.detail)}`);
    switch (e.detail.action) {
      case 'select': {
        this.dispatchEvent(new TeamChangedEvent({ teamId: this.changedTeamId }));
        break;
      }
      case 'new-team': {
        this.dispatchEvent(new AddNewTeamEvent());
        break;
      }
    }
  }

  private listSelected(e: CustomEvent) {
    if (isEventMulti(e)) {
      console.log(`Unexpected multi-selected event: ${JSON.stringify(e.detail)}`);
      return;
    }
    const selectedEvent = e as SingleSelectedEvent;
    if (selectedEvent.detail.index < 0) {
      console.log(`Unexpected selected event with negative index: ${JSON.stringify(e.detail)}`)
      return;
    }
    this.changedTeamId = this.teamList!.items[selectedEvent.detail.index].id;
  }

  private clearSelection() {
    this.teamList?.items.forEach((item) => {
      if (item.selected) {
        item.selected = false;
      }
    });
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

const ADD_NEW_TEAM_EVENT_NAME = 'add-new-team';
export class AddNewTeamEvent extends CustomEvent<{}> {
  static eventName = ADD_NEW_TEAM_EVENT_NAME;

  constructor() {
    super(AddNewTeamEvent.eventName, {
      bubbles: true,
      composed: true
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "lineup-team-selector-dialog": LineupTeamSelectorDialog;
  }
}


declare global {
  interface HTMLElementEventMap {
    [TEAM_CHANGED_EVENT_NAME]: TeamChangedEvent;
    [ADD_NEW_TEAM_EVENT_NAME]: AddNewTeamEvent;
  }
}
