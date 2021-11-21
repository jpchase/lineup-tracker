/**
@license
Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import { html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { PageViewElement } from './page-view-element';

import { Games } from '../models/game';

// This element is connected to the Redux store.
import { connect } from 'pwa-helpers/connect-mixin.js';
import { store, RootState } from '../store';
// import { GameState } from '../reducers/game';
import { TeamState } from '../slices/team/team-slice.js';

// We are lazy loading its reducer.
import { games } from '../slices/game/game-slice.js';
store.addReducers({
  games
});

// These are the actions needed by this element.
import { addNewGame, getGames } from '../actions/games';

// These are the elements needed by this element.
import '@material/mwc-fab';
import './lineup-game-create';
import './lineup-game-list';

// These are the shared styles needed by this element.
import { SharedStyles } from './shared-styles';

@customElement('lineup-view-games')
export class LineupViewGames extends connect(store)(PageViewElement) {
  protected render() {
    return html`
      ${SharedStyles}
      <style>
        mwc-fab {
          position: fixed;
          left: 50%;
          transform: translateX(-50%);
          bottom: 30px;
        }

        lineup-game-create {
          display: none;
        }

        lineup-game-create[active] {
          display: block;
        }
      </style>
      <section>
        <lineup-game-list .games="${this._games}"></lineup-game-list>
        <mwc-fab icon="add" label="Add Game" @click="${this._addButtonClicked}"></mwc-fab>
        <lineup-game-create ?active="${this._showCreate}"
            @newgamecreated="${this._newGameCreated}"
            @newgamecancelled="${this._newGameCancelled}"></lineup-game-create>
      </section>
    `;
  }

  @property({ type: String })
  private _teamId = '';

  @property({ type: Boolean })
  private _showCreate = false;

  @property({ type: Object })
  private _games: Games = {};

  private _addButtonClicked() {
    this._showCreate = true;
  }

  private _newGameCreated(e: CustomEvent) {
    console.log(`New game: ${JSON.stringify(e.detail.game)}`);
    store.dispatch(addNewGame(e.detail.game));
    this._showCreate = false;
  }

  private _newGameCancelled() {
    this._showCreate = false;
  }

  // This is called every time something is updated in the store.
  stateChanged(state: RootState) {
    if (!state.team || !state.games) {
      return;
    }
    const teamState: TeamState = state.team!;
    if (this._teamId !== teamState.teamId) {
      this._teamId = teamState.teamId;
      store.dispatch(getGames(this._teamId));
    }
    this._games = state.games!.games;
  }
}
