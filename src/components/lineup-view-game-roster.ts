/**
@license
*/

import { customElement, html, property } from 'lit-element';
import { PageViewElement } from './page-view-element';
import { updateMetadata } from 'pwa-helpers/metadata.js';

import { GameDetail } from '../models/game';
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
import { getGame, addNewGamePlayer } from '../actions/game';

// These are the elements needed by this element.
import './lineup-roster';

import { EVENT_NEWPLAYERCREATED } from './events';

// These are the shared styles needed by this element.
import { SharedStyles } from './shared-styles';

// Expose action for use in loading view.
export { getGame };

@customElement('lineup-view-game-roster')
export class LineupViewGameRoster extends connect(store)(PageViewElement) {
  // TODO: Extract common logic (duplicated from LineupViewGameDetail)
  protected render() {
    if (this._game) {
      updateMetadata({
        title: `Game Roster - ${this._getName()}`,
        description: `Game roster for: ${this._getName()}`
      });
    }

    return html`
      ${SharedStyles}
      <section>
      ${this._game ? html`
        <h2>Roster: ${this._getName()}</h2>
        <lineup-roster .roster="${this._roster}"></lineup-roster>
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

  @property({ type: Object })
  private _roster: Roster = {};

  protected firstUpdated() {
    window.addEventListener(EVENT_NEWPLAYERCREATED, this._newPlayerCreated.bind(this) as EventListener);
  }

  stateChanged(state: RootState) {
    if (!state.game) {
        return;
    }
    const gameState = state.game!;
    this._game = gameState.game;
    this._roster = gameState.game && gameState.game.roster || {};
  }

  private _newPlayerCreated(e: CustomEvent) {
    store.dispatch(addNewGamePlayer(e.detail.player));
  }

  // TODO: Extract common function (duplicated from LineupViewGameDetail)
  private _getName() {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug',
      'Sep', 'Oct', 'Nov', 'Dec'
    ];
    const game = this._game!;
    return game.opponent + ' ' + monthNames[game.date.getMonth()] + ' ' +
      game.date.getDate();
  }

}
