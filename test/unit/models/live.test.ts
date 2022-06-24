import { Game, GameDetail, GameStatus } from '@app/models/game.js';
import { LiveGame, LiveGameBuilder } from '@app/models/live.js';
import { expect } from '@open-wc/testing';
import {
  buildLivePlayers, buildRoster,
  getNewGame, getNewGameDetail, getNewPlayer, getStoredPlayer
} from '../helpers/test_data';

describe('LiveGameBuilder', () => {

  it('create should throw for missing/undefined', () => {
    expect(() => {
      LiveGameBuilder.create(undefined as unknown as Game);
    }).to.throw();
    expect(() => {
      LiveGameBuilder.create(null as unknown as Game);
    }).to.throw();
    expect(() => {
      // @ts-ignore To allow no args to be passed
      LiveGameBuilder.create();
    }).to.throw();
  });

  it('create should handle new game', () => {
    const game = getNewGame();
    const expected: LiveGame = {
      id: game.id,
      status: GameStatus.New,
    };

    const newLiveGame = LiveGameBuilder.create(game);

    expect(newLiveGame).to.deep.equal(expected);
  });

  it('create should handle new game with empty roster', () => {
    const game = getNewGame() as GameDetail;
    game.roster = {};
    const expected: LiveGame = {
      id: game.id,
      status: GameStatus.New,
      players: []
    };

    const newLiveGame = LiveGameBuilder.create(game);

    expect(newLiveGame).to.deep.equal(expected);
  });

  it('create should handle game with roster', () => {
    const game = getNewGameDetail(buildRoster([getNewPlayer(), getStoredPlayer()]));
    game.status = GameStatus.Start;
    const expected: LiveGame = {
      id: game.id,
      status: GameStatus.Start,
      players: buildLivePlayers([getNewPlayer(), getStoredPlayer()])
    };

    const newLiveGame = LiveGameBuilder.create(game);

    expect(newLiveGame).to.deep.equal(expected);
  });
});
