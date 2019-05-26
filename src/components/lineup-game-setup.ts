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
  inProgress: boolean;
  complete: boolean;
}

function getStepName(step: SetupSteps) {
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
          <div class="task">
            <div class="name">${getStepName(task.step)}</div>
            <div class="icon">
            ${task.inProgress
              ? html`spinner here`
              : task.complete
                ? html`done icon here` : ''
            }
            </div>
          </div>
        `)}
      </div>`
  }

  @property({ type: Object })
  game: GameDetail | undefined;

  protected firstUpdated() {
  }

  stateChanged(state: RootState) {
    if (!state.game) {
      return;
    }
    // this._game = state.game!.game;
  }

  _getTasks(): SetupTask[] {
    if (!this.game) {
      return [];
    }
    const tasks: SetupTask[] = [];

    // Copy roster
    const rosterCopied = (Object.keys(this.game.roster).length > 0);
    tasks.push({
      step: SetupSteps.CopyRoster,
      inProgress: false,
      complete: rosterCopied
    });

    // Copy formation
    tasks.push({
      step: SetupSteps.CopyFormation,
      inProgress: false,
      complete: false
    });

    // Adjust roster
    tasks.push({
      step: SetupSteps.AdjustRoster,
      inProgress: false,
      complete: false
    });

    // Captains
    tasks.push({
      step: SetupSteps.Captains,
      inProgress: false,
      complete: false
    });

    // Starting lineup
    tasks.push({
      step: SetupSteps.Starters,
      inProgress: false,
      complete: false
    });

    return tasks;
  }

}
