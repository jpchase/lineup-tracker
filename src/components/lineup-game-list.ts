/**
@license
*/

import { LitElement, html, property } from 'lit-element';

import { Games } from '../models/game.js';

// These are the shared styles needed by this element.
import { SharedStyles } from './shared-styles.js';

// This element is *not* connected to the Redux store.
class LineupGameList extends LitElement {
  protected render() {
    const games = this.games;
    const gameList = games ? Object.keys(games).map(key => games[key]) : [];
    return html`
      ${SharedStyles}
      <style>
        :host { display: block; }
        .empty-list {
          text-align: center;
          white-space: nowrap;
          color: var(--app-secondary-color);
        }
      </style>
      <div>
      ${gameList.length > 0 ? html`
        <div class="list">
        ${gameList.map(game => html`
          <div class="game">
            ${JSON.stringify(game)}
          </div>
        `)}
        </div>
      ` : html`
        <p class="empty-list">
          This team has no games.
        </p>
      `}
      </div>`
  }

  @property({ type: Object })
  games: Games = {};
}

window.customElements.define('lineup-game-list', LineupGameList);
