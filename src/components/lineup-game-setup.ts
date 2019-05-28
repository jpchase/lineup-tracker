/**
@license
*/

import { LitElement, customElement, html, property } from 'lit-element';
import { repeat } from 'lit-html/directives/repeat';

import { GameDetail } from '../models/game';

// This element is connected to the Redux store.
import { connect } from 'pwa-helpers/connect-mixin.js';
import { store, RootState } from '../store';

// import { peopleIcon, scheduleIcon } from './lineup-icons';

// These are the shared styles needed by this element.
import { SharedStyles } from './shared-styles';

const enum SetupSteps {
  CopyRoster,
  CopyFormation,
  AdjustRoster,
  Captains,
  Starters
}

interface SetupTask {
  step: SetupSteps;
  pending: boolean;
  inProgress: boolean;
  complete: boolean;
}

function getStepName(step: SetupSteps): string {
  switch (step) {
    case SetupSteps.CopyRoster:
      return 'Copy roster from team';

    case SetupSteps.CopyFormation:
      return 'Copy formation from team';

    case SetupSteps.AdjustRoster:
      return 'Copy roster from team';

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
    case SetupSteps.CopyRoster:
    case SetupSteps.CopyFormation:
      return true;

    default:
      return false;
  }
}

function isRosterCopied(game: GameDetail) {
  return (Object.keys(game.roster).length > 0);
}

@customElement('lineup-game-setup')
export class LineupGameSetup extends connect(store)(LitElement) {
  protected render() {
    const tasks = this._getTasks();
    return html`
      ${SharedStyles}
      <style>
        :host { display: block; }
      </style>
      <div>
        ${repeat(tasks, (task: SetupTask) => task.step, (task: SetupTask) => html`
          <div class="task flex-equal-justified">
            <div class="name">${getStepName(task.step)}</div>
            <div class="status">
            ${task.inProgress
              ? html`spinner here`
              : task.complete
                ? html`done icon here`
                : (task.pending || isAutoStep(task.step))
                  ? html`pending icon/text here`
                  : html`widget to mark done`
            }
            </div>
          </div>
        `)}
      </div>`
  }

  @property({ type: Boolean })
  private _copyRosterStarted = false;

  @property({ type: Object })
  private _game: GameDetail | undefined;

  protected firstUpdated() {
  }

  stateChanged(state: RootState) {
    if (!state.game) {
      return;
    }
    this._game = state.game!.game;
    if (!this._game) {
      return;
    }
    if (isRosterCopied(this._game)) {
      return;
    }
    // Fire the request to copy the roster from the team
    this._copyRosterStarted = true;
    // TODO: Actually send the request using redux
  }

  _getTasks(): SetupTask[] {
    if (!this._game) {
      return [];
    }
    const tasks: SetupTask[] = [];

    // Copy roster
    const rosterCopied = isRosterCopied(this._game);
    tasks.push({
      step: SetupSteps.CopyRoster,
      inProgress: this._copyRosterStarted,
      complete: rosterCopied,
      pending: !rosterCopied && !this._copyRosterStarted
    });

    // Copy formation
    tasks.push({
      step: SetupSteps.CopyFormation,
      inProgress: false,
      complete: false,
      pending: !tasks[tasks.length - 1].complete
    });

    // Adjust roster
    tasks.push({
      step: SetupSteps.AdjustRoster,
      inProgress: false,
      complete: false,
      pending: !tasks[tasks.length - 1].complete
    });

    // Captains
    tasks.push({
      step: SetupSteps.Captains,
      inProgress: false,
      complete: false,
      pending: !tasks[tasks.length - 1].complete
    });

    // Starting lineup
    tasks.push({
      step: SetupSteps.Starters,
      inProgress: false,
      complete: false,
      pending: !tasks[tasks.length - 1].complete
    });

    return tasks;
  }

}
