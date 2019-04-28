/**
@license
*/

import { html, property } from 'lit-element';
import { PageViewElement } from './page-view-element.js';

import { Game } from '../models/game.js';

// This element is connected to the Redux store.
import { connect } from 'pwa-helpers/connect-mixin.js';
import { store } from '../store.js';

// We are lazy loading its reducer.
import game from '../reducers/game.js';
store.addReducers({
  game
});

// These are the shared styles needed by this element.
import { SharedStyles } from './shared-styles.js';

class LineupViewGameDetail extends connect(store)(PageViewElement) {
  protected render() {
    return html`
      ${SharedStyles}
      <section>
        <p>TODO: Load game for id [${this._gameId}]</p>
      ${this._game ? html`
        <p>TODO: Show game details for id [${this._gameId}]</p>
      ` : html`
        <p class="empty-list">
          Game not found.
        </p>
      `}
      </section>
    `;
  }

  @property({ type: String })
  private _gameId = '';

  @property({ type: Object })
  private _game: Game | undefined;

  protected firstUpdated() {
    this._gameId = '';
  }

}

window.customElements.define('lineup-view-game-detail', LineupViewGameDetail);
