/**
@license
Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
*/

import '@material/mwc-drawer';
import '@material/mwc-icon-button';
import '@material/mwc-top-app-bar';
import { setPassiveTouchGestures } from '@polymer/polymer/lib/utils/settings.js';
import { customElement, html, internalProperty, LitElement, property, PropertyValues } from 'lit-element';
import { connect } from 'pwa-helpers/connect-mixin.js';
import { installMediaQueryWatcher } from 'pwa-helpers/media-query.js';
import { updateMetadata } from 'pwa-helpers/metadata.js';
import { installOfflineWatcher } from 'pwa-helpers/network.js';
import { installRouter } from 'pwa-helpers/router.js';
import { navigate, updateDrawerState, updateOffline } from '../actions/app';
import { getUser, signIn } from '../actions/auth';
import { changeTeam, getTeams } from '../actions/team';
import { User } from '../models/auth';
import { Teams } from '../models/team';
import auth from '../reducers/auth';
import team from '../reducers/team';
import { RootState, store } from '../store';
import { accountIcon } from './lineup-icons';
import './lineup-team-selector';
import './snack-bar';

// Lazy load the reducers.
store.addReducers({
  auth,
  team
});

interface Page {
  page: string;
  label: string;
}

interface Pages {
  [index: string]: Page;
}

// This element is connected to the Redux store.
@customElement('lineup-app')
export class LineupApp extends connect(store)(LitElement) {
  protected render() {
    return html`
    <style>
      :host {
        --app-drawer-width: 256px;
        display: block;

        /* Default theme */
        /*
        --primary-text-color: red;
        --app-dark-text-color: orange;

        --secondary-text-color: cyan;
        */
        --app-primary-color: #607D8B;
        --app-secondary-color: #FFC107;
        --app-header-text-color: black;
        --app-header-background-color: white;

        /*
        --app-dark-text-color: var(--app-secondary-color);
        --app-background-color: #fafafa;
        color: var(--app-dark-text-color);
        --app-drawer-background-color: var(--app-background-color);
        --app-drawer-text-color: var(--app-dark-text-color);
        --app-drawer-selected-color: var(--app-dark-text-color);

        --app-primary-color: #C3134E;
        --app-dark-text-color: #293237;
        */
        --mdc-theme-on-primary: white;
        --mdc-theme-primary: var(--app-primary-color);
        --mdc-theme-on-secondary: black;
        --mdc-theme-secondary: var(--app-secondary-color);
      }

      [hidden] {
        display: none !important;
      }

      mwc-top-app-bar {
        --mdc-theme-primary: var(--app-header-background-color);
        --mdc-theme-on-primary: var(--app-header-text-color);
        border-bottom: 1px solid #eee /*var(--app-primary-color)*/;
      }

      .toolbar-top {
        background-color: var(--app-header-background-color);
      }

      .team-selector {
        display: inline-block;
      }

      .toolbar-list,
      .toolbar-top-right {
        display: none;
      }

      .toolbar-list > a {
        display: inline-block;
        color: var(--app-header-text-color);
        text-decoration: none;
        line-height: 30px;
        padding: 4px 24px;
      }

      .toolbar-list > a[selected] {
        color: var(--app-header-selected-color);
        border-bottom: 4px solid var(--app-header-selected-color);
      }

      .toolbar-top-left {
        width: 44px;
      }

      .menu-btn {
        background: none;
        border: none;
        fill: var(--app-header-text-color);
        cursor: pointer;
        height: 44px;
        width: 44px;
      }

      .signin-btn {
        display: inline-block;
        width: 40px;
        height: 40px;
        padding: 8px;
        box-sizing: border-box;
        background: none;
        border: none;
        fill: var(--app-header-text-color);
        cursor: pointer;
        text-decoration: none;
      }

      .signin-btn {
        margin-left: 8px;
        padding: 2px;
        visibility: hidden;
      }

      .signin-btn[visible] {
        visibility: visible;
      }

      .signin-btn > img {
        width: 36px;
        height: 36px;
        border-radius: 50%;
      }

      .drawer-list {
        box-sizing: border-box;
        width: 100%;
        height: 100%;
        padding: 24px;
        background: var(--app-drawer-background-color);
        position: relative;
      }

      .drawer-list > a {
        display: block;
        text-decoration: none;
        color: var(--app-drawer-text-color);
        line-height: 40px;
        padding: 0 24px;
      }

      .drawer-list > a[selected] {
        color: var(--app-drawer-selected-color);
      }

      .main-content {
        /* padding-top: 64px; */
        min-height: 100vh;
      }

      .page {
        display: none;
      }

      .page[active] {
        display: block;
      }

      footer {
        padding: 24px;
        background: var(--app-drawer-background-color);
        color: var(--app-drawer-text-color);
        text-align: center;
      }

      /* Wide layout: when the viewport width is bigger than 460px, layout
      changes to a wide layout. */
      @media (min-width: 460px) {
        .toolbar-list {
          display: block;
          text-align: center;
        }

        mwc-icon-button[slot="navigationIcon"] {
          display: none;
        }

        .toolbar-top-right {
          display: flex;
          justify-content: flex-end;
        }

        .menu-btn {
          display: none;
        }

        /* .main-content {
          padding-top: 107px;
        } */
      }
    </style>

    <mwc-drawer hasHeader type="modal" .open="${this.drawerOpen}"
                @MDCDrawer:closed="${this.drawerClosedHandler}">
      <nav class="drawer-list">
        <a ?selected="${this._page === 'viewHome'}" href="/viewHome">Overview</a>
        <a ?selected="${this._page === 'viewGames'}" href="/viewGames">Games</a>
        <a ?selected="${this._page === 'viewRoster'}" href="/viewRoster">Roster</a>
      </nav>
      <div slot="appContent">
        <mwc-top-app-bar @MDCTopAppBar:nav="${this.navButtonClicked}">
          <mwc-icon-button slot="navigationIcon" icon="menu"></mwc-icon-button>
          <div slot="title">${this.appTitle}</div>
          <div slot="actionItems" class="toolbar-top-right" ?hidden="${this._page === 'view404'}">
            <lineup-team-selector .teamId=${this._teamId} .teams=${this._teams}
                                  @select-team="${this.selectTeam}">
            </lineup-team-selector>
            <button class="signin-btn" aria-label="Sign In" ?visible="${this._authInitialized}"
                @click="${this._signinButtonClicked}">
              ${this._user && this._user.imageUrl ? html`<img src="${this._user.imageUrl}">` : accountIcon}
            </button>
          </div>
          <!-- This gets hidden on a small screen-->
          <nav class="toolbar-list">
            <a ?selected="${this._page === 'viewHome'}" href="/viewHome">Overview</a>
            <a ?selected="${this._page === 'viewGames'}" href="/viewGames">Games</a>
            <a ?selected="${this._page === 'viewRoster'}" href="/viewRoster">Roster</a>
          </nav>
        </mwc-top-app-bar>
        <!-- Main content -->
        <main role="main" class="main-content">
          <lineup-view-home class="page" ?active="${this._page === 'viewHome'}"></lineup-view-home>
          <lineup-view-games class="page" ?active="${this._page === 'viewGames'}"></lineup-view-games>
          <lineup-view-game-detail class="page" ?active="${this._page === 'game'}"></lineup-view-game-detail>
          <lineup-view-game-roster class="page" ?active="${this._page === 'gameroster'}"></lineup-view-game-roster>
          <lineup-view-roster class="page" ?active="${this._page === 'viewRoster'}"></lineup-view-roster>
          <lineup-view-team-create class="page" ?active="${this._page === 'addNewTeam'}"></lineup-view-team-create>
          <lineup-view404 class="page" ?active="${this._page === 'view404'}"></lineup-view404>
        </main>

        <footer>
          <p>Some footer goes here?</p>
        </footer>
      </div>
    </mwc-drawer>

    <lineup-team-selector-dialog .teamId=${this._teamId} .teams=${this._teams}
                                @team-changed="${this.teamChanged}"
                                @add-new-team="${this.addNewTeam}">
    </lineup-team-selector-dialog>

    <snack-bar ?active="${this._snackbarOpened}">
        You are now ${this._offline ? 'offline' : 'online'}.</snack-bar>
    `;
  }

  @property({ type: String })
  appTitle = '';

  @property({ type: String })
  private _page = '';

  @internalProperty()
  private drawerOpen = false;

  @property({ type: Boolean })
  private _snackbarOpened = false;

  @property({ type: Boolean })
  private _offline = false;

  @property({ type: Object })
  private _pages: Pages = {
    'viewHome': { page: 'viewHome', label: 'Overview' },
    'viewGames': { page: 'viewGames', label: 'Games' },
    'game': { page: 'game', label: 'Game Detail' },
    'gameroster': { page: 'gameroster', label: 'Game Roster' },
    'viewRoster': { page: 'viewRoster', label: 'Roster' },
    'addNewTeam': { page: 'addNewTeam', label: 'New Team' },
    'view404': { page: 'view404', label: 'Page not found' },
  };

  @property({ type: Boolean })
  private _authInitialized = true;

  @property({ type: Object })
  private _user?: User;

  @property({ type: String })
  private _teamId = '';

  @property({ type: Object })
  private _teams: Teams = {};

  constructor() {
    super();
    // To force all event listeners for gestures to be passive.
    // See https://www.polymer-project.org/3.0/docs/devguide/settings#setting-passive-touch-gestures
    setPassiveTouchGestures(true);
  }

  protected firstUpdated() {
    const urlParams = new URLSearchParams(location.search);

    installOfflineWatcher((offline) => store.dispatch(updateOffline(offline)));
    installMediaQueryWatcher(`(min-width: 460px)`,
      () => store.dispatch(updateDrawerState(false)));

    // Get the authenticated user (if signed in), and then load the teams for
    // that user.
    store.dispatch(getUser()).then(() => {
      // TODO: Make getTeams return a promise as well? Then can use finally() instead of dupe call in catch?
      store.dispatch(getTeams(urlParams.get('team')));
      installRouter((location) => store.dispatch(navigate(location)));
    }).catch(() => {
      // Wait for the loading actions to complete, before any navigation.
      installRouter((location) => store.dispatch(navigate(location)));
    });
  }

  protected updated(changedProps: PropertyValues) {
    if (changedProps.has('_page')) {
      const pageTitle = this.appTitle + ' - ' + this._pages[this._page].label;
      updateMetadata({
        title: pageTitle,
        description: pageTitle
        // This object also takes an image property, that points to an img src.
      });
    }
  }

  private navButtonClicked() {
    store.dispatch(updateDrawerState(true));
  }

  private drawerClosedHandler() {
    store.dispatch(updateDrawerState(false));
  }

  private _signinButtonClicked() {
    if (!(this._user && this._user.imageUrl)) {
      store.dispatch(signIn());
    }
    // store.dispatch(this._user && this._user.imageUrl ? signOut() : signIn());
  }

  private selectTeam() {
    // TODO: Dynamically create the dialog when it actually needs to be opened.
    const dialog = this.shadowRoot!.querySelector('lineup-team-selector-dialog')!;
    dialog.show();
  }

  private teamChanged(e: CustomEvent) {
    store.dispatch(changeTeam(e.detail.teamId));
  }

  private addNewTeam() {
    window.history.pushState({}, '', `/addNewTeam`);
    store.dispatch(navigate(window.location));
  }

  stateChanged(state: RootState) {
    this._page = state.app!.page;
    this._offline = state.app!.offline;
    this._snackbarOpened = state.app!.snackbarOpened;
    this.drawerOpen = state.app!.drawerOpened;

    this._user = state.auth!.user;

    this._teamId = state.team!.teamId;
    this._teams = state.team!.teams;
  }
}
