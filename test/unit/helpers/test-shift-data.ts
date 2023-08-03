/** @format */

import { LiveGame, LivePlayer } from '@app/models/live.js';
import { PlayerStatus } from '@app/models/player.js';
import {
  PlayerTimeTracker,
  PlayerTimeTrackerData,
  PlayerTimeTrackerMap,
} from '@app/models/shift.js';
import { Assertion } from '@esm-bundle/chai';
import { addDurationAssertion } from './test-clock-data.js';
import * as testlive from './test-live-game-data.js';

export function buildPlayerTrackers(players?: LivePlayer[]): PlayerTimeTrackerData[] {
  if (!players) {
    return [];
  }
  return players.reduce((result, player) => {
    result.push(buildPlayerTracker(player));
    return result;
  }, [] as PlayerTimeTrackerData[]);
}

export function buildPlayerTracker(player: LivePlayer): PlayerTimeTrackerData {
  const tracker: PlayerTimeTrackerData = {
    id: player.id,
    isOn: player.status === PlayerStatus.On,
  };
  return tracker;
}

export function buildPlayerTrackerMap(
  gameId: string,
  existingPlayers?: LivePlayer[],
  keepExistingStatus?: boolean
) {
  let players;
  if (existingPlayers) {
    players = existingPlayers;
  } else {
    players = testlive.getLivePlayers(18);
  }
  if (!keepExistingStatus) {
    for (let index = 0; index < players.length; index++) {
      const player = players[index];
      // Set the first 11 players to be On, the last player to be Out, and the
      // remaining players to be Off.
      let status = PlayerStatus.Off;
      if (index < 11) {
        status = PlayerStatus.On;
      } else if (index === 17) {
        status = PlayerStatus.Out;
      }
      player.status = status;
    }
  }
  const game = { id: gameId || 'thegameid', players } as LiveGame;
  return PlayerTimeTrackerMap.createFromGame(game);
}

export function addShiftTrackingMatchers() {
  addDurationAssertion<PlayerTimeTracker>('shiftTime', 'tracker shiftTime', (tracker) =>
    tracker ? tracker.shiftTime : null
  );
  addDurationAssertion<PlayerTimeTracker>('totalTime', 'tracker totalTime', (tracker) =>
    tracker ? tracker.totalOnTime : null
  );

  Assertion.addMethod('shiftCount', function (this, expected: number) {
    const tracker = this._obj as PlayerTimeTracker;
    this.assert(
      tracker?.shiftCount === expected,
      'expected tracker shiftCount #{act} to be #{exp}',
      'expected tracker shiftCount #{act} to not be #{exp}',
      expected,
      tracker?.shiftCount,
      /*showDiff=*/ false
    );
  });

  Assertion.addMethod('running', function (this, expected: string) {
    const tracker = this._obj as PlayerTimeTracker;
    this.assert(
      tracker && (tracker.isOn ? tracker.onTimer?.isRunning : tracker.offTimer?.isRunning),
      'expected #{this} to be running',
      'expected #{this} to not be running',
      expected
    );
  });
}
