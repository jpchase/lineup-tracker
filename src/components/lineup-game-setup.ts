/**
@license
*/

import '@material/mwc-button';
import '@material/mwc-icon';
import { html, LitElement } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { repeat } from 'lit/directives/repeat.js';
import { navigate } from '../actions/app';
import { connectStore } from '../middleware/connect-mixin';
import { FormationBuilder, FormationMetadata, formatPosition, Position } from '../models/formation';
import { GameDetail, LivePlayer, SetupStatus, SetupSteps, SetupTask } from '../models/game';
import { getGameStore } from '../slices/game-store';
import { gameSetupCompletedCreator } from '../slices/game/game-slice.js';
import { getLiveStore } from '../slices/live-store';
import {
  applyStarter, cancelStarter, captainsCompleted, formationSelected, getLiveGame,
  rosterCompleted,
  selectLiveGameById,
  selectStarter, selectStarterPosition, startersCompleted
} from '../slices/live/live-slice.js';
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
  override render() {
    const tasks = this.tasks;
    const players = this.players;

    // TODO: Turn this into a property, rather than creating new each time?
    // Is it causing unnecessary updates?
    let formation = undefined;
    if (this.formation) {
      formation = FormationBuilder.create(this.formation.type);
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
        <div class="flex-equal-justified">
          <mwc-button id="complete-button"
                      icon="done_all"
                      ?disabled="${!this.tasksComplete}"
                      @click="${this.completeGameSetup}">Complete Setup</mwc-button>
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
          <h3 class="h5">Starters</h3>
          <lineup-on-player-list .formation="${formation}" .players="${players}"
                                 .selectedPosition="${this.selectedStarterPosition}"
                                 @positionselected="${this.positionSelected}"></lineup-on-player-list>
        </div>
        <div id="confirm-starter">
        ${this.renderConfirmStarter()}
        </div>
        <div id="live-off">
          <h3 class="h5">Subs</h3>
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
    let positionText = formatPosition(starter.currentPosition!);

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
  override store?: RootStore;

  @property({ type: Object })
  storeConfigurator?: SliceStoreConfigurator = getLiveStore;

  @state()
  private game: GameDetail | undefined;

  @state()
  private tasks: SetupTask[] = [];

  @state()
  private tasksComplete = false;

  @state()
  private showFormation = false;

  @state()
  private formation: FormationMetadata | undefined;

  @state()
  private players: LivePlayer[] = [];

  @state()
  private selectedStarterPosition: Position | undefined;

  @state()
  private proposedStarter: LivePlayer | undefined;

  override firstUpdated() {
    getGameStore(this.store);
  }

  override stateChanged(state: RootState) {
    if (!state.game || !state.live) {
      return;
    }
    this.game = state.game.game;
    if (!this.game) {
      // TODO: Need to reset other properties, if they have values?
      return;
    }
    const liveGame = selectLiveGameById(state, this.game.id);
    if (!liveGame) {
      this.dispatch(getLiveGame(this.game));
      return;
    }
    this.tasks = state.live.liveGame?.setupTasks || [];

    const anyIncomplete = this.tasks.some(task => task.status !== SetupStatus.Complete);
    this.tasksComplete = !anyIncomplete;

    this.formation = state.live.liveGame?.formation;
    this.players = state.live.liveGame?.players || [];
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
        this.dispatch(captainsCompleted());
        break;

      case SetupSteps.Roster:
        this.dispatch(rosterCompleted());
        break;

      case SetupSteps.Starters:
        this.dispatch(startersCompleted());
        break;

      default:
        break;
    }
    e.preventDefault();
    return false;
  }

  private completeGameSetup() {
    this.dispatch(gameSetupCompletedCreator(this.game?.id));
  }

  private onFormationChange(e: Event) {
    const select: HTMLSelectElement = e.target as HTMLSelectElement;

    this.dispatch(formationSelected(select.value as any));

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
    this.dispatch(applyStarter());
  }

  private cancelStarter() {
    this.dispatch(cancelStarter());
  }

}
