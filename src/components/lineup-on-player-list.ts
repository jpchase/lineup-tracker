/**
@license
*/

import { LitElement, customElement, html, property } from 'lit-element';
import { repeat } from 'lit-html/directives/repeat';

import { Formation, FormationLine } from '../models/formation';
import { PlayerStatus, Roster } from '../models/player';

// These are the elements needed by this element.
import '@material/mwc-button';
import './lineup-player-card';
import { PlayerCardData } from './lineup-player-card';

// These are the shared styles needed by this element.
import { SharedStyles } from './shared-styles';

interface PlayerLine extends FormationLine {
  id: string;
  playerPositions: PlayerCardData[];
}

function getLineForPosition(lines: PlayerLine[], positionType: string): PlayerLine {
  const line = lines.find(line => line.positions.some(position => (position.type === positionType)));
  return line ? line : lines[0];
}

function getOpenPositionInLine(line: PlayerLine, positionType: string): PlayerCardData | undefined {
  return line.playerPositions.find(data => (!data.player && data.position.type === positionType));
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

        .line {
          border: 1px;
          border-style: solid;
        }

        .line lineup-player-card {
          display: inline;
        }
      </style>
      <div>
      ${lines.length > 0 ? html`
        <div class="list">
        ${repeat(lines, (line: PlayerLine) => line.id, (line: PlayerLine /*, index: number*/) => html`
          <div class="line">
          ${repeat(line.playerPositions, (cardData: PlayerCardData) => cardData.id, (cardData: PlayerCardData /*, index: number*/) => html`
            <lineup-player-card .mode="ON" .data="${cardData}"></lineup-player-card>
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
      const line = {
        id: formationLine.id,
        positions: formationLine.positions,
        playerPositions: <PlayerCardData[]>[]
      };
      // Creates placeholders for each position in the formation.
      formationLine.positions.forEach(position => {
        line.playerPositions.push({
          id: line.id + position.id,
          position: position
        });
      });
      result.push(line);
      return result;
    }, []);

    // Puts the on players into the appropriate line
    const roster = this.roster;
    Object.keys(roster).forEach((key) => {
      const player = roster[key];
      if (player.status !== PlayerStatus.On) {
        return;
      }
      // TODO: Add player.currentPosition
      const currentPosition = player.positions ? player.positions[0] : 'S';
      const line = getLineForPosition(lines, currentPosition);

      const cardData = getOpenPositionInLine(line, currentPosition);

      if (cardData)
      {
        cardData.player = player;
      }
    });

    return lines;
  }
}
