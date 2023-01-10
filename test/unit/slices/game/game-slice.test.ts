import { Game, GameDetail, GameMetadata, GameStatus } from '@app/models/game';
import { LiveGameBuilder } from '@app/models/live.js';
import { Roster } from '@app/models/player.js';
import { addGame, addNewGame, gameCompletedCreator, gameReducer as game, gameSetupCompletedCreator, GameState, GAME_INITIAL_STATE, getGame, getGames, saveGame } from '@app/slices/game/game-slice.js';
import { gameCompleted, gameSetupCompleted, LiveState } from '@app/slices/live/live-slice.js';
import { reader } from '@app/storage/firestore-reader.js';
import { writer } from '@app/storage/firestore-writer.js';
import { expect } from '@open-wc/testing';
import sinon from 'sinon';
import {
  buildGames, buildRoster, getMockAuthState, getMockTeamState, getNewGame,
  getNewGameDetail,
  getOtherStoredPlayer,
  getPublicGame, getPublicTeam, getStoredGame, getStoredGameData, getStoredPlayer, getStoredTeam,
  MockAuthStateOptions, OTHER_STORED_GAME_ID, TEST_USER_ID
} from '../../helpers/test_data.js';

const KEY_GAMES = 'games';

function getOtherStoredGameWithoutDetail(): Game {
  return { id: OTHER_STORED_GAME_ID, ...getStoredGameData() };
};

function getNewGameMetadata(): GameMetadata {
  return {
    name: 'New G',
    date: new Date(2016, 4, 6),
    opponent: 'New Game Opponent'
  };
};

// New game created by the UI does not have IDs until added to storage.
function getNewGameSaved(): Game {
  return { ...getNewGameMetadata(), id: 'theGameId', teamId: getStoredTeam().id, status: GameStatus.New };
}

function buildNewGameDetailAndRoster(): GameDetail {
  return getNewGameDetail(buildRoster([getStoredPlayer()]));
}

function getTeamRoster() {
  return buildRoster([getStoredPlayer(), getOtherStoredPlayer()]);
};

function getStoredGameDetail(): GameDetail {
  return {
    ...getStoredGame(),
    roster: getTeamRoster()
  };
};

interface MockStateUpdateFunc {
  (state: GameState, live: LiveState): void;
}

function mockGetState(games: Game[], options?: MockAuthStateOptions, teamState?: any, updateFn?: MockStateUpdateFunc) {
  return sinon.fake(() => {
    const mockState = {
      auth: getMockAuthState(options),
      game: {
        hydrated: false,
        gameId: '',
        game: undefined,
        games: buildGames(games),
        detailLoading: false,
        detailFailure: false,
        rosterLoading: false,
        rosterFailure: false
      },
      live: {} as LiveState,
      team: undefined
    };
    if (teamState) {
      mockState.team = teamState;
    }
    if (updateFn) {
      updateFn(mockState.game!, mockState.live);
    }
    return mockState;
  });
}

describe('Game slice', () => {
  let readerStub: sinon.SinonStubbedInstance<typeof reader>;
  let writerStub: sinon.SinonStubbedInstance<typeof writer>;

  beforeEach(() => {
    sinon.restore();

    readerStub = sinon.stub<typeof reader>(reader);
    writerStub = sinon.stub<typeof writer>(writer);
  });

  describe('getGames', () => {
    it('should do nothing if team id is missing', async () => {
      const dispatchMock = sinon.stub();
      const getStateMock = sinon.stub();

      await getGames('')(dispatchMock, getStateMock, undefined);

      expect(readerStub.loadCollection).to.not.have.been.called;

      expect(dispatchMock).to.not.have.been.called;
    });

    it('should dispatch an action with owned games for team returned from storage', async () => {
      const storedTeamId = getStoredTeam().id;
      const expectedGames = buildGames([getStoredGame(), getOtherStoredGameWithoutDetail()]);

      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState([], { signedIn: true, userId: TEST_USER_ID });
      const teamFilter = { field: 'teamId', operator: '==', value: storedTeamId };
      const userFilter = { field: 'owner_uid', operator: '==', value: TEST_USER_ID };
      const loadCollectionStub = readerStub.loadCollection
        .withArgs(KEY_GAMES, sinon.match.object, userFilter, teamFilter)
        .resolves(expectedGames);

      await getGames(storedTeamId)(dispatchMock, getStateMock, undefined);

      expect(dispatchMock).to.have.been.calledWith(sinon.match({
        type: getGames.fulfilled.type,
        payload: { ...expectedGames },
      }));
      expect(loadCollectionStub).to.have.callCount(1);
    });

    it('should set the games to the retrieved list', () => {
      const existingGame = getStoredGame();
      const newState = game(GAME_INITIAL_STATE, {
        type: getGames.fulfilled.type,
        payload: buildGames([existingGame])
      });

      expect(newState).to.deep.include({
        games: buildGames([existingGame]),
      });

      expect(newState).to.not.equal(GAME_INITIAL_STATE);
      expect(newState.games).to.not.equal(GAME_INITIAL_STATE.games);
    });

    it('should dispatch an action with public games when not signed in', async () => {
      const publicTeamId = getPublicTeam().id;
      const expectedGames = buildGames([getPublicGame()]);

      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState([], { signedIn: false });
      const teamFilter = { field: 'teamId', operator: '==', value: publicTeamId };
      const isPublicFilter = { field: 'public', operator: '==', value: true };
      readerStub.loadCollection
        .withArgs(KEY_GAMES, sinon.match.object, isPublicFilter, teamFilter)
        .resolves(expectedGames);

      await getGames(publicTeamId)(dispatchMock, getStateMock, undefined);

      expect(dispatchMock).to.have.been.calledWith(sinon.match({
        type: getGames.fulfilled.type,
        payload: { ...expectedGames },
      }));
    });

    it('should not dispatch an action when storage access fails', async () => {
      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState([], { signedIn: true, userId: TEST_USER_ID });

      readerStub.loadCollection.onFirstCall().throws(() => { return new Error('Storage failed with some error'); });

      await getGames(getStoredTeam().id)(dispatchMock, getStateMock, undefined);

      expect(dispatchMock).to.have.been.calledWith(sinon.match({
        type: getGames.rejected.type,
        error: { message: 'Storage failed with some error' }
      }));
    });

  }); // describe('getGames')

  describe('getGame', () => {
    let currentState: GameState;

    function mockLoadDocumentWithGame(game: Game) {
      return readerStub.loadDocument
        .withArgs(`${KEY_GAMES}/${game.id}`, sinon.match.object)
        .resolves(game);
    }

    function mockLoadCollectionWithGameRoster(gameId: string, roster: Roster) {
      return readerStub.loadCollection
        .withArgs(`${KEY_GAMES}/${gameId}/roster`, sinon.match.object)
        .resolves(roster);
    }

    function initCurrentState() {
      return {
        ...GAME_INITIAL_STATE,
      };
    }

    it('should do nothing if game id is missing', async () => {
      const dispatchMock = sinon.stub();
      const getStateMock = sinon.stub();

      await getGame(undefined as unknown as string)(dispatchMock, getStateMock, undefined);

      expect(readerStub.loadDocument, 'loadDocument').to.not.have.been.called;
      expect(readerStub.loadCollection, 'loadCollection').to.not.have.been.called;

      expect(dispatchMock).to.not.have.been.called;
    });

    it('should set game id and loading flag for pending', () => {
      currentState = initCurrentState();
      const gameId = 'idfornewgame';
      const newState = game(currentState, {
        type: getGame.pending.type,
        meta: {
          gameId: gameId
        }
      });

      expect(newState).to.include({
        gameId: gameId,
        detailLoading: true,
        detailFailure: false
      });

      expect(newState).not.to.equal(currentState);
      expect(newState.gameId).not.to.equal(currentState.gameId);
    });

    it('should dispatch success action with game returned from storage', async () => {
      const expectedGame = getStoredGame();
      const expectedGameDetail = getStoredGameDetail();
      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState([]);
      const loadDocumentStub = mockLoadDocumentWithGame(expectedGame);
      const loadCollectionStub = mockLoadCollectionWithGameRoster(
        expectedGameDetail.id, expectedGameDetail.roster);

      await getGame(expectedGameDetail.id)(dispatchMock, getStateMock, undefined);

      expect(loadDocumentStub, 'loadDocument').to.have.callCount(1);
      expect(loadCollectionStub, 'loadCollection').to.have.callCount(1);

      expect(dispatchMock, 'dispatch').to.have.callCount(2);

      // Checks that first dispatch was the request action
      expect(dispatchMock.firstCall).to.have.been.calledWith(sinon.match({
        type: getGame.pending.type,
        meta: {
          gameId: expectedGameDetail.id,
        }
      }));

      expect(dispatchMock.lastCall).to.have.been.calledWith(sinon.match({
        type: getGame.fulfilled.type,
        payload: expectedGameDetail,
      }));
    });

    it('should set game to retrieved game with full detail', () => {
      currentState = initCurrentState();
      currentState.detailLoading = true;
      const existingGame = getStoredGame(GameStatus.Start);
      const inputGame: GameDetail = {
        ...existingGame,
        roster: buildRoster([getStoredPlayer()])
      };

      currentState.gameId = inputGame.id;
      const newState = game(currentState,
        getGame.fulfilled(inputGame, 'unused', 'unused'));

      const gameDetail: GameDetail = {
        ...existingGame,
        hasDetail: true,
        roster: buildRoster([getStoredPlayer()])
      };

      expect(newState).to.deep.include({
        game: gameDetail,
        // TODO: Ensure games state has latest game detail
        // games: buildGames([gameDetail]),
        detailLoading: false,
        detailFailure: false
      });

      expect(newState).not.to.equal(currentState);
      expect(newState.game).not.to.equal(currentState.game);
    });

    it('should dispatch success action when game roster is empty', async () => {
      const storedGame: GameDetail = {
        ...getOtherStoredGameWithoutDetail(),
        roster: {}
      }

      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState([]);
      const loadDocumentStub = mockLoadDocumentWithGame(storedGame);
      const loadCollectionStub = mockLoadCollectionWithGameRoster(
        storedGame.id, {});

      await getGame(OTHER_STORED_GAME_ID)(dispatchMock, getStateMock, undefined);

      expect(loadDocumentStub, 'loadDocument').to.have.callCount(1);
      expect(loadCollectionStub, 'loadCollection').to.have.callCount(1);

      // The request action is dispatched, regardless.
      expect(dispatchMock).to.have.callCount(2);

      expect(dispatchMock.lastCall).to.have.been.calledWith(sinon.match({
        type: getGame.fulfilled.type,
        payload: storedGame,
      }));
    });

    it('should initialize detail when game roster is empty', () => {
      currentState = initCurrentState();
      currentState.detailLoading = true;
      const currentGame = getNewGame();
      const inputGame: GameDetail = {
        ...currentGame,
        roster: {}
      };

      currentState.gameId = inputGame.id;
      const newState = game(currentState,
        getGame.fulfilled(inputGame, 'unused', 'unused'));

      const gameDetail: GameDetail = {
        ...currentGame,
        hasDetail: true,
        roster: {},
      };

      expect(newState).to.deep.include({
        game: gameDetail,
        // TODO: Ensure games state has latest game detail
        // games: buildGames([gameDetail]),
        detailLoading: false,
        detailFailure: false
      });

      expect(newState).not.to.equal(currentState);
      expect(newState.game).not.to.equal(currentState.game);
    });

    it('should use the already loaded game from game detail in state, without retrieving from storage', async () => {
      const dispatchMock = sinon.stub();
      const loadedGame: GameDetail = {
        ...getStoredGameDetail(),
        hasDetail: true
      };
      const getStateMock = mockGetState([], undefined, undefined, (gameState) => {
        gameState.gameId = loadedGame.id;
        gameState.game = loadedGame;
      });

      await getGame(loadedGame.id)(dispatchMock, getStateMock, undefined);

      expect(readerStub.loadDocument, 'loadDocument').to.not.have.been.called;
      expect(readerStub.loadCollection, 'loadCollection').to.not.have.been.called;

      // The request action is dispatched, regardless.
      expect(dispatchMock).to.have.callCount(2);

      expect(dispatchMock.lastCall).to.have.been.calledWith(sinon.match({
        type: getGame.fulfilled.type,
        payload: loadedGame,
      }));
    });

    it('should use the already loaded game from games list in state, without retrieving from storage', async () => {
      const dispatchMock = sinon.stub();
      const loadedGame: GameDetail = {
        ...getStoredGameDetail(),
        hasDetail: true
      };
      const getStateMock = mockGetState([loadedGame]);

      await getGame(loadedGame.id)(dispatchMock, getStateMock, undefined);

      expect(readerStub.loadDocument, 'loadDocument').to.not.have.been.called;
      expect(readerStub.loadCollection, 'loadCollection').to.not.have.been.called;

      // The request action is dispatched, regardless.
      expect(dispatchMock).to.have.callCount(2);

      expect(dispatchMock.lastCall).to.have.been.calledWith(sinon.match({
        type: getGame.fulfilled.type,
        payload: loadedGame,
      }));
    });

    it('should update only loading flag when game set to current game', () => {
      currentState = initCurrentState();
      const currentGame = buildNewGameDetailAndRoster();
      currentState.gameId = currentGame.id;
      currentState.game = currentGame;
      currentState.detailLoading = true;

      const newState = game(currentState,
        getGame.fulfilled(currentGame, 'unused', 'unused'));

      const gameDetail: GameDetail = {
        ...currentGame,
      };

      expect(newState).to.deep.include({
        game: gameDetail,
        // TODO: Ensure games state has latest game detail
        // games: buildGames([gameDetail]),
        detailLoading: false,
        detailFailure: false
      });

      expect(newState).not.to.equal(currentState);
      expect(newState.game).to.equal(currentState.game);
      expect(newState.game!.roster).to.equal(currentState.game!.roster);
    });

    it('should retrieve from storage when already loaded game is missing detail', async () => {
      const expectedGame = getStoredGame();
      const expectedGameDetail = getStoredGameDetail();

      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState([{
        ...expectedGameDetail, hasDetail: false
      }]);
      const loadDocumentStub = mockLoadDocumentWithGame(expectedGame);
      const loadCollectionStub = mockLoadCollectionWithGameRoster(
        expectedGameDetail.id, expectedGameDetail.roster);

      await getGame(expectedGame.id)(dispatchMock, getStateMock, undefined);

      expect(loadDocumentStub, 'loadDocument').to.have.callCount(1);
      expect(loadCollectionStub, 'loadCollection').to.have.callCount(1);

      // The request action is dispatched, regardless.
      expect(dispatchMock).to.have.callCount(2);

      expect(dispatchMock.lastCall).to.have.been.calledWith(sinon.match({
        type: getGame.fulfilled.type,
        payload: expectedGameDetail,
      }));
    });

    it('should fail when game not found in storage', async () => {
      const gameId = 'nosuchgame';

      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState([]);
      readerStub.loadDocument
        .withArgs(`${KEY_GAMES}/${gameId}`, sinon.match.object)
        .rejects(new Error(`Document not found: ${KEY_GAMES}/${gameId}`));

      await getGame(gameId)(dispatchMock, getStateMock, undefined);

      expect(dispatchMock).to.have.callCount(2);

      // Checks that first dispatch was the request action
      expect(dispatchMock.firstCall).to.have.been.calledWith(sinon.match({
        type: getGame.pending.type,
        meta: {
          gameId: gameId,
        }
      }));

      expect(dispatchMock.lastCall).to.have.been.calledWith(sinon.match({
        type: getGame.rejected.type,
        error: { message: `Document not found: ${KEY_GAMES}/${gameId}` },
      }));
    });

    it('should dispatch rejected action when storage access fails', async () => {
      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState([]);
      const gameId = getStoredGame().id;

      readerStub.loadDocument.onFirstCall().throws(() => { return new Error('Storage failed with some error'); });

      await getGame(gameId)(dispatchMock, getStateMock, undefined);

      expect(dispatchMock).to.have.callCount(2);

      // Checks that first dispatch was the request action
      expect(dispatchMock.firstCall).to.have.been.calledWith(sinon.match({
        type: getGame.pending.type,
        meta: {
          gameId: gameId,
        }
      }));

      expect(dispatchMock.lastCall).to.have.been.calledWith(sinon.match({
        type: getGame.rejected.type,
        error: { message: 'Storage failed with some error' }
      }));
    });

    it('should set failure flag and error message', () => {
      currentState = initCurrentState();
      const newState = game(currentState, {
        type: getGame.rejected.type,
        error: { message: 'What a game failure!' }
      });

      expect(newState).to.include({
        error: 'What a game failure!',
        detailLoading: false,
        detailFailure: true
      });

      expect(newState).not.to.equal(currentState);
      expect(newState.error).not.to.equal(currentState.error);
    });
  }); // describe('getGame')

  describe('addNewGame', () => {
    it('should do nothing if new game is missing', () => {
      const dispatchMock = sinon.stub();
      const getStateMock = sinon.stub();

      addNewGame(undefined as unknown as Game)(dispatchMock, getStateMock, undefined);

      expect(getStateMock).to.not.have.been.called;

      expect(dispatchMock).to.not.have.been.called;
    });

    it('should dispatch an action to add a new game that is unique', () => {
      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState([getStoredGame()]);

      addNewGame(getNewGameMetadata() as Game)(dispatchMock, getStateMock, undefined);

      expect(getStateMock).to.have.been.called;

      expect(dispatchMock).to.have.been.calledWith(sinon.match.instanceOf(Function));
    });

    it('should do nothing with a new game that is not unique', () => {
      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState([getNewGameSaved()]);

      addNewGame(getNewGameMetadata() as Game)(dispatchMock, getStateMock, undefined);

      expect(getStateMock).to.have.been.called;

      expect(dispatchMock).to.not.have.been.called;
    });
  });  // describe('addNewGame')

  describe('addGame', () => {
    const existingGame = getStoredGame();
    const newGame = getNewGame();

    it('should handle addGame with empty games', () => {
      const newState = game(GAME_INITIAL_STATE, addGame(newGame));

      expect(newState).to.deep.include({
        games: buildGames([newGame]),
      });

      expect(newState).to.not.equal(GAME_INITIAL_STATE);
      expect(newState.games).to.not.equal(GAME_INITIAL_STATE.games);
    });

    it('should handle addGame with existing games', () => {
      const state: GameState = {
        ...GAME_INITIAL_STATE
      };
      state.games = buildGames([existingGame]);

      const newState = game(state, addGame(newGame));

      expect(newState).to.deep.include({
        games: buildGames([existingGame, newGame]),
      });

      expect(newState).to.not.equal(state);
      expect(newState.games).to.not.equal(state.games);
    });
  }); // describe('addGame')

  describe('saveGame', () => {
    it('should save to storage and dispatch an action to add game', async () => {
      const expectedSavedGame = getNewGameSaved();

      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState([], { signedIn: true, userId: TEST_USER_ID }, getMockTeamState([], getStoredTeam()));
      const saveNewDocumentStub = writerStub.saveNewDocument.callsFake(
        (model) => {
          model.id = expectedSavedGame.id;
          model.teamId = expectedSavedGame.teamId;
          return Promise.resolve();
        }
      );

      const inputGame = getNewGameMetadata();
      await saveGame(inputGame as Game)(dispatchMock, getStateMock, undefined);

      // Checks that the new game was saved to the database.
      expect(saveNewDocumentStub).calledOnceWith(
        inputGame, KEY_GAMES, undefined, sinon.match.object, { addTeamId: true, addUserId: true });
      expect(inputGame, 'Input game should have properties set by saving').to.deep.equal(expectedSavedGame);

      expect(dispatchMock).to.have.been.calledWith(
        addGame(expectedSavedGame));

      // Waits for promises to resolve.
      await Promise.resolve();
    });

    it('should not dispatch an action when storage access fails', async () => {
      const dispatchMock = sinon.stub();
      const getStateMock = sinon.stub();

      writerStub.saveNewDocument.onFirstCall().throws(() => { return new Error('Storage failed with some error'); });

      let rejected = false;
      try {
        await saveGame(getNewGameMetadata() as Game)(dispatchMock, getStateMock, undefined);
      } catch {
        rejected = true;
      }
      expect(rejected, 'saveGame should reject promise').to.be.true;

      expect(dispatchMock).to.not.have.been.called;
    });
  }); // describe('saveGame')

  describe('gameSetupCompleted', () => {
    let existingGame: GameDetail;

    beforeEach(() => {
      existingGame = buildNewGameDetailAndRoster();
    });

    it('should save updated game to storage', async () => {
      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState([], { signedIn: true, userId: TEST_USER_ID },
        getMockTeamState([], getStoredTeam()),
        (gameState, liveState) => {
          gameState.gameId = existingGame.id;
          gameState.game = existingGame;
          liveState.gameId = existingGame.id;
          if (!liveState.games) {
            liveState.games = {};
          }
          liveState.games[existingGame.id] = LiveGameBuilder.create(existingGame);
        });
      const updateDocumentStub = writerStub.updateDocument.returns();

      gameSetupCompletedCreator(existingGame.id)(dispatchMock, getStateMock, undefined);

      // Waits for promises to resolve.
      await Promise.resolve();

      // Checks that the game was saved to the database.
      expect(updateDocumentStub).calledOnceWith(
        { status: GameStatus.Start }, `${KEY_GAMES}/${existingGame.id}`);
    });

    it('should not dispatch an action when storage access fails', async () => {
      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState([], { signedIn: true, userId: TEST_USER_ID },
        getMockTeamState([], getStoredTeam()),
        (gameState, liveState) => {
          gameState.gameId = existingGame.id;
          gameState.game = existingGame;
          liveState.gameId = existingGame.id;
          if (!liveState.games) {
            liveState.games = {};
          }
          liveState.games[existingGame.id] = LiveGameBuilder.create(existingGame);
        });

      writerStub.updateDocument.onFirstCall().throws(() => { return new Error('Storage failed with some error'); });

      expect(() => {
        gameSetupCompletedCreator(existingGame.id)(dispatchMock, getStateMock, undefined);
      }).to.throw('Storage failed');

      // Waits for promises to resolve.
      await Promise.resolve();

      expect(dispatchMock).to.not.have.been.called;
    });

    it('should set status to Start', () => {
      const state: GameState = {
        ...GAME_INITIAL_STATE,
        game: {
          ...existingGame
        }
      };
      const expectedGame = buildNewGameDetailAndRoster();
      expectedGame.status = GameStatus.Start;

      const newState = game(state, gameSetupCompleted(existingGame.id, expectedGame));

      expect(newState).to.deep.include({
        game: expectedGame,
      });

      expect(newState).not.to.equal(state);
      expect(newState.game).not.to.equal(state.game);
    });

  }); // describe('gameSetupCompleted')

  describe('gameCompleted', () => {
    let existingGame: GameDetail;

    beforeEach(() => {
      existingGame = buildNewGameDetailAndRoster();
    });

    it('should save updated game to storage', async () => {
      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState([], { signedIn: true, userId: TEST_USER_ID },
        getMockTeamState([], getStoredTeam()),
        (gameState) => {
          gameState.gameId = existingGame.id;
          gameState.game = existingGame;
        });
      const updateDocumentStub = writerStub.updateDocument.returns();

      gameCompletedCreator(existingGame.id)(dispatchMock, getStateMock, undefined);

      // Waits for promises to resolve.
      await Promise.resolve();

      // Checks that the game was saved to the database.
      expect(updateDocumentStub).calledOnceWith(
        { status: GameStatus.Done }, `${KEY_GAMES}/${existingGame.id}`);
    });

    it('should not dispatch an action when storage access fails', async () => {
      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState([], { signedIn: true, userId: TEST_USER_ID },
        getMockTeamState([], getStoredTeam()),
        (gameState) => {
          gameState.gameId = existingGame.id;
          gameState.game = existingGame;
        });

      writerStub.updateDocument.onFirstCall().throws(() => { return new Error('Storage failed with some error'); });

      expect(() => {
        gameCompletedCreator(undefined as unknown as string)(dispatchMock, getStateMock, undefined);
      }).to.throw('Storage failed');

      // Waits for promises to resolve.
      await Promise.resolve();

      expect(dispatchMock).to.not.have.been.called;
    });

    it('should set status to Done', () => {
      const state: GameState = {
        ...GAME_INITIAL_STATE,
        game: {
          ...existingGame
        }
      };
      const expectedGame = buildNewGameDetailAndRoster();
      expectedGame.status = GameStatus.Done;

      const newState = game(state, gameCompleted(existingGame.id));

      expect(newState).to.deep.include({
        game: expectedGame,
      });

      expect(newState).not.to.equal(state);
      expect(newState.game).not.to.equal(state.game);
    });

  }); // describe('gameCompleted')

}); // describe('Game slice')
