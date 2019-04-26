import { RootAction } from '../../src/store.js';
import { Game, Games } from '@app/models/game';
import { Team } from '../../src/models/team.js';

export function getFakeAction(): RootAction {
    // This must be a real action type, due to type checking. Using the offline
    // action as it will be unknown to all the lineup-specific actions/reducers.
    return { type: 'UPDATE_OFFLINE', offline: true };
}

export interface MockAuthStateOptions {
  signedIn?: boolean;
  userId?: string;
}

export function getMockAuthState(options?: MockAuthStateOptions) {
    let mockAuth: any = { user: undefined };
    if (options && options.signedIn) {
      mockAuth.user = {
        id: options.userId,
        name: 'Some user'
      };
    }
  return mockAuth;
}

export const TEST_USER_ID = 'U1234';

export function getPublicTeamData() {
  return { name: 'Public team 1' }
};

export function getPublicTeam(): Team {
  return { id: 'pt1', ...getPublicTeamData() }
};

export function getStoredTeamData() {
  return { name: 'Stored team 1' }
};

export function getStoredTeam(): Team {
  return { id: 'st1', ...getStoredTeamData() }
};

export function buildGames(games: Game[]): Games {
  return games.reduce((obj, game) => {
    obj[game.id] = game;
    return obj;
  }, {} as Games);
}
