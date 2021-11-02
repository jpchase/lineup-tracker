import * as actions from '@app/actions/games';
import { Game, GameMetadata, GameStatus } from '@app/models/game';
import { reader } from '@app/storage/firestore-reader.js';
import { writer } from '@app/storage/firestore-writer.js';
import { expect } from '@open-wc/testing';
import sinon from 'sinon';
import {
  buildGames, getMockAuthState, getMockTeamState,
  getPublicGame, getPublicTeam, getStoredGame, getStoredGameData, getStoredTeam,
  MockAuthStateOptions, OTHER_STORED_GAME_ID, TEST_USER_ID
} from '../helpers/test_data';

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

describe('Games actions', () => {
  let readerStub: sinon.SinonStubbedInstance<typeof reader>;
  let writerStub: sinon.SinonStubbedInstance<typeof writer>;

  beforeEach(() => {
    sinon.restore();

    readerStub = sinon.stub<typeof reader>(reader);
    writerStub = sinon.stub<typeof writer>(writer);
  });

  describe('getGames', () => {
    it('should return a function to dispatch the getGames action', () => {
      expect(typeof actions.getGames()).to.equal('function');
    });

    it('should do nothing if team id is missing', () => {
      const dispatchMock = sinon.stub();
      const getStateMock = sinon.stub();

      actions.getGames()(dispatchMock, getStateMock, undefined);

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

      actions.getGames(storedTeamId)(dispatchMock, getStateMock, undefined);

      // Waits for promises to resolve.
      await Promise.resolve();

      expect(dispatchMock).to.have.been.calledWith({
        type: actions.GET_GAMES,
        games: { ...expectedGames },
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

      actions.getGames(publicTeamId)(dispatchMock, getStateMock, undefined);

      // Waits for promises to resolve.
      await Promise.resolve();

      expect(dispatchMock).to.have.been.calledWith({
        type: actions.GET_GAMES,
        games: { ...expectedGames },
      });
    });

    it('should not dispatch an action when storage access fails', async () => {
      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState([], { signedIn: true, userId: TEST_USER_ID });

      readerStub.loadCollection.onFirstCall().throws(() => { return new Error('Storage failed with some error'); });

      expect(() => {
        actions.getGames(getStoredTeam().id)(dispatchMock, getStateMock, undefined);
      }).to.throw('Storage failed');

      // Waits for promises to resolve.
      await Promise.resolve();

      expect(dispatchMock).to.not.have.been.called;
    });

  }); // describe('getGames')

  describe('addNewGame', () => {
    it('should return a function to dispatch the action', () => {
      expect(typeof actions.addNewGame()).to.equal('function');
    });

    it('should do nothing if new game is missing', () => {
      const dispatchMock = sinon.stub();
      const getStateMock = sinon.stub();

      actions.addNewGame()(dispatchMock, getStateMock, undefined);

      expect(getStateMock).to.not.have.been.called;

      expect(dispatchMock).to.not.have.been.called;
    });

    it('should dispatch an action to add a new game that is unique', () => {
      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState([getStoredGame()]);

      actions.addNewGame(getNewGameMetadata())(dispatchMock, getStateMock, undefined);

      expect(getStateMock).to.have.been.called;

      expect(dispatchMock).to.have.been.calledWith(sinon.match.instanceOf(Function));
    });

    it('should do nothing with a new game that is not unique', () => {
      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState([getNewGameSaved()]);

      actions.addNewGame(getNewGameMetadata())(dispatchMock, getStateMock, undefined);

      expect(getStateMock).to.have.been.called;

      expect(dispatchMock).to.not.have.been.called;
    });
  });  // describe('addNewGame')

  describe('saveGame', () => {
    it('should return a function to dispatch the action', () => {
      expect(typeof actions.saveGame()).to.equal('function');
    });

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
      actions.saveGame(inputGame)(dispatchMock, getStateMock, undefined);

      // Checks that the new game was saved to the database.
      expect(saveNewDocumentStub).calledOnceWith(
        inputGame, KEY_GAMES, undefined, sinon.match.object, { addTeamId: true, addUserId: true });
      expect(inputGame, 'Input game should have properties set by saving').to.deep.equal(expectedSavedGame);

      expect(dispatchMock).to.have.been.calledWith({
        type: actions.ADD_GAME,
        game: expectedSavedGame,
      });

      // Waits for promises to resolve.
      await Promise.resolve();
    });

    it('should not dispatch an action when storage access fails', async () => {
      const dispatchMock = sinon.stub();
      const getStateMock = sinon.stub();

      writerStub.saveNewDocument.onFirstCall().throws(() => { return new Error('Storage failed with some error'); });

      expect(() => {
        actions.saveGame(getNewGameMetadata())(dispatchMock, getStateMock, undefined);
      }).to.throw('Storage failed');

      // Waits for promises to resolve.
      await Promise.resolve();

      expect(dispatchMock).to.not.have.been.called;
    });
  }); // describe('saveGame')

  describe('addGame', () => {
    it('should dispatch an action to add the team', () => {
      const newGameSaved = getNewGameSaved();

      expect(actions.addGame(newGameSaved)).to.deep.equal({
        type: actions.ADD_GAME,
        game: newGameSaved,
      });
    });
  }); // describe('addGame')
}); // describe('Game actions')
