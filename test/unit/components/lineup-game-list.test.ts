/** @format */

import '@app/components/lineup-game-list.js';
import { LineupGameList } from '@app/components/lineup-game-list.js';
import { DateFormatter } from '@app/models/clock.js';
import { Games, GameStatus } from '@app/models/game.js';
import { assert, expect, fixture, html } from '@open-wc/testing';

function getGames(numGames: number): Games {
  const size = numGames || 6;
  const games: Games = {};
  for (let i = 0; i < size; i++) {
    const gameId = `G${i}`;

    // Hours are either 0, before noon, or after noon.
    let hours = 12 + i;
    if (i === 0) {
      hours = 0;
    } else if (i % 2 === 0) {
      hours = 11 - i;
    }

    games[gameId] = {
      id: gameId,
      status: GameStatus.New,
      teamId: 'T1',
      name: `Game ${i}`,
      opponent: `Other team ${i}`,
      // Months start at zero, days start at 1, hours as set above.
      date: new Date(2016, i % 3, i + 1, hours),
    };
  }
  return games;
}

describe('lineup-game-list tests', () => {
  let el: LineupGameList;
  beforeEach(async () => {
    el = await fixture(html`<lineup-game-list></lineup-game-list>`);
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
      const dateFormatter = new DateFormatter();
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
        assert.equal(dateElement!.textContent, dateFormatter.format(game.date));

        index += 1;
      }
    });
  }

  it('a11y', async () => {
    await expect(el).to.be.accessible();
  });
});
