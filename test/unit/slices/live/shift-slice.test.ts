import { LivePlayer } from '@app/models/game.js';
import { PlayerStatus } from '@app/models/player.js';
import { PlayerTimeTrackerMap } from '@app/models/shift.js';
import { gameSetupCompleted } from '@app/slices/live/live-slice.js';
import { shift, ShiftState } from '@app/slices/live/shift-slice.js';
import { expect } from '@open-wc/testing';
import * as testlive from '../../helpers/test-live-game-data.js';

export const SHIFT_INITIAL_STATE: ShiftState = {
  players: undefined,
};

export function buildShiftWithTrackers(existingPlayers?: LivePlayer[]): ShiftState {
  let players;
  if (existingPlayers) {
    players = existingPlayers.slice(0);
  } else {
    players = testlive.getLivePlayers(18);
  }
  players.forEach((player, index) => {
    player.status = (index < 11) ? PlayerStatus.On : PlayerStatus.Off;
  });

  return {
    ...SHIFT_INITIAL_STATE,
    players: new PlayerTimeTrackerMap().initialize(players).toJSON()
  };
}

describe('Shift slice', () => {
  describe('live/gameSetupCompleted', () => {
    let currentState: ShiftState = SHIFT_INITIAL_STATE;

    beforeEach(() => {
      currentState = {
        ...SHIFT_INITIAL_STATE,
      };
    });

    it('should initialize trackers from live players', () => {
      const rosterPlayers = testlive.getLivePlayers(18);
      const game = testlive.getLiveGame(rosterPlayers);
      const expectedMap = new PlayerTimeTrackerMap();
      expectedMap.initialize(rosterPlayers);

      expect(currentState.players, 'players should be empty').to.not.be.ok;

      const newState = shift(currentState,
        gameSetupCompleted(game.id, game));

      expect(newState).to.deep.include({
        players: expectedMap.toJSON()
      });
      expect(newState).not.to.equal(currentState);
    });

    it('should do nothing if the game has no players', () => {
      const game = testlive.getLiveGame();
      const newState = shift(currentState, gameSetupCompleted(game.id, game));

      expect(newState).to.equal(currentState);

    });

  }); // describe('live/gameSetupCompleted')

}); // describe('Shift slice')
