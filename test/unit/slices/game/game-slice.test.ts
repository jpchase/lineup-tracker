import { Game, GameDetail, GameMetadata, GameStatus } from '@app/models/game';
import { game } from '@app/reducers/game.js';
import { addNewGame, gameCompletedCreator, gameSetupCompletedCreator, gamesReducer as games, GameState, getGames, saveGame } from '@app/slices/game/game-slice';
import { gameCompleted, gameSetupCompleted } from '@app/slices/live/live-slice.js';
import { reader } from '@app/storage/firestore-reader.js';
import { writer } from '@app/storage/firestore-writer.js';
import { expect } from '@open-wc/testing';
import sinon from 'sinon';
import {
  buildGames, buildRoster, getFakeAction, getMockAuthState, getMockTeamState, getNewGame,
  getNewGameDetail,
  getPublicGame, getPublicTeam, getStoredGame, getStoredGameData, getStoredPlayer, getStoredTeam,
  MockAuthStateOptions, OTHER_STORED_GAME_ID, TEST_USER_ID
} from '../../helpers/test_data';

const actionTypes = {
  ADD_GAME: 'game/addGame',
  GET_GAMES: 'game/getGames',

  fulfilled(typePrefix: string) {
    return `${typePrefix}/fulfilled`;
  },

  rejected(typePrefix: string) {
    return `${typePrefix}/rejected`;
  },
};

const GAME_INITIAL_STATE: GameState = {
  hydrated: false,
  gameId: '',
  game: undefined,
  games: {},
  detailLoading: false,
  detailFailure: false,
  rosterLoading: false,
  rosterFailure: false,
  error: ''
};

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

interface MockStateUpdateFunc {
  (state: GameState): void;
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
      team: undefined
    };
    if (teamState) {
      mockState.team = teamState;
    }
    if (updateFn) {
      updateFn(mockState.game!);
    }
    return mockState;
  });
}

describe('Games reducer', () => {
  const existingGame = getStoredGame();
  const newGame = getNewGame();

  it('should return the initial state', () => {
    expect(
      games(GAME_INITIAL_STATE, getFakeAction())
    ).to.equal(GAME_INITIAL_STATE);
  });

  it('should return the initial state when none provided', () => {
    expect(
      games(undefined, getFakeAction())
    ).to.deep.equal(GAME_INITIAL_STATE);
  });

  describe('ADD_GAME', () => {
    it('should handle ADD_GAME with empty games', () => {
      const newState = games(GAME_INITIAL_STATE, {
        type: actionTypes.ADD_GAME,
        payload: newGame
      });

      expect(newState).to.deep.include({
        games: buildGames([newGame]),
      });

      expect(newState).to.not.equal(GAME_INITIAL_STATE);
      expect(newState.games).to.not.equal(GAME_INITIAL_STATE.games);
    });

    it('should handle ADD_GAME with existing games', () => {
      const state: GameState = {
        ...GAME_INITIAL_STATE
      };
      state.games = buildGames([existingGame]);

      const newState = games(state, {
        type: actionTypes.ADD_GAME,
        payload: newGame
      });

      expect(newState).to.deep.include({
        games: buildGames([existingGame, newGame]),
      });

      expect(newState).to.not.equal(state);
      expect(newState.games).to.not.equal(state.games);
    });
  }); // describe('ADD_GAME')

});


describe('Games actions', () => {
  let readerStub: sinon.SinonStubbedInstance<typeof reader>;
  let writerStub: sinon.SinonStubbedInstance<typeof writer>;

  beforeEach(() => {
    sinon.restore();

    readerStub = sinon.stub<typeof reader>(reader);
    writerStub = sinon.stub<typeof writer>(writer);
  });

  describe('getGames', () => {
    it('should do nothing if team id is missing', () => {
      const dispatchMock = sinon.stub();
      const getStateMock = sinon.stub();

      getGames('')(dispatchMock, getStateMock, undefined);

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
        type: actionTypes.fulfilled(actionTypes.GET_GAMES),
        payload: { ...expectedGames },
      }));
      expect(loadCollectionStub).to.have.callCount(1);
    });

    it('should set the games to the retrieved list', () => {
      const existingGame = getStoredGame();
      const newState = games(GAME_INITIAL_STATE, {
        type: actionTypes.fulfilled(actionTypes.GET_GAMES),
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
        type: actionTypes.fulfilled(actionTypes.GET_GAMES),
        payload: { ...expectedGames },
      }));
    });

    it('should not dispatch an action when storage access fails', async () => {
      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState([], { signedIn: true, userId: TEST_USER_ID });

      readerStub.loadCollection.onFirstCall().throws(() => { return new Error('Storage failed with some error'); });

      await getGames(getStoredTeam().id)(dispatchMock, getStateMock, undefined);

      expect(dispatchMock).to.have.been.calledWith(sinon.match({
        type: actionTypes.rejected(actionTypes.GET_GAMES),
        error: { message: 'Storage failed with some error' }
      }));
    });

  }); // describe('getGames')

  describe('addNewGame', () => {
    it('should do nothing if new game is missing', () => {
      const dispatchMock = sinon.stub();
      const getStateMock = sinon.stub();

      addNewGame()(dispatchMock, getStateMock, undefined);

      expect(getStateMock).to.not.have.been.called;

      expect(dispatchMock).to.not.have.been.called;
    });

    it('should dispatch an action to add a new game that is unique', () => {
      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState([getStoredGame()]);

      addNewGame(getNewGameMetadata())(dispatchMock, getStateMock, undefined);

      expect(getStateMock).to.have.been.called;

      expect(dispatchMock).to.have.been.calledWith(sinon.match.instanceOf(Function));
    });

    it('should do nothing with a new game that is not unique', () => {
      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState([getNewGameSaved()]);

      addNewGame(getNewGameMetadata())(dispatchMock, getStateMock, undefined);

      expect(getStateMock).to.have.been.called;

      expect(dispatchMock).to.not.have.been.called;
    });
  });  // describe('addNewGame')

  describe('saveGame', () => {
    it('should save to storage and dispatch an action to add game', async () => {
      const expectedSavedGame = getNewGameSaved();

      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState([], { signedIn: true, userId: TEST_USER_ID }, getMockTeamState([], getStoredTeam()));
      const saveNewDocumentStub = writerStub.saveNewDocument.callsFake(
        (model) => {
          model.id = expectedSavedGame.id;
          model.teamId = expectedSavedGame.teamId
        }
      );

      const inputGame = getNewGameMetadata();
      saveGame(inputGame)(dispatchMock, getStateMock, undefined);

      // Checks that the new game was saved to the database.
      expect(saveNewDocumentStub).calledOnceWith(
        inputGame, KEY_GAMES, undefined, sinon.match.object, { addTeamId: true, addUserId: true });
      expect(inputGame, 'Input game should have properties set by saving').to.deep.equal(expectedSavedGame);

      expect(dispatchMock).to.have.been.calledWith({
        type: actionTypes.ADD_GAME,
        payload: expectedSavedGame,
      });

      // Waits for promises to resolve.
      await Promise.resolve();
    });

    it('should not dispatch an action when storage access fails', async () => {
      const dispatchMock = sinon.stub();
      const getStateMock = sinon.stub();

      writerStub.saveNewDocument.onFirstCall().throws(() => { return new Error('Storage failed with some error'); });

      expect(() => {
        saveGame(getNewGameMetadata())(dispatchMock, getStateMock, undefined);
      }).to.throw('Storage failed');

      // Waits for promises to resolve.
      await Promise.resolve();

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
        (gameState) => {
          gameState.gameId = existingGame.id;
          gameState.game = existingGame;
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
        (gameState) => {
          gameState.gameId = existingGame.id;
          gameState.game = existingGame;
        });

      writerStub.updateDocument.onFirstCall().throws(() => { return new Error('Storage failed with some error'); });

      expect(() => {
        gameSetupCompletedCreator()(dispatchMock, getStateMock, undefined);
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

      const newState = game(state, gameSetupCompleted(existingGame.id));

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
        gameCompletedCreator()(dispatchMock, getStateMock, undefined);
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

}); // describe('Game actions')
