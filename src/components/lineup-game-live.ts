/**
@license
*/

import { LitElement, customElement, html, property } from 'lit-element';

import { FormationBuilder } from '../models/formation';
import { LivePlayer, LiveGame } from '../models/game';

// This element is connected to the Redux store.
import { connectStore } from '../middleware/connect-mixin';
import { RootState, RootStore, SliceStoreConfigurator } from '../store';

// The specific store configurator, which handles initialization/lazy-loading.
import { getLiveStore } from '../slices/live-store';

// These are the actions needed by this element.
import { applyPendingSubs, cancelProposedSub, confirmProposedSub, discardPendingSubs, selectPlayer } from '../actions/live';
import { proposedSubSelector } from '../reducers/live';

// These are the elements needed by this element.
import '@material/mwc-button';
import '@material/mwc-icon';
// import { peopleIcon, scheduleIcon } from './lineup-icons';
import './lineup-on-player-list';
import './lineup-player-list';

// These are the shared styles needed by this element.
import { SharedStyles } from './shared-styles';

@customElement('lineup-game-live')
export class LineupGameLive extends connectStore()(LitElement) {
  protected render() {
    return html`
      ${SharedStyles}
      <style>
        :host { display: block; }
      </style>
      <div>
      ${this._game ? html`
        ${this._renderGame(this._game, this._players!)}
      ` : html`
        <p class="empty-list">
          Live game not set.
        </p>
      `}
      </div>`
  }

  private _renderGame(game: LiveGame, players: LivePlayer[]) {
    // TODO: Turn this into a property, rather than creating new each time?
    // Is it causing unnecessary updates?
    let formation = undefined;
    if (game.formation) {
      formation = FormationBuilder.create(game.formation.type);
    }

    return html`
      <div toolbar>
        <span id="gameTimer">clock here</span>
      </div>
      <div id="live-on">
        <h5>Playing</h5>
        <lineup-on-player-list .formation="${formation}" .players="${players}"
                               @positionselected="${this._playerSelected}"></lineup-on-player-list>
      </div>
      <div id="live-next">
        <h5>Next On</h5>
        <div>
          <mwc-button id="sub-apply-btn" @click="${this._applySubs}">Sub</mwc-button>
          <mwc-button id="sub-discard-btn" @click="${this._discardSubs}">Discard</mwc-button>
        </div>
        <lineup-player-list mode="next" .players="${players}"></lineup-player-list>
      </div>
      <div id="confirm-sub">
      ${this._getConfirmSub()}
      </div>
      <div id="live-off">
        <h5>Subs</h5>
        <lineup-player-list mode="off" .players="${players}"
                            @playerselected="${this._playerSelected}"></lineup-player-list>
      </div>
      <div id="live-out">
        <h5>Unavailable</h5>
        <lineup-player-list mode="out" .players="${players}"></lineup-player-list>
      </div>`
  }

  private _getConfirmSub() {
    if (!this._proposedSub) {
      return '';
    }
    const sub = this._proposedSub;
    const replaced = this._findPlayer(sub.replaces!)!;
    const currentPosition = sub.currentPosition!;
    let positionText = currentPosition.type;

    if (currentPosition.id !== currentPosition.type) {
      let addition = '';
      if (currentPosition.id[0] === 'L') {
        addition = 'Left';
      } else if (currentPosition.id[0] === 'R') {
        addition = 'Right';
      } else if (currentPosition.id.length > currentPosition.type.length) {
        addition = currentPosition.id.substring(currentPosition.type.length);
      }
      positionText += ` (${addition})`;
    }

    return html`
      <div>
        <h5>Confirm sub?</h5>
        <span class="proposed-player">${sub.name} #${sub.uniformNumber}</span>
        <span class="proposed-position">${positionText}</span>
        <span class="replaced">${replaced.name}</span>
        <mwc-button class="cancel" @click="${this._cancelSub}">Cancel</mwc-button>
        <mwc-button class="ok" autofocus @click="${this._confirmSub}">Confirm</mwc-button>
      </div>
    `;
  }

  @property({ type: Object })
  store?: RootStore;

  @property({ type: Object })
  storeConfigurator?: SliceStoreConfigurator = getLiveStore;

  @property({ type: Object })
  private _game: LiveGame | undefined;

  @property({type: Object})
  private _players: LivePlayer[] | undefined;

  @property({type: Object})
  private _proposedSub: LivePlayer | undefined;

  stateChanged(state: RootState) {
    if (!state.live) {
      return;
    }
    this._game = state.live!.liveGame;
    if (!this._game) {
      return;
    }

    this._players = this._game.players || [];
    this._proposedSub = proposedSubSelector(state);
  }

  private _playerSelected(e: CustomEvent) {
    this.dispatch(selectPlayer(e.detail.player.id, e.detail.selected));
  }

  private _confirmSub() {
    this.dispatch(confirmProposedSub());
  }

  private _cancelSub() {
    this.dispatch(cancelProposedSub());
  }

  private _applySubs() {
    // TODO: Pass selectedOnly param, based on if any next cards are selected
    this.dispatch(applyPendingSubs());
  }

  private _discardSubs() {
    // TODO: Pass selectedOnly param, based on if any next cards are selected
    this.dispatch(discardPendingSubs());
  }

  private _findPlayer(playerId: string) {
    return this._players!.find(player => (player.id === playerId));
  }
}
