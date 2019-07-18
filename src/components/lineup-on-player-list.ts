/**
@license
*/

import { LitElement, customElement, html, property } from 'lit-element';
import { repeat } from 'lit-html/directives/repeat';

import { Formation, FormationLine } from '../models/formation';
import { Player, PlayerStatus, Roster } from '../models/player';

// These are the elements needed by this element.
import '@material/mwc-button';
import './lineup-player-card';

// These are the shared styles needed by this element.
import { SharedStyles } from './shared-styles';

interface PlayerPosition {
  id: string;
  position: string;
  player: Player;
}

interface PlayerLine extends FormationLine {
  id: string;
  playerPositions: PlayerPosition[];
}

function getLineForPosition(lines: PlayerLine[], position: string): PlayerLine {
  const line = lines.find(line => line.positions.includes(position));
  return line ? line : lines[0];
}

// This element is *not* connected to the Redux store.
@customElement('lineup-on-player-list')
export class LineupOnPlayerList extends LitElement {
  protected render() {
    const lines = this._getPlayerLines();
    return html`
      ${SharedStyles}
      <style>
        :host { display: block; }
      </style>
      <div>
      ${lines.length > 0 ? html`
        <div class="list">
        ${repeat(lines, (line: PlayerLine) => line.id, (line: PlayerLine /*, index: number*/) => html`
          <div>
          ${repeat(line.playerPositions, (position: PlayerPosition) => position.id, (position: PlayerPosition /*, index: number*/) => html`
            <lineup-player-card .mode="ON" .player="${position.player}"></lineup-player-card>
          `)}
          </div>
        `)}
        </div>
      ` : html`
        <p class="empty-list">
          Formation not set.
        </p>
      `}
      </div>`
  }

  @property({type: Object})
  roster: Roster|undefined = undefined;

  @property({type: Object})
  formation: Formation|undefined = undefined;

  _getPlayerLines(): PlayerLine[] {
    if (!this.roster || !this.formation) {
      return [];
    }

    // Inits the player lines structure from the formation.
    const formation = this.formation;
    const lines: PlayerLine[] = [
      formation.forward1, formation.forward2,
      formation.midfield1, formation.midfield2,
      formation.defense,
      formation.gk
    ].reduce((result: PlayerLine[], formationLine) => {
      // TODO: Set placeholders for each position, so unfilled ones are visible
      result.push({
        id: formationLine.id,
        positions: formationLine.positions,
        playerPositions: []
      });
      return result;
    }, []);

    // Puts the on players into the appropriate line
    const roster = this.roster;
    Object.keys(roster).forEach((key) => {
      const player = roster[key];
      if (player.status !== PlayerStatus.On) {
        // return;
      }
      // TODO: Add player.currentPosition
      const currentPosition = player.positions ? player.positions[0] : 'S';
      const line = getLineForPosition(lines, currentPosition);

      const position: PlayerPosition = {
        id: line.id + currentPosition,
        position: currentPosition,
        player
      }

      line.playerPositions.push(position);
    });

    return lines;
  }
}
