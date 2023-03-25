import { contextProvided } from '@lit-labs/context';
import '@material/mwc-button';
import '@material/mwc-dialog';
import '@material/mwc-icon';
import { html, LitElement, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { repeat } from 'lit/directives/repeat.js';
import { ConnectStoreMixin } from '../middleware/connect-mixin.js';
import { FormationBuilder, FormationMetadata, formatPosition, Position } from '../models/formation.js';
import { GameDetail } from '../models/game.js';
import { LiveGame, LivePlayer, SetupStatus, SetupSteps, SetupTask } from '../models/live.js';
import { getGameStore } from '../slices/game-store.js';
import { gameSetupCompletedCreator, selectGameById } from '../slices/game/game-slice.js';
import { getLiveStore } from '../slices/live-store.js';
import {
  applyStarter, cancelStarter, captainsCompleted, configurePeriods, formationSelected, getLiveGame,
  rosterCompleted,
  selectInvalidStarters, selectLiveGameById,
  selectStarter, selectStarterPosition, startersCompletedCreator
} from '../slices/live/live-slice.js';
import { RootState, RootStore, SliceStoreConfigurator } from '../store.js';
import './lineup-on-player-list.js';
import './lineup-player-list.js';
import { PageRouter, pageRouterContext } from './page-router.js';
import { SharedStyles } from './shared-styles.js';

function getStepName(step: SetupSteps): string {
  switch (step) {
    case SetupSteps.Captains:
      return 'Captains';

    case SetupSteps.Formation:
      return 'Formation';

    case SetupSteps.Periods:
      return 'Periods and duration';

    case SetupSteps.Roster:
      return 'Roster';

    case SetupSteps.Starters:
      return 'Starting lineup';

    default:
      return '<unknown step>';
  }
}

function isAutoStep(step: SetupSteps): boolean {
  switch (step) {
    case SetupSteps.Formation:
    case SetupSteps.Periods:
      return true;

    default:
      return false;
  }
}

@customElement('lineup-game-setup')
export class LineupGameSetup extends ConnectStoreMixin(LitElement) {
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

        #starter-errors {
          color: red;
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
          ${this.renderStarterErrors()}
        </div>
        <div class="formation" ?active="${this.showFormation}">
          <select
            @change="${this.onFormationChange}"
            value="">
            <option value="">Not set</option>
            <option value="4-3-3">4-3-3</option>
            <option value="3-1-4-2">3-1-4-2</option>
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
        ${this.renderConfigurePeriods()}
      ` : html`
        <p class="empty-list">
          Cannot setup - Game not set.
        </p>
      `}
      </div>`
  }

  private renderConfigurePeriods() {
    if (!this.showPeriods) {
      return nothing;
    }

    return html`
      <mwc-dialog id="periods-dialog" ?open="${this.showPeriods}"
                @closed="${this.periodsDialogClosed}">
        <div>
          <div class="dialog-header">
            <span>Configure periods</span>
          </div>
          <mwc-formfield id="num-periods" alignend label="Number of Periods">
            <input type="number" required min="1" max="4" value="${ifDefined(this.liveGame?.clock?.totalPeriods)}">
          </mwc-formfield>
          <mwc-formfield id="period-length" alignend label="Period Length">
              <input type="number" required min="10" max="60" value="${ifDefined(this.liveGame?.clock?.periodLength)}">
          </mwc-formfield>
        </div>
        <mwc-button slot="primaryAction" dialogAction="save">Save</mwc-button>
        <mwc-button slot="secondaryAction" dialogAction="close">Cancel</mwc-button>
      </mwc-dialog>
    `;
  }

  private renderConfirmStarter() {
    if (!this.proposedStarter) {
      return nothing;
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

  private renderStarterErrors() {
    if (!this.invalidStarters?.length) {
      return nothing;
    }
    let errorText = this.invalidStarters.join(', ');
    return html`
      <span id="starter-errors">
        <mwc-icon>report</mwc-icon>
        <span class="error">Invalid starters: ${errorText}</span>
      </span>
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

  @contextProvided({ context: pageRouterContext, subscribe: true })
  @property({ attribute: false })
  pageRouter!: PageRouter;

  @property({ type: String })
  gameId?: string;

  @state()
  private game?: GameDetail;

  @state()
  private liveGame?: LiveGame;

  @state()
  private tasks: SetupTask[] = [];

  @state()
  private tasksComplete = false;

  @state()
  private showFormation = false;

  @state()
  private showPeriods = false;

  @state()
  private formation: FormationMetadata | undefined;

  @state()
  private players: LivePlayer[] = [];

  @state()
  private selectedStarterPosition: Position | undefined;

  @state()
  private proposedStarter: LivePlayer | undefined;

  @state()
  private invalidStarters?: string[];

  override firstUpdated() {
    getGameStore(this.store);
  }

  override stateChanged(state: RootState) {
    if (!state.game || !state.live || !this.gameId) {
      return;
    }
    this.game = selectGameById(state, this.gameId);
    if (!this.game) {
      // TODO: Need to reset other properties, if they have values?
      return;
    }
    const liveGame = selectLiveGameById(state, this.game.id);
    if (!liveGame) {
      this.dispatch(getLiveGame(this.game));
      return;
    }
    this.liveGame = liveGame;
    this.tasks = liveGame.setupTasks || [];

    const anyIncomplete = this.tasks.some(task => task.status !== SetupStatus.Complete);
    this.tasksComplete = !anyIncomplete;

    this.formation = liveGame.formation;
    this.players = liveGame.players || [];
    this.selectedStarterPosition = state.live.selectedStarterPosition;
    this.proposedStarter = state.live.proposedStarter;
    this.invalidStarters = selectInvalidStarters(state);
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

        case SetupSteps.Periods:
          this.showPeriods = true;
          break;

        case SetupSteps.Roster:
          // TODO: Pass page and params separately
          this.pageRouter.gotoPage(`/gameroster/${this.game!.id}`);
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
        this.dispatch(captainsCompleted(this.game!.id));
        break;

      case SetupSteps.Roster:
        this.dispatch(rosterCompleted(this.game!.id));
        break;

      case SetupSteps.Starters:
        this.dispatch(startersCompletedCreator(this.game!.id));
        break;

      default:
        break;
    }
    e.preventDefault();
    return false;
  }

  private completeGameSetup() {
    this.dispatch(gameSetupCompletedCreator(this.game!.id));
  }

  private onFormationChange(e: Event) {
    const select: HTMLSelectElement = e.target as HTMLSelectElement;

    this.dispatch(formationSelected(this.game!.id, select.value as any));

    // TODO: Clear select after setting, otherwise will be pre-filled on other games
    this.showFormation = false;
  }

  private playerSelected(e: CustomEvent) {
    this.dispatch(selectStarter(this.game!.id, e.detail.player.id, e.detail.selected));
  }

  private positionSelected(e: CustomEvent) {
    this.dispatch(selectStarterPosition(this.game!.id, e.detail.position));
  }

  private applyStarter() {
    this.dispatch(applyStarter(this.game!.id));
  }

  private cancelStarter() {
    this.dispatch(cancelStarter(this.game!.id));
  }

  private periodsDialogClosed(e: CustomEvent) {
    console.log(`periodsDialogClosed: [${e.type}] = ${JSON.stringify(e.detail)}`)
    switch (e.detail.action) {
      case 'save': {
        this.savePeriods();
        break;
      }
    }
    this.showPeriods = false;
  }

  private getFormInput(fieldId: string): HTMLInputElement {
    return this.shadowRoot!.querySelector(`#${fieldId} > input`) as HTMLInputElement;
  }

  private savePeriods() {
    const numPeriodsField = this.getFormInput('num-periods');
    const periodLengthField = this.getFormInput('period-length');
    const totalPeriods = numPeriodsField.valueAsNumber;
    const periodLength = periodLengthField.valueAsNumber;
    console.log(`save: ${totalPeriods}, ${periodLength}`);

    this.dispatch(configurePeriods(this.gameId!, totalPeriods, periodLength));
    console.log(`save: action now dispatched`)

    this.showPeriods = false;
  }

}
