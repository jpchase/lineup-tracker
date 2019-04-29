/**
@license
*/

import { LitElement, html, property } from 'lit-element';

import { Games } from '../models/game.js';

import { peopleIcon, scheduleIcon } from './lineup-icons.js';

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
      </style>
      <div>
      ${gameList.length > 0 ? html`
        <div class="list">
        ${gameList.map(game => html`
          <div class="game flex-equal-justified">
            <div class="gameId">${game.id}</div>
            <div secondary>
              <span class="opponent">${game.opponent}</span>
              <span class="gameDate">${game.date}</span>
            </div>
            <a href="/game/${game.id}" title="view game">${scheduleIcon}</a>
            <button title="view roster">${peopleIcon}</button>
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
