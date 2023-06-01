/** @format */

import { GameDetail } from '@app/models/game.js';
import { Player, Roster } from '@app/models/player.js';
import {
  copyRoster,
  gamePlayerAdded,
  gameReducer,
  GameState,
} from '@app/slices/game/game-slice.js';
import * as actions from '@app/slices/game/roster-logic.js';
import { reader } from '@app/storage/firestore-reader.js';
import { writer } from '@app/storage/firestore-writer.js';
import { expect } from '@open-wc/testing';
import sinon from 'sinon';
import {
  buildGameStateWithCurrentGame,
  buildInitialGameState,
} from '../../helpers/game-state-setup.js';
import { mockGetState } from '../../helpers/root-state-setup.js';
import {
  buildRoster,
  getNewGameDetail,
  getNewPlayer,
  getNewPlayerData,
  getOtherStoredPlayer,
  getStoredGame,
  getStoredPlayer,
  STORED_GAME_ID,
} from '../../helpers/test_data.js';

function getTeamRoster() {
  return buildRoster([getStoredPlayer(), getOtherStoredPlayer()]);
}

function getStoredGameDetail(): GameDetail {
  return {
    ...getStoredGame(),
    roster: getTeamRoster(),
  };
}

const KEY_GAMES = 'games';
const KEY_ROSTER = 'roster';
const KEY_TEAMS = 'teams';

describe('Game slice: roster actions', () => {
  let readerStub: sinon.SinonStubbedInstance<typeof reader>;
  let writerStub: sinon.SinonStubbedInstance<typeof writer>;

  beforeEach(() => {
    sinon.restore();

    readerStub = sinon.stub<typeof reader>(reader);
    writerStub = sinon.stub<typeof writer>(writer);
  });

  function mockLoadCollectionWithTeamRoster(teamId: string, roster: Roster) {
    return readerStub.loadCollection
      .withArgs(`${KEY_TEAMS}/${teamId}/roster`, sinon.match.object)
      .resolves(roster);
  }

  describe('copyRoster', () => {
    let currentState: GameState;
    let currentGame: GameDetail;

    beforeEach(() => {
      currentGame = getNewGameDetail();
    });

    it('should do nothing if game id is missing', async () => {
      const dispatchMock = sinon.stub();
      const getStateMock = sinon.stub();

      await actions.copyRoster(undefined as unknown as string)(
        dispatchMock,
        getStateMock,
        undefined
      );

      expect(readerStub.loadCollection, 'loadCollection').to.not.have.been.called;

      expect(dispatchMock).to.not.have.been.called;
    });

    it('should set copying flag', () => {
      currentState = buildInitialGameState();
      const gameId = 'agameid';
      const newState = gameReducer(currentState, {
        type: copyRoster.pending.type,
        meta: {
          gameId: gameId,
        },
      });

      expect(newState).to.include({
        rosterLoading: true,
        rosterFailure: false,
      });

      expect(newState).not.to.equal(currentState);
    });

    it('should do nothing when game id does not match loaded game', async () => {
      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState();

      const gameId = 'nosuchgame';
      await actions.copyRoster(gameId)(dispatchMock, getStateMock, undefined);

      expect(readerStub.loadCollection, 'loadCollection').to.not.have.been.called;

      // The request action is dispatched, regardless.
      expect(dispatchMock).to.have.callCount(2);

      expect(dispatchMock.lastCall).to.have.been.calledWith(
        sinon.match({
          type: copyRoster.rejected.type,
          error: { message: 'No existing game found for id: nosuchgame' },
        })
      );
    });

    it('should update only flags when roster already set', () => {
      currentGame.roster = buildRoster([getStoredPlayer()]);
      currentState = buildGameStateWithCurrentGame(currentGame, {
        rosterLoading: true,
      });

      const newState = gameReducer(currentState, {
        type: copyRoster.fulfilled.type,
        payload: {
          gameId: currentGame.id,
        },
      });

      const expectedState = buildGameStateWithCurrentGame(
        { ...currentGame },
        {
          rosterLoading: false,
          rosterFailure: false,
        }
      );

      expect(newState).to.deep.include(expectedState);
      expect(newState.games).to.equal(currentState.games);
    });

    it('should do nothing if game already loaded has a roster with players', async () => {
      const dispatchMock = sinon.stub();
      const loadedGame: GameDetail = {
        ...getStoredGameDetail(),
        hasDetail: true,
      };
      const getStateMock = mockGetState(buildGameStateWithCurrentGame(loadedGame));

      await actions.copyRoster(loadedGame.id)(dispatchMock, getStateMock, undefined);

      expect(readerStub.loadCollection, 'loadCollection').to.not.have.been.called;

      // The request action is dispatched, regardless.
      expect(dispatchMock).to.have.callCount(2);

      expect(dispatchMock.lastCall).to.have.been.calledWithMatch({
        type: copyRoster.fulfilled.type,
        payload: {
          gameId: loadedGame.id,
        },
      });
    });

    it('should dispatch success action with team roster copied to game in storage', async () => {
      const dispatchMock = sinon.stub();
      const loadedGame: GameDetail = {
        ...getStoredGameDetail(),
        hasDetail: true,
        roster: {},
      };
      const teamRoster = getTeamRoster();
      const rosterSize = Object.keys(teamRoster).length;

      const getStateMock = mockGetState(buildGameStateWithCurrentGame(loadedGame));

      const loadCollectionStub = mockLoadCollectionWithTeamRoster(loadedGame.teamId, teamRoster);
      const saveNewDocumentStub = writerStub.saveNewDocument.resolves();

      const gameId = loadedGame.id;
      await actions.copyRoster(gameId)(dispatchMock, getStateMock, undefined);

      expect(loadCollectionStub, 'loadCollection').to.have.callCount(1);

      // Checks that each player was saved to the game roster.
      expect(saveNewDocumentStub, 'saveNewDocument').to.have.callCount(rosterSize);
      Object.keys(teamRoster).forEach((key, index) => {
        expect(saveNewDocumentStub.getCall(index)).to.have.been.calledWith(
          teamRoster[key],
          `${KEY_GAMES}/${gameId}/roster`,
          sinon.match.object,
          undefined,
          { keepExistingId: true }
        );
      });
      expect(dispatchMock).to.have.callCount(2);

      // Checks that first dispatch was the request action
      expect(dispatchMock.firstCall).to.have.been.calledWith(
        sinon.match({
          type: copyRoster.pending.type,
          meta: {
            gameId: gameId,
          },
        })
      );

      expect(dispatchMock.lastCall).to.have.been.calledWith(
        sinon.match({
          type: copyRoster.fulfilled.type,
          payload: {
            gameId: gameId,
            gameRoster: { ...teamRoster },
          },
        })
      );
    });

    it('should set roster and update flags', () => {
      currentState = buildGameStateWithCurrentGame(currentGame);
      const rosterPlayers = [getStoredPlayer()];

      expect(
        Object.keys((currentState.games[currentGame.id] as GameDetail).roster),
        'roster should initially be empty'
      ).to.be.empty;

      const newState = gameReducer(currentState, {
        type: copyRoster.fulfilled.type,
        payload: {
          gameId: currentGame.id,
          gameRoster: buildRoster(rosterPlayers),
        },
      });

      const gameDetail: GameDetail = {
        ...currentGame,
        hasDetail: true,
        roster: buildRoster(rosterPlayers),
      };
      const expectedState = buildGameStateWithCurrentGame(gameDetail, {
        rosterLoading: false,
        rosterFailure: false,
      });

      expect(newState).to.deep.include(expectedState);
    });

    it('should dispatch rejected action when storage access fails', async () => {
      const dispatchMock = sinon.stub();
      const loadedGame: GameDetail = {
        ...getStoredGameDetail(),
        hasDetail: true,
        roster: {},
      };
      const getStateMock = mockGetState(buildGameStateWithCurrentGame(loadedGame));

      const gameId = loadedGame.id;

      readerStub.loadCollection.onFirstCall().throws(() => {
        return new Error('Storage failed with some error');
      });

      await actions.copyRoster(gameId)(dispatchMock, getStateMock, undefined);

      expect(dispatchMock).to.have.callCount(2);

      // Checks that first dispatch was the request action
      expect(dispatchMock).to.have.been.calledWith(
        sinon.match({
          type: copyRoster.pending.type,
          meta: {
            gameId: gameId,
          },
        })
      );

      expect(dispatchMock.lastCall).to.have.been.calledWith(
        sinon.match({
          type: copyRoster.rejected.type,
          error: { message: 'Storage failed with some error' },
        })
      );
    });

    it('should set failure flag and error message', () => {
      currentState = buildInitialGameState();

      const newState = gameReducer(currentState, {
        type: copyRoster.rejected.type,
        error: { message: 'What a roster failure!' },
      });

      expect(newState).to.include({
        error: 'What a roster failure!',
        rosterLoading: false,
        rosterFailure: true,
      });

      expect(newState.error).not.to.equal(currentState.error);
    });
  }); // describe('copyRoster')

  describe('addNewGamePlayer', () => {
    it('should do nothing if new player is missing', () => {
      const dispatchMock = sinon.stub();
      const getStateMock = sinon.stub();

      actions.addNewGamePlayer(
        /*gameId=*/ undefined as unknown as string,
        /*newPlayer=*/ undefined as unknown as Player
      )(dispatchMock, getStateMock, undefined);

      expect(getStateMock).to.not.have.been.called;

      expect(dispatchMock).to.not.have.been.called;
    });

    it('should dispatch an action to add a new player that is unique', () => {
      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState(buildGameStateWithCurrentGame(getStoredGameDetail()));

      actions.addNewGamePlayer(STORED_GAME_ID, getNewPlayer())(
        dispatchMock,
        getStateMock,
        undefined
      );

      expect(getStateMock).to.have.been.called;

      expect(dispatchMock).to.have.been.calledWith(sinon.match.func);
    });

    it('should do nothing with a new player that is not unique', () => {
      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState(buildGameStateWithCurrentGame(getStoredGameDetail()));

      actions.addNewGamePlayer(STORED_GAME_ID, getStoredPlayer())(
        dispatchMock,
        getStateMock,
        undefined
      );

      expect(getStateMock).to.have.been.called;

      expect(dispatchMock).to.not.have.been.called;
    });
  }); // describe('addNewGamePlayer')

  describe('saveGamePlayer', () => {
    it('should save to storage and dispatch an action to add player', async () => {
      const expectedId = 'randomGamePlayerID68097';
      const expectedSavedPlayer: Player = {
        ...getNewPlayerData(),
        id: expectedId,
      };

      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState(buildGameStateWithCurrentGame(getStoredGameDetail()));
      const saveNewDocumentStub = writerStub.saveNewDocument.callsFake((model) => {
        model.id = expectedId;
        return Promise.resolve();
      });

      const inputPlayer = getNewPlayer();
      await actions.saveGamePlayer(STORED_GAME_ID, inputPlayer)(
        dispatchMock,
        getStateMock,
        undefined
      );

      // Checks that the new player was saved to the database.
      expect(saveNewDocumentStub).calledOnceWith(
        inputPlayer,
        `${KEY_GAMES}/${STORED_GAME_ID}/${KEY_ROSTER}`,
        sinon.match.object
      );
      expect(inputPlayer, 'Input player should have properties set by saving').to.deep.equal(
        expectedSavedPlayer
      );

      // Waits for promises to resolve.
      await Promise.resolve();
      expect(dispatchMock).to.have.been.calledWith(
        gamePlayerAdded(STORED_GAME_ID, expectedSavedPlayer)
      );
    });

    it('should not dispatch an action when storage access fails', async () => {
      const dispatchMock = sinon.stub();
      const getStateMock = mockGetState(buildGameStateWithCurrentGame(getStoredGameDetail()));
      writerStub.saveNewDocument.onFirstCall().throws(() => {
        return new Error('Storage failed with some error');
      });

      let rejected = false;
      try {
        await actions.saveGamePlayer(STORED_GAME_ID, getNewPlayer())(
          dispatchMock,
          getStateMock,
          undefined
        );
      } catch {
        rejected = true;
      }
      expect(rejected, 'saveGamePlayer should reject promise').to.be.true;

      expect(dispatchMock).to.not.have.been.called;
    });
  }); // describe('saveGamePlayer')

  describe('gamePlayerAdded', () => {
    let newPlayer: Player;
    let existingPlayer: Player;
    let currentState: GameState;
    let currentGame: GameDetail;
    let gameId: string;

    beforeEach(() => {
      newPlayer = getNewPlayer();
      existingPlayer = getStoredPlayer();

      currentGame = getNewGameDetail();
      gameId = currentGame.id;
      currentState = buildGameStateWithCurrentGame(currentGame);
    });

    it('should add new player to empty roster', () => {
      const newState = gameReducer(currentState, gamePlayerAdded(gameId, newPlayer));

      const expectedGame = {
        ...currentGame,
        roster: buildRoster([newPlayer]),
      };
      const expectedState = buildGameStateWithCurrentGame(expectedGame);
      expect(newState).to.deep.include(expectedState);
    });

    it('should add new player to roster with existing players', () => {
      currentGame.roster = buildRoster([existingPlayer]);
      currentState = buildGameStateWithCurrentGame(currentGame);

      const newState = gameReducer(currentState, gamePlayerAdded(gameId, newPlayer));

      const expectedGame = {
        ...currentGame,
        roster: buildRoster([existingPlayer, newPlayer]),
      };
      const expectedState = buildGameStateWithCurrentGame(expectedGame);
      expect(newState).to.deep.include(expectedState);
    });
  }); // describe('gamePlayerAdded')
}); // describe('Game slice: roster actions')
