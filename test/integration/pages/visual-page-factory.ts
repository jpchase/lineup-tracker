/** @format */

import * as fs from 'fs';
import * as path from 'path';
import { integrationTestData } from '../data/integration-data-constants.js';
import { BreakpointConfig, config } from '../server/test-server.js';
import { ErrorPage } from './error-page.js';
import { GameDetailPage } from './game-detail-page.js';
import { GameListPage } from './game-list-page.js';
import { GameLivePage } from './game-live-page.js';
import { GameRosterPage } from './game-roster-page.js';
import { HomePage, HomePageOptions } from './home-page.js';
import { OpenOptions, PageObject, PageOptions } from './page-object.js';
import { TeamCreatePage } from './team-create-page.js';
import { TeamRosterPage } from './team-roster-page.js';
import { TeamSelectPage } from './team-select-page.js';

export interface VisualPageBuilder {
  create: (options: PageOptions) => Promise<PageObject>;
  options: PageOptions;
}

export interface VisualPageConfig {
  name: string;
  page: PageObject | VisualPageBuilder;
  openOptions?: OpenOptions;
}

export function* getAllVisualPages(
  breakpoint: BreakpointConfig,
): Generator<VisualPageConfig, void> {
  const pageOptions: PageOptions = { viewPort: breakpoint.viewPort };

  // Index (i.e. no route provided)
  const indexOptions: HomePageOptions = {
    ...pageOptions,
    scenarioName: 'index',
    emptyRoute: true,
  };
  yield { name: '/index.html', page: new HomePage(indexOptions) };

  // Home page: /viewHome
  yield { name: '/viewHome', page: new HomePage(pageOptions) };

  // Home page, navigation drawer expanded (only on narrow viewports)
  if (breakpoint.name === 'narrow') {
    const homeOptions: HomePageOptions = { ...pageOptions, openDrawer: true };
    yield { name: 'navigation drawer', page: new HomePage(homeOptions) };
  }

  // Game pages
  // Games list page: /viewGames
  yield { name: '/viewGames', page: new GameListPage(pageOptions), openOptions: { signIn: true } };
  yield {
    name: '/viewGames (signed out)',
    page: new GameListPage({ ...pageOptions, scenarioName: 'viewGames-signedout' }),
    openOptions: { signIn: false, skipWaitForReady: true },
  };

  // Game detail page: /game
  const gameOptions: PageOptions = {
    ...pageOptions,
    gameId: integrationTestData.TEAM1.NEW_GAME_ID,
    team: { teamId: integrationTestData.TEAM1.ID },
  };
  yield { name: '/game', page: new GameDetailPage(gameOptions), openOptions: { signIn: true } };
  yield {
    name: '/game (signed out)',
    page: new GameDetailPage({ ...gameOptions, scenarioName: 'viewGameDetail-signedout' }),
    openOptions: { signIn: false, skipWaitForReady: true },
  };

  // Game roster page: /gameroster
  yield {
    name: '/gameroster',
    page: new GameRosterPage(gameOptions),
    openOptions: { signIn: true },
  };
  yield {
    name: '/gameroster (signed out)',
    page: new GameRosterPage({ ...gameOptions, scenarioName: 'viewGameRoster-signedout' }),
    openOptions: { signIn: false, skipWaitForReady: true },
  };

  // Live game pages
  const liveOptions: PageOptions = {
    // TODO: Setting viewport directly to have new instance, change to just setting options
    //       when height change applied to all pages
    //  ...pageOptions,
    viewPort: { ...pageOptions.viewPort! },
    gameId: integrationTestData.TEAM2.games.NEW_WITH_ROSTER.ID,
    userId: integrationTestData.TEAM2.OWNER_ID,
    team: { teamId: integrationTestData.TEAM2.ID },
  };
  // TODO: Apply the height change to all pages
  liveOptions.viewPort!.height = 800;
  const livePageBuilder = async (options: PageOptions) => {
    const { livePage } = await GameLivePage.createLivePage(options);
    return livePage;
  };
  yield {
    name: 'live game start',
    page: {
      create: livePageBuilder,
      options: { ...liveOptions, scenarioName: 'liveGameStart' },
    },
    openOptions: { signIn: true },
  };

  // Team pages
  // Team roster page: /viewRoster
  yield {
    name: '/viewRoster',
    page: new TeamRosterPage(pageOptions),
    openOptions: { signIn: true },
  };
  yield {
    name: '/viewRoster (signed out)',
    page: new TeamRosterPage({ ...pageOptions, scenarioName: 'viewRoster-signedout' }),
    openOptions: { signIn: false, skipWaitForReady: true },
  };

  // Add new team: triggered by UI interaction (not a route)
  yield {
    name: 'add new team',
    page: new TeamCreatePage(pageOptions),
    openOptions: { signIn: true },
  };

  // Select team: triggered by UI interaction (not a route)
  yield {
    name: 'select team',
    page: new TeamSelectPage(pageOptions),
    openOptions: { signIn: true },
  };

  // Error pages
  // 404 page: for unrecognized routes/paths
  const errorOptions = { ...pageOptions, route: 'batmanNotAView' };
  yield { name: '404', page: new ErrorPage(errorOptions) };
}

export function createScreenshotDirectories(directoryType: 'baseline' | 'current') {
  let baseDir: string;
  switch (directoryType) {
    case 'baseline':
      baseDir = config.baselineDir;
      break;

    case 'current':
      baseDir = config.currentDir;
      break;

    default:
      throw new RangeError(`Invalid screenshot directory type: ${directoryType}`);
  }

  // Create the screenshot directories, if needed.
  for (const breakpoint of config.breakpoints) {
    const dir = path.join(baseDir, breakpoint.name);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}
