/**
@license
*/

import { LitElement, customElement, html, property } from 'lit-element';

import { Games } from '../models/game';

// These are the elements needed by this element.
import '@material/mwc-icon';
import { peopleIcon } from './lineup-icons';

// These are the shared styles needed by this element.
import { SharedStyles } from './shared-styles';

// This element is *not* connected to the Redux store.
@customElement('lineup-game-list')
export class LineupGameList extends LitElement {
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
            <div class="name">${game.name}</div>
            <div secondary>
              <span class="opponent">${game.opponent}</span>
              <span class="gameDate">${game.date}</span>
            </div>
            <a href="/game/${game.id}" title="View game"><mwc-icon>playlist_play</mwc-icon></a>
            <button title="View roster">${peopleIcon}</button>
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
