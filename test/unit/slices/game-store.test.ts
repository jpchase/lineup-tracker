import { hydrateGame } from '@app/actions/game';
import { GameDetail } from '@app/models/game';
import { GameState } from '@app/reducers/game';
import { hydrateGameState, persistGameState, resetCache } from '@app/slices/game-store';
import { idb } from '@app/storage/idb-wrapper';
import { RootState } from '@app/store';
import { expect } from '@open-wc/testing';
import { Store } from 'redux';
import * as sinon from 'sinon';
import { getNewGameDetail } from '../helpers/test_data';

const KEY_CACHED_GAMES = 'CACHED_GAMES';

interface MockStateUpdateFunc {
  (state: GameState): void;
}

function mockGetState(currentGame?: GameDetail, updateFn?: MockStateUpdateFunc) {
  const gameState = {
    hydrated: false,
    gameId: currentGame?.id || '',
    game: currentGame,
  } as GameState;
  if (updateFn) {
    updateFn(gameState);
  }
  return sinon.fake(() => {
    const mockState: RootState = {
      game: gameState,
    };
    return mockState;
  });
}

function mockStore(getStateMock: any): Store<RootState> {
  return {
    getState: getStateMock,
    dispatch: sinon.stub(),
    replaceReducer: sinon.stub(),
    subscribe: sinon.stub(),
  } as unknown as Store<RootState>;
}

describe('Game store', () => {
  let mockedIDBGet: sinon.SinonStub;
  let mockedIDBSet: sinon.SinonStub;

  beforeEach(() => {
    // Resets the cache to avoid data from other tests.
    resetCache();

    mockedIDBGet = sinon.stub(idb, 'get').resolves(undefined);
    mockedIDBSet = sinon.stub(idb, 'set').resolves();
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('hydrateGameState', () => {

    it('should do nothing if idb is empty', () => {
      const getStateMock = mockGetState();
      const storeMock = mockStore(getStateMock);

      hydrateGameState(storeMock);

      expect(mockedIDBGet).to.have.callCount(1);
      expect(getStateMock).to.not.have.been.called;
      expect(storeMock.dispatch).to.not.have.been.called;
    });

    it('should populate the current game when found in idb', async () => {
      const currentGame = getNewGameDetail();
      const cachedData = {
        currentGameId: currentGame.id,
        games: {
          [currentGame.id]: { ...currentGame }
        }
      };
      mockedIDBGet.onFirstCall().resolves(cachedData);

      const getStateMock = mockGetState();
      const storeMock = mockStore(getStateMock);

      hydrateGameState(storeMock);

      // Waits for promises to resolve.
      await Promise.resolve();

      const hydrateAction = hydrateGame(cachedData.games, cachedData.currentGameId);

      expect(storeMock.dispatch).to.have.been.calledWith(hydrateAction);
    });

  }); // describe('hydrateGameState')

  describe('persistGameState', () => {

    it('should do nothing if current game is missing from state', () => {
      const getStateMock = mockGetState();
      const storeMock = mockStore(getStateMock);

      persistGameState(storeMock);

      expect(getStateMock).to.have.callCount(1);

      expect(storeMock.dispatch).to.not.have.been.called;
      expect(mockedIDBSet).to.not.have.been.called;
    });

    it('should cache the current game when changed', async () => {
      const currentGame = getNewGameDetail();
      const getStateMock = mockGetState(currentGame);
      const storeMock = mockStore(getStateMock);

      persistGameState(storeMock);

      // Waits for promises to resolve.
      await Promise.resolve();

      expect(getStateMock).to.have.callCount(1);

      expect(storeMock.dispatch).to.not.have.been.called;

      const expectedCachedGames = {
        currentGameId: currentGame.id,
        games: {
          [currentGame.id]: { ...currentGame }
        }
      };
      expect(mockedIDBSet).to.have.been.calledWith(KEY_CACHED_GAMES, expectedCachedGames);
    });

    it('should do nothing if current game is already cached', async () => {
      const currentGame = getNewGameDetail();
      const getStateMock = mockGetState(currentGame);
      const storeMock = mockStore(getStateMock);

      // Call persist once, to setup the game in cache.
      persistGameState(storeMock);

      // Waits for promises to resolve.
      await Promise.resolve();

      expect(getStateMock, 'First getState call').to.have.callCount(1);
      expect(mockedIDBSet, 'First idb.set call').to.have.callCount(1);

      // Next call to persist should not update the cache.
      persistGameState(storeMock);

      // Waits for promises to resolve.
      await Promise.resolve();

      expect(getStateMock, 'Second getState call').to.have.callCount(2);
      expect(mockedIDBSet, 'Second idb.set call').to.have.callCount(1);
      expect(storeMock.dispatch).to.not.have.been.called;
    });

  }); // describe('persistGameState')

}); // describe('Game store')
