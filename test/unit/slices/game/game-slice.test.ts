import { Game, GameMetadata, Games, GameStatus } from '@app/models/game';
import { addNewGame, games, GamesState, getGames, saveGame } from '@app/slices/game/game-slice';
import { reader } from '@app/storage/firestore-reader.js';
import { writer } from '@app/storage/firestore-writer.js';
import { expect } from '@open-wc/testing';
import sinon from 'sinon';
import {
  buildGames, getFakeAction, getMockAuthState, getMockTeamState, getNewGame,
  getPublicGame, getPublicTeam, getStoredGame, getStoredGameData, getStoredTeam,
  MockAuthStateOptions, OTHER_STORED_GAME_ID, TEST_USER_ID
} from '../../helpers/test_data';

const actionTypes = {
  ADD_GAME: 'game/addGame',
  GET_GAMES: 'game/getGames',
};

const GAMES_INITIAL_STATE: GamesState = {
  games: {} as Games,
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

function mockGetState(games: Game[], options?: MockAuthStateOptions, teamState?: any) {
  return sinon.fake(() => {
    const mockState = {
      auth: getMockAuthState(options),
      games: {
        games: buildGames(games)
      },
      team: undefined
    };
    if (teamState) {
      mockState.team = teamState;
    }
    return mockState;
  });
}

describe('Games reducer', () => {
  const existingGame = getStoredGame();
  const newGame = getNewGame();

  it('should return the initial state', () => {
    expect(
      games(GAMES_INITIAL_STATE, getFakeAction())
    ).to.equal(GAMES_INITIAL_STATE);
  });

  it('should return the initial state when none provided', () => {
    expect(
      games(undefined, getFakeAction())
    ).to.deep.equal(GAMES_INITIAL_STATE);
  });

  describe('GET_GAMES', () => {
    it('should handle GET_GAMES', () => {
      const newState = games(GAMES_INITIAL_STATE, {
        type: actionTypes.GET_GAMES,
        payload: buildGames([existingGame])
      });

      expect(newState).to.deep.include({
        games: buildGames([existingGame]),
      });

      expect(newState).to.not.equal(GAMES_INITIAL_STATE);
      expect(newState.games).to.not.equal(GAMES_INITIAL_STATE.games);
    });
  }); // describe('GET_GAMES')

  describe('ADD_GAME', () => {
    it('should handle ADD_GAME with empty games', () => {
      const newState = games(GAMES_INITIAL_STATE, {
        type: actionTypes.ADD_GAME,
        payload: newGame
      });

      expect(newState).to.deep.include({
        games: buildGames([newGame]),
      });

      expect(newState).to.not.equal(GAMES_INITIAL_STATE);
      expect(newState.games).to.not.equal(GAMES_INITIAL_STATE.games);
    });

    it('should handle ADD_GAME with existing games', () => {
      const state: GamesState = {
        ...GAMES_INITIAL_STATE
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

      getGames()(dispatchMock, getStateMock, undefined);

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

      getGames(storedTeamId)(dispatchMock, getStateMock, undefined);

      // Waits for promises to resolve.
      await Promise.resolve();

      expect(dispatchMock).to.have.been.calledWith({
        type: actionTypes.GET_GAMES,
        payload: { ...expectedGames },
      });
      expect(loadCollectionStub).to.have.callCount(1);
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

      getGames(publicTeamId)(dispatchMock, getStateMock, undefined);

      // Waits for promises to resolve.
      await Promise.resolve();

      expect(dispatchMock).to.have.been.calledWith({
        type: actionTypes.GET_GAMES,
        payload: { ...expectedGames },
      });
    });

    it('should not dispatch an action when storage access fails', async () => {
      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState([], { signedIn: true, userId: TEST_USER_ID });

      readerStub.loadCollection.onFirstCall().throws(() => { return new Error('Storage failed with some error'); });

      expect(() => {
        getGames(getStoredTeam().id)(dispatchMock, getStateMock, undefined);
      }).to.throw('Storage failed');

      // Waits for promises to resolve.
      await Promise.resolve();

      expect(dispatchMock).to.not.have.been.called;
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

}); // describe('Game actions')
