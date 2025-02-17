/** @format */

import '@material/mwc-button';
import { html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import { Formation, FormationLine, Position } from '../models/formation.js';
import { LivePlayer } from '../models/live.js';
import { PlayerStatus } from '../models/player.js';
import { PlayerListElement } from './core/player-list-element.js';
import './lineup-player-card.js';
import { PlayerCardData } from './lineup-player-card.js';
import { SharedStyles } from './shared-styles.js';

interface PlayerLine extends FormationLine {
  id: string;
  playerPositions: PlayerCardData[];
}

function getLineForPosition(lines: PlayerLine[], position: Position): PlayerLine | undefined {
  return lines.find((line) =>
    line.positions.some((linePosition) => linePosition.id === position.id),
  );
}

function getOpenPositionInLine(line: PlayerLine, position: Position): PlayerCardData | undefined {
  return line.playerPositions.find((data) => !data.player && data.position.id === position.id);
}

// This element is *not* connected to the Redux store.
@customElement('lineup-on-player-list')
export class LineupOnPlayerList extends PlayerListElement {
  override render() {
    const lines = this._getPlayerLines();
    return html` ${SharedStyles}
      <style>
        :host {
          display: block;
          /* Ignore the 24px padding applied to all sections */
          margin: 0 -24px;
        }

        .container {
          container-type: inline-size;
          width: 100%;
          max-width: 750px;
          margin: 0 auto;
        }

        .line {
          border: 1px;
          border-style: solid;
          column-gap: 0.5em;
          display: flex;
          justify-content: center;
          padding: 0.5em;
        }

        .line lineup-player-card {
          display: inline;
        }

        @container (min-width: 500px) {
          .line {
            column-gap: 1em;
          }
        }
      </style>
      <div>
        ${lines.length > 0
          ? html`
              <div class="list container">
                ${repeat(
                  lines,
                  (line: PlayerLine) => line.id,
                  (line: PlayerLine /*, index: number*/) => html`
                    <div class="line">
                      ${repeat(
                        line.playerPositions,
                        (cardData: PlayerCardData) => cardData.id,
                        (cardData: PlayerCardData /*, index: number*/) => html`
                          <lineup-player-card
                            mode="${PlayerStatus.On}"
                            .data="${cardData}"
                            .timeTracker="${this.getTracker(cardData.player!)}"
                          >
                          </lineup-player-card>
                        `,
                      )}
                    </div>
                  `,
                )}
              </div>
            `
          : html` <p class="empty-list">Formation not set.</p> `}
      </div>`;
  }

  @property({ type: Array })
  players: LivePlayer[] = [];

  @property({ type: Object })
  formation: Formation | undefined = undefined;

  @property({ type: Object })
  selectedPosition: Position | undefined = undefined;

  _getPlayerLines(): PlayerLine[] {
    if (!this.players || !this.formation) {
      return [];
    }

    // Inits the player lines structure from the formation.
    const formation = this.formation;
    const selectedPositionId = this.selectedPosition ? this.selectedPosition.id : null;
    const lines: PlayerLine[] = [
      formation.forward1,
      formation.forward2,
      formation.midfield1,
      formation.midfield2,
      formation.defense,
      formation.gk,
    ].reduce((result: PlayerLine[], formationLine) => {
      const line = {
        id: formationLine.id,
        positions: formationLine.positions,
        playerPositions: <PlayerCardData[]>[],
      };
      // Creates placeholders for each position in the formation.
      formationLine.positions.forEach((position) => {
        const selected = position.id === selectedPositionId;
        line.playerPositions.push({
          id: line.id + position.id,
          position: { ...position, selected },
        });
      });
      result.push(line);
      return result;
    }, []);

    // Puts the on players into the appropriate line
    this.players.forEach((player) => {
      if (player.status !== PlayerStatus.On) {
        return;
      }

      const currentPosition = player.currentPosition!;
      const line = getLineForPosition(lines, currentPosition);

      if (!line) {
        return;
      }
      const cardData = getOpenPositionInLine(line, currentPosition);

      if (cardData) {
        cardData.player = player;
      }
    });

    return lines;
  }
}
