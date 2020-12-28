/**
@license
*/

import '@material/mwc-button';
import '@material/mwc-icon';
import { customElement, html, internalProperty, LitElement, property } from 'lit-element';
import { ifDefined } from 'lit-html/directives/if-defined';
import { repeat } from 'lit-html/directives/repeat';
import { navigate } from '../actions/app';
import {
  markCaptainsDone,
  markRosterDone,
  markStartersDone,
  setFormation,
  startGame
} from '../actions/game';
import {
  applyProposedStarter,
  cancelProposedStarter,
  selectStarter,
  selectStarterPosition
} from '../actions/live';
import { connectStore } from '../middleware/connect-mixin';
import { FormationBuilder, Position } from '../models/formation';
import { GameDetail, LivePlayer, SetupStatus, SetupSteps, SetupTask } from '../models/game';
import { getGameStore } from '../slices/game-store';
import { getLiveStore } from '../slices/live-store';
import { RootState, RootStore, SliceStoreConfigurator } from '../store';
import './lineup-on-player-list';
import './lineup-player-list';
import { SharedStyles } from './shared-styles';

function getStepName(step: SetupSteps): string {
  switch (step) {
    case SetupSteps.Formation:
      return 'Set formation';

    case SetupSteps.Roster:
      return 'Set game roster';

    case SetupSteps.Captains:
      return 'Set captains';

    case SetupSteps.Starters:
      return 'Setup the starting lineup';

    default:
      return '<unknown step>';
  }
}

function isAutoStep(step: SetupSteps): boolean {
  switch (step) {
    case SetupSteps.Formation:
      return true;

    default:
      return false;
  }
}

@customElement('lineup-game-setup')
export class LineupGameSetup extends connectStore()(LitElement) {
  protected render() {
    const tasks = this.tasks;
    const players = this.players;

    // TODO: Turn this into a property, rather than creating new each time?
    // Is it causing unnecessary updates?
    let formation = undefined;
    if (this.game && this.game.formation) {
      formation = FormationBuilder.create(this.game.formation.type);
    }

    return html`
      ${SharedStyles}
      <style>
        :host { display: block; }

        a.step:not([href]) {
          color: currentColor;
          cursor: not-allowed;
          text-decoration: none;
        }

        a.step:link, a.step:hover, a.step:visited {
          /* Enabled link styles */
          color: currentColor;
        }

        div.formation {
          display: none;
        }

        div.formation[active] {
          display: block;
        }

        .status mwc-icon[done] {
          color: green;
        }
      </style>
      <div>
      ${this.game ? html`
        ${repeat(tasks, (task: SetupTask) => task.step, (task: SetupTask) => html`
          <div class="task flex-equal-justified step${task.step}">
            <div class="name">
              <a class="step" href="${ifDefined(this.getStepHref(task))}"
                 @click="${(e: Event) => this.performStep(e, task)}">${getStepName(task.step)}</a>
            </div>
            <div class="status">
            ${this.renderTaskStatus(task)}
            </div>
          </div>
        `)}
        <div class="start flex-equal-justified">
          <mwc-button icon="play_arrow"
                      ?disabled="${!this.tasksComplete}"
                      @click="${this.startGame}">Start game</mwc-button>
        </div>
        <div class="formation" ?active="${this.showFormation}">
          <select
            @change="${this.onFormationChange}"
            value="">
            <option value="">Not set</option>
            <option value="4-3-3">4-3-3</option>
          </select>
        </div>
        <div id="live-on">
          <h5>Starters</h5>
          <lineup-on-player-list .formation="${formation}" .players="${players}"
                                 .selectedPosition="${this.selectedStarterPosition}"
                                 @positionselected="${this.positionSelected}"></lineup-on-player-list>
        </div>
        <div id="confirm-starter">
        ${this.renderConfirmStarter()}
        </div>
        <div id="live-off">
          <h5>Subs</h5>
          <lineup-player-list mode="off" .players="${players}"
                              @playerselected="${this.playerSelected}"></lineup-player-list>
        </div>
      ` : html`
        <p class="empty-list">
          Cannot setup - Game not set.
        </p>
      `}
      </div>`
  }

  private renderConfirmStarter() {
    if (!this.proposedStarter) {
      return '';
    }
    const starter = this.proposedStarter;
    const currentPosition = starter.currentPosition!;
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
        <h5>Confirm starter?</h5>
        <span class="proposed-player">${starter.name} #${starter.uniformNumber}</span>
        <span class="proposed-position">${positionText}</span>
        <mwc-button class="cancel" @click="${this.cancelStarter}">Cancel</mwc-button>
        <mwc-button class="ok" autofocus @click="${this.applyStarter}">Apply</mwc-button>
      </div>
    `;
  }

  private renderTaskStatus(task: SetupTask) {
    if (task.status === SetupStatus.InProgress) {
      return html`spinner here`;
    }
    if (task.status === SetupStatus.Complete) {
      return html`<mwc-icon done>done</mwc-icon>`;
    }
    if (task.status === SetupStatus.Pending || isAutoStep(task.step)) {
      return html`<mwc-icon>more_horiz</mwc-icon>`;
    }
    return html`<mwc-button class="finish" icon="check" @click="${(e: Event) => this.finishStep(e, task.step)}">Done</mwc-button>`;
  }

  @property({ type: Object })
  store?: RootStore;

  @property({ type: Object })
  storeConfigurator?: SliceStoreConfigurator = getLiveStore;

  @internalProperty()
  private game: GameDetail | undefined;

  @internalProperty()
  private tasks: SetupTask[] = [];

  @internalProperty()
  private tasksComplete = false;

  @internalProperty()
  private showFormation = false;

  @internalProperty()
  private players: LivePlayer[] = [];

  @internalProperty()
  private selectedStarterPosition: Position | undefined;

  @internalProperty()
  private proposedStarter: LivePlayer | undefined;

  protected firstUpdated() {
    getGameStore(this.store);
  }

  stateChanged(state: RootState) {
    if (!state.game || !state.live) {
      return;
    }
    this.game = state.game!.game;
    if (!this.game) {
      // TODO: Need to reset other properties, if they have values?
      return;
    }
    this.tasks = this.game.liveDetail && this.game.liveDetail.setupTasks || [];

    const anyIncomplete = this.tasks.some(task => task.status !== SetupStatus.Complete);
    this.tasksComplete = !anyIncomplete;

    this.players = state.live.liveGame && state.live.liveGame.players || [];
    this.selectedStarterPosition = state.live.selectedStarterPosition;
    this.proposedStarter = state.live.proposedStarter;
  }

  private getStepHref(task: SetupTask) {
    // Only active steps should have an href.
    if (task.status === SetupStatus.Active) {
      return '#';
    }
    return undefined;
  }

  private performStep(e: Event, task: SetupTask) {
    // Only do the step if it's currently active.
    if (task.status === SetupStatus.Active) {
      switch (task.step) {
        case SetupSteps.Formation:
          this.showFormation = true;
          break;

        case SetupSteps.Roster:
          window.history.pushState({}, '', `/gameroster/${this.game!.id}`);
          this.dispatch(navigate(window.location));
          break;

        default:
          break;
      }
    }
    e.preventDefault();
    return false;
  }

  private finishStep(e: Event, step: SetupSteps) {
    switch (step) {
      case SetupSteps.Captains:
        this.dispatch(markCaptainsDone());
        break;

      case SetupSteps.Roster:
        this.dispatch(markRosterDone());
        break;

      case SetupSteps.Starters:
        this.dispatch(markStartersDone());
        break;

      default:
        break;
    }
    e.preventDefault();
    return false;
  }

  private startGame() {
    this.dispatch(startGame());
  }

  private onFormationChange(e: Event) {
    const select: HTMLSelectElement = e.target as HTMLSelectElement;

    this.dispatch(setFormation(select.value));

    // TODO: Clear select after setting, otherwise will be pre-filled on other games
    this.showFormation = false;
  }

  private playerSelected(e: CustomEvent) {
    this.dispatch(selectStarter(e.detail.player.id, e.detail.selected));
  }

  private positionSelected(e: CustomEvent) {
    this.dispatch(selectStarterPosition(e.detail.position));
  }

  private applyStarter() {
    this.dispatch(applyProposedStarter());
  }

  private cancelStarter() {
    this.dispatch(cancelProposedStarter());
  }

}
