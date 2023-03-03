import '@material/mwc-icon';
import { html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { DateFormatter } from '../models/clock.js';
import { Games } from '../models/game.js';
import { peopleIcon } from './lineup-icons.js';
import { SharedStyles } from './shared-styles.js';

@customElement('lineup-game-list')
export class LineupGameList extends LitElement {
  override render() {
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
              <span class="gameDate">${this._dateFormatter.format(game.date)}</span>
            </div>
            <a href="/game/${game.id}" title="View game"><mwc-icon>playlist_play</mwc-icon></a>
            <a href="/gameroster/${game.id}" title="View roster">${peopleIcon}</a>
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

  private _dateFormatter = new DateFormatter();
}
