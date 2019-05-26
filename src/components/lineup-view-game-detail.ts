/**
@license
*/

import { html, customElement, property } from 'lit-element';
import { PageViewElement } from './page-view-element';

import { GameDetail, GameStatus } from '../models/game';
import { Roster } from '../models/player';

// This element is connected to the Redux store.
import { connect } from 'pwa-helpers/connect-mixin.js';
import { store, RootState } from '../store';

// We are lazy loading its reducer.
import game from '../reducers/game';
store.addReducers({
  game
});

// These are the actions needed by this element.
import { getGame } from '../actions/game';

// These are the elements needed by this element.
import './lineup-game-setup';
import './lineup-player-list';

// These are the shared styles needed by this element.
import { SharedStyles } from './shared-styles';

@customElement('lineup-view-game-detail')
export class LineupViewGameDetail extends connect(store)(PageViewElement) {
  private _getDetailContent(game: GameDetail) {
    if (game.status === GameStatus.Done) {
      // Completed game
      return html`Game is done`;
    }

    const isNew = (game.status === GameStatus.New);

    // Game is in progress
    const roster: Roster = game.roster;
    return html`
      <div toolbar>
        <span id="gameTimer">clock here</span>
      </div>
      ${isNew
        ? html`<lineup-game-setup .game="${game}"></lineup-game-setup>`
        : ''
      }
      <div>
        <div id="live-on">
          <h5>Playing</h5>
          <lineup-player-list mode="on" .roster="${roster}"></lineup-player-list>
        </div>
        <div id="live-next">
          <h5>Next On</h5>
          <lineup-player-list mode="next" .roster="${roster}"></lineup-player-list>
        </div>
        <div id="live-off">
          <h5>Subs</h5>
          <lineup-player-list mode="off" .roster="${roster}"></lineup-player-list>
        </div>
        <div id="live-out">
          <h5>Unavailable</h5>
          <lineup-player-list mode="out" .roster="${roster}"></lineup-player-list>
        </div>
      </div>
    `;
  }

  protected render() {
    return html`
      ${SharedStyles}
      <section>
      ${this._game ? html`
        <div main-title>Live: ${this._getName()}</div>
        ${this._getDetailContent(this._game)}
      ` : html`
        <p class="empty-list">
          Game not found.
        </p>
      `}
      </section>
    `;
  }

  @property({ type: Object })
  private _game: GameDetail | undefined;

  protected firstUpdated() {
  }

  stateChanged(state: RootState) {
      if (!state.game) {
          return;
      }
      this._game = state.game!.game;
  }

  private _getName() {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug',
      'Sep', 'Oct', 'Nov', 'Dec'
    ];
    const game = this._game!;
    return game.opponent + ' ' + monthNames[game.date.getMonth()] + ' ' +
      game.date.getDate();
  }
}

// Expose action for use in loading view.
export { getGame };
