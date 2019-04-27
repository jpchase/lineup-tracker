/**
@license
Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import { html, property } from 'lit-element';
import { PageViewElement } from './page-view-element.js';

import { Games } from '../models/game.js';


// This element is connected to the Redux store.
import { connect } from 'pwa-helpers/connect-mixin.js';
import { store, RootState } from '../store.js';
// import { GameState } from '../reducers/game.js';
import { TeamState } from '../reducers/team.js';

// We are lazy loading its reducer.
import game from '../reducers/game.js';
store.addReducers({
  game
});

// These are the actions needed by this element.
import { getGames } from '../actions/game.js';

// These are the elements needed by this element.
import './lineup-game-list.js';

// These are the shared styles needed by this element.
import { SharedStyles } from './shared-styles.js';

class LineupViewGames extends connect(store)(PageViewElement) {
  protected render() {
    return html`
      ${SharedStyles}
      <section>
        <lineup-game-list .games="${this._games}"></lineup-game-list>
      </section>
    `;
  }

  @property({ type: String })
  private _teamId = '';

  @property({ type: Object })
  private _games: Games = {};

  // This is called every time something is updated in the store.
  stateChanged(state: RootState) {
    if (!state.team || !state.game) {
      return;
    }
    const teamState: TeamState = state.team!;
    if (this._teamId !== teamState.teamId) {
      this._teamId = teamState.teamId;
      store.dispatch(getGames(this._teamId));
    }
    this._games = state.game!.games;
  }
}

window.customElements.define('lineup-view-games', LineupViewGames);
