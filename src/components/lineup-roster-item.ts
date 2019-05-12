/**
@license
*/

import { LitElement, customElement, html, property } from 'lit-element';

import { Player } from '../models/team';

// These are the elements needed by this element.
import '@polymer/paper-item/paper-icon-item.js';
import '@polymer/paper-item/paper-item-body.js';

// These are the shared styles needed by this element.
import { SharedStyles } from './shared-styles';

// This element is *not* connected to the Redux store.
@customElement('lineup-roster-item')
export class LineupRosterItem extends LitElement {
  protected render() {
    if (!this.player) {
      return;
    }
    const player = this.player!;
    const positions = player.positions || [];
    return html`
      ${SharedStyles}
      <style>
        .avatar {
          display: inline-block;
          box-sizing: border-box;
          width: 35px;
          height: 35px;
          border-radius: 50%;
          background: var(--paper-amber-500);
          text-align: center;
          vertical-align: middle;
          line-height: 35px;
          margin-right: 1em;
        }
      </style>
      <paper-icon-item>
        <span class="avatar" slot="item-icon">&#35${player.uniformNumber}</span>
        <paper-item-body two-line>
          <div class="flex-equal-justified">
            <div>${player.name}</div>
            <div>
              ${this.isGame
                  ? html`actions here`
                  : html`NN games`
              }
            </div>
          </div>
          <div secondary>${positions.join(', ')}</div>
        </paper-item-body>
      </paper-icon-item>
    `;
  }

  @property({type: Boolean})
  isGame = false;

  @property({type: Object})
  player: Player|undefined = undefined;
}
