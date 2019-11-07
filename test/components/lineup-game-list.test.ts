import { LineupGameList } from '@app/components/lineup-game-list';
import '@app/components/lineup-game-list.js';
import { Games, GameStatus } from '@app/models/game';
import { assert, expect, fixture } from '@open-wc/testing';

function getGames(numGames: number): Games {
  const size = numGames || 6;
  const games: Games = {};
  for (let i = 0; i < size; i++) {
    const gameId = `G${i}`;

    games[gameId] = {
      id: gameId,
      status: GameStatus.New,
      teamId: 'T1',
      name: `Game ${i}`,
      opponent: `Other team ${i}`,
      date: new Date(2016, (i % 3), i)
    };
  }
  return games;
}

describe('lineup-game-list tests', () => {
  let el: LineupGameList;
  beforeEach(async () => {
    el = await fixture('<lineup-game-list></lineup-game-list>');
  });

  it('starts empty', () => {
    assert.deepEqual(el.games, {});
  });

  it('shows no games placeholder for empty list', () => {
    assert.deepEqual(el.games, {});
    const placeholder = el.shadowRoot!.querySelector('div p.empty-list');
    assert.isOk(placeholder, 'Missing empty placeholder element');
  });

  for (const numGames of [1, 6]) {
    const testName = numGames === 1 ? 'single game' : `multiple games`;
    it(`renders list with ${testName}`, async () => {
      const games = getGames(numGames);
      el.games = games;
      await el.updateComplete;

      const items = el.shadowRoot!.querySelectorAll('div div div.game');
      assert.isOk(items, 'Missing items for games');
      assert.equal(items.length, numGames, 'Rendered game count');

      let index = 0;
      for (const gameId of Object.keys(games)) {
        const game = games[gameId];

        const gameElement = items[index];

        const nameElement = gameElement.querySelector('.name');
        assert.isOk(nameElement, 'Missing name element');
        assert.equal(nameElement!.textContent, game.name);

        const opponentElement = gameElement.querySelector('.opponent');
        assert.isOk(opponentElement, 'Missing opponent element');
        assert.equal(opponentElement!.textContent, game.opponent);

        const dateElement = gameElement.querySelector('.gameDate');
        assert.isOk(dateElement, 'Missing gameDate element');
        assert.equal(dateElement!.textContent, game.date.toString());

        index++;
      }
    });
  }

  it('a11y', async () => {
    await expect(el).to.be.accessible();
  });
});
