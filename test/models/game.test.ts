import { Game, LiveGame, LiveGameBuilder } from '@app/models/game';
import { expect } from '@open-wc/testing';
import { getNewGame } from '../helpers/test_data';

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
      id: game.id
    };

    const newLiveGame = LiveGameBuilder.create(game);

    expect(newLiveGame).to.deep.equal(expected);
  });
});
