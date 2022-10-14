import { FormationBuilder, FormationType, getPositions, Position } from '@app/models/formation.js';
import { SetupStatus, SetupSteps } from '@app/models/game.js';
import { getPlayer, LivePlayer } from '@app/models/live.js';
import { PlayerStatus } from '@app/models/player.js';
import { startersCompletedCreator } from '@app/slices/live/live-action-creators.js';
import { applyStarter, cancelStarter, invalidStarters, live, LiveState, selectStarter, selectStarterPosition, startersCompleted } from '@app/slices/live/live-slice.js';
import { RootState } from '@app/store.js';
import { expect } from '@open-wc/testing';
import sinon from 'sinon';
import { buildLiveStateWithCurrentGame, buildSetupTasks, getGame, selectPlayers } from '../../helpers/live-state-setup.js';
import * as testlive from '../../helpers/test-live-game-data.js';
import { getNewPlayer } from '../../helpers/test_data.js';

function mockGetState(currentState: LiveState) {
  return sinon.fake(() => {
    const mockState: RootState = {
      live: currentState
    };
    return mockState;
  });
}

describe('Live slice: Setup actions', () => {
  describe('Starters', () => {
    let currentState: LiveState;
    let gameId: string;
    const formationType = FormationType.F4_3_3;

    afterEach(() => {
      currentState = {} as LiveState;
      gameId = '';
    });

    function setupStarterState(openPositions?: string[] | 'all') {
      const game = testlive.getLiveGameWithPlayers();
      game.formation = { type: formationType };

      // Set the first 11 players as starters, unless their position is left open.
      for (let i = 0; i < 11; i++) {
        const player = getPlayer(game, `P${i}`)!;
        if (openPositions === 'all' || openPositions?.includes(player.currentPosition?.id!)) {
          continue;
        }
        player.status = PlayerStatus.On;
      }

      currentState = buildLiveStateWithCurrentGame(
        game);
      gameId = game.id;
    }

    describe('live/selectStarter', () => {
      let selectedStarter: LivePlayer;

      beforeEach(() => {
        selectedStarter = testlive.getLivePlayer();
        const game = testlive.getLiveGameWithPlayers();
        currentState = buildLiveStateWithCurrentGame(game);
        gameId = game.id;
      });

      it('should only set selectedStarterPlayer with nothing selected', () => {
        expect(currentState.selectedStarterPlayer).to.be.undefined;

        const newState = live(currentState, selectStarter(gameId, selectedStarter.id, true));

        const expectedGame = testlive.getLiveGameWithPlayers();
        selectPlayers(expectedGame, [selectedStarter.id], true);
        const expectedState = buildLiveStateWithCurrentGame(
          expectedGame,
          {
            selectedStarterPlayer: selectedStarter.id,
            proposedStarter: undefined
          });

        expect(newState).to.deep.include(expectedState);
      });

      it('should clear selectedStarterPlayer when de-selected', () => {
        const game = testlive.getLiveGameWithPlayers();
        selectPlayers(game, [selectedStarter.id], true);
        const state: LiveState = buildLiveStateWithCurrentGame(
          game, {
          selectedStarterPlayer: selectedStarter.id
        });

        const newState = live(state, selectStarter(gameId, selectedStarter.id, false));

        const expectedGame = testlive.getLiveGameWithPlayers();
        selectPlayers(expectedGame, [selectedStarter.id], false);
        const expectedState = buildLiveStateWithCurrentGame(
          expectedGame,
          {
            selectedStarterPlayer: undefined,
            proposedStarter: undefined
          });

        expect(newState).to.deep.include(expectedState);
      });

      it('should set selectedStarterPlayer and propose starter with position selected', () => {
        const selectedPosition: Position = { id: 'AM1', type: 'AM' };

        currentState.selectedStarterPosition = { ...selectedPosition };
        expect(currentState.selectedStarterPlayer).to.be.undefined;

        const newState = live(currentState, selectStarter(gameId, selectedStarter.id, true));

        const starter: LivePlayer = {
          ...selectedStarter,
          selected: true,
          currentPosition: { ...selectedPosition }
        }

        const expectedGame = testlive.getLiveGameWithPlayers();
        selectPlayers(expectedGame, [selectedStarter.id], true);
        const expectedState = buildLiveStateWithCurrentGame(
          expectedGame,
          {
            selectedStarterPosition: { ...selectedPosition },
            selectedStarterPlayer: selectedStarter.id,
            proposedStarter: starter
          });

        expect(newState).to.deep.include(expectedState);
      });
    }); // describe('live/selectStarter')

    describe('live/selectStarterPosition', () => {

      it('should only set selectedPosition with nothing selected', () => {
        const game = testlive.getLiveGameWithPlayers();
        const state = buildLiveStateWithCurrentGame(game);
        expect(state.selectedStarterPosition).to.be.undefined;

        const selectedPosition: Position = { id: 'AM1', type: 'AM' };
        const newState = live(state, selectStarterPosition(game.id, selectedPosition));

        const expectedState = buildLiveStateWithCurrentGame(
          testlive.getLiveGameWithPlayers(),
          {
            selectedStarterPosition: { ...selectedPosition },
            proposedStarter: undefined
          });

        expect(newState).to.deep.include(expectedState);
      });

      it('should set selectedPosition and propose starter with player selected', () => {
        const selectedPlayer = testlive.getLivePlayer();
        const selectedPosition: Position = { id: 'AM1', type: 'AM' };

        const game = testlive.getLiveGameWithPlayers();
        selectPlayers(game, [selectedPlayer.id], true);
        const state = buildLiveStateWithCurrentGame(
          game, {
          selectedStarterPlayer: selectedPlayer.id,
        });
        expect(state.selectedStarterPosition).to.be.undefined;

        const newState = live(state, selectStarterPosition(game.id, selectedPosition));

        const starter: LivePlayer = {
          ...selectedPlayer,
          selected: true,
          currentPosition: { ...selectedPosition }
        }
        const expectedGame = testlive.getLiveGameWithPlayers();
        selectPlayers(expectedGame, [selectedPlayer.id], true);
        const expectedState = buildLiveStateWithCurrentGame(
          expectedGame, {
          selectedStarterPlayer: selectedPlayer.id,
          selectedStarterPosition: { ...selectedPosition },
          proposedStarter: starter
        });

        expect(newState).to.deep.include(expectedState);
      });
    }); // describe('live/selectStarterPosition')

    describe('live/applyStarter', () => {
      let selectedPlayer: LivePlayer;
      let selectedPosition: Position;

      beforeEach(() => {
        selectedPlayer = testlive.getLivePlayer();
        selectedPosition = { id: 'AM1', type: 'AM' };
        const starter: LivePlayer = {
          ...selectedPlayer,
          currentPosition: { ...selectedPosition }
        }

        const game = testlive.getLiveGameWithPlayers();
        gameId = game.id;
        selectPlayers(game, [selectedPlayer.id], true);
        currentState = buildLiveStateWithCurrentGame(
          game,
          {
            selectedStarterPlayer: selectedPlayer.id,
            selectedStarterPosition: { ...selectedPosition },
            proposedStarter: starter
          });
      });

      it('should set live player to ON with currentPosition', () => {
        const newState: LiveState = live(currentState, applyStarter(gameId));

        const newGame = getGame(newState, gameId)!;
        const newPlayer = getPlayer(newGame, selectedPlayer.id);
        expect(newPlayer).to.not.be.undefined;
        expect(newPlayer).to.deep.include({
          id: selectedPlayer.id,
          status: PlayerStatus.On,
          currentPosition: { ...selectedPosition }
        });
        expect(newPlayer!.selected, 'Player should no longer be selected').to.not.be.ok;
      });

      it('should clear selected starter player/position and proposed starter', () => {
        const newState = live(currentState, applyStarter(gameId));

        expect(newState.selectedStarterPlayer).to.be.undefined;
        expect(newState.selectedStarterPosition).to.be.undefined;
        expect(newState.proposedStarter).to.be.undefined;
      });

      it('should replace starter already in the position', () => {
        const existingStarter: LivePlayer = {
          ...getNewPlayer(),
          status: PlayerStatus.On,
          currentPosition: { ...selectedPosition }
        }
        const currentGame = getGame(currentState, gameId)!;
        currentGame!.players!.push(existingStarter);

        const newState: LiveState = live(currentState, applyStarter(gameId));
        const newGame = getGame(newState, gameId)!;

        expect(newGame.players).to.not.be.undefined;
        const newPlayers = newGame.players!;

        const newPlayer = newPlayers.find(player => (player.id === selectedPlayer.id));
        expect(newPlayer).to.not.be.undefined;
        expect(newPlayer).to.deep.include({
          id: selectedPlayer.id,
          status: PlayerStatus.On,
          currentPosition: { ...selectedPosition }
        });
        expect(newPlayer!.selected, 'Player should no longer be selected').to.not.be.ok;

        const replacedPlayer = newPlayers.find(player => (player.id === existingStarter.id));
        expect(replacedPlayer).to.not.be.undefined;
        expect(replacedPlayer).to.include({
          id: existingStarter.id,
          status: PlayerStatus.Off,
        });
        expect(replacedPlayer!.currentPosition).to.be.undefined;
      });

      it('should do nothing if proposed starter is missing', () => {
        const game = testlive.getLiveGameWithPlayers();
        selectPlayers(game, [selectedPlayer.id], true);
        currentState = buildLiveStateWithCurrentGame(game);
        const newState = live(currentState, applyStarter(gameId));

        expect(newState).to.equal(currentState);
      });
    }); // describe('live/applyStarter')

    describe('live/cancelStarter', () => {
      let selectedPlayer: LivePlayer;
      let selectedPosition: Position;

      beforeEach(() => {
        selectedPlayer = testlive.getLivePlayer();
        selectedPosition = { id: 'AM1', type: 'AM' };
        const starter: LivePlayer = {
          ...selectedPlayer,
          currentPosition: { ...selectedPosition }
        }

        const game = testlive.getLiveGameWithPlayers();
        gameId = game.id;
        selectPlayers(game, [selectedPlayer.id], true);
        currentState = buildLiveStateWithCurrentGame(
          game,
          {
            selectedStarterPlayer: selectedPlayer.id,
            selectedStarterPosition: { ...selectedPosition },
            proposedStarter: starter
          }
        );
      });

      it('should clear selected player/position and proposed starter', () => {
        const newState = live(currentState, cancelStarter(gameId));

        const newGame = getGame(newState, gameId)!;
        const cancelledPlayer = getPlayer(newGame, selectedPlayer.id);
        expect(cancelledPlayer, 'cancelledPlayer').to.not.be.undefined;
        expect(cancelledPlayer!.selected, 'Player should no longer be selected').to.not.be.ok;

        expect(newState.selectedStarterPlayer).to.be.undefined;
        expect(newState.selectedStarterPosition).to.be.undefined;
        expect(newState.proposedStarter).to.be.undefined;
      });

      it('should do nothing if proposed starter is missing', () => {
        const game = testlive.getLiveGameWithPlayers();
        selectPlayers(game, [selectedPlayer.id], true);
        currentState = buildLiveStateWithCurrentGame(game);

        const newState = live(currentState, cancelStarter(gameId));

        expect(newState).to.equal(currentState);
      });
    }); // describe('live/cancelStarter')

    describe('live/startersCompleted', () => {

      it('should update setup tasks to mark starters complete', () => {
        const game = testlive.getLiveGameWithPlayers();
        const state = buildLiveStateWithCurrentGame(game);

        const expectedTasks = buildSetupTasks();
        expectedTasks[SetupSteps.Starters].status = SetupStatus.Complete;
        const expectedGame = testlive.getLiveGameWithPlayers();
        expectedGame.setupTasks = expectedTasks;
        const expectedState = buildLiveStateWithCurrentGame(expectedGame);

        const newState = live(state, startersCompleted(game.id));

        expect(newState).to.deep.include(expectedState);

        expect(newState).not.to.equal(state);
      });

      it('should clear any invalid starters', () => {
        const game = testlive.getLiveGameWithPlayers();
        const state = buildLiveStateWithCurrentGame(game);
        state.invalidStarters = ['GK'];

        const newState = live(state, startersCompleted(game.id));

        expect(newState.invalidStarters, 'Invalid starters should be cleared').not.to.be.ok;
      });

    }); // describe('live/startersCompleted')

    describe('live/invalidStarters', () => {
      beforeEach(() => {
        currentState = buildLiveStateWithCurrentGame(testlive.getLiveGameWithPlayers());
      });

      it('should save the invalid starters, when positions are left open', async () => {
        setupStarterState();

        const newState: LiveState = live(currentState, invalidStarters(
          gameId, ['AM1']));

        expect(newState.invalidStarters).to.deep.equal(['AM1']);
      });

    }); // describe('live/invalidStarters')

    describe('completed action creator', () => {
      it('should dispatch completed action, when all positions are filled correctly', async () => {
        setupStarterState();

        const dispatchMock = sinon.stub();
        const getStateMock = mockGetState(currentState);

        await startersCompletedCreator(gameId)(dispatchMock, getStateMock, undefined);

        expect(dispatchMock).to.have.callCount(1);

        expect(dispatchMock.lastCall).to.have.been.calledWith(
          startersCompleted(gameId));
      });

      it('should dispatch error with invalid starters, when no positions are filled', async () => {
        const formation = FormationBuilder.create(formationType);
        const allOpenPositions = getPositions(formation).map((position) => position.id);
        setupStarterState(allOpenPositions);

        const dispatchMock = sinon.stub();
        const getStateMock = mockGetState(currentState);

        await startersCompletedCreator(gameId)(dispatchMock, getStateMock, undefined);

        expect(dispatchMock).to.have.callCount(1);

        expect(dispatchMock.lastCall).to.have.been.calledWith(
          invalidStarters(gameId, allOpenPositions.sort()));
      });

      it('should dispatch error with invalid starters, when one position left open', async () => {
        setupStarterState(['GK']);

        const dispatchMock = sinon.stub();
        const getStateMock = mockGetState(currentState);

        await startersCompletedCreator(gameId)(dispatchMock, getStateMock, undefined);

        expect(dispatchMock).to.have.callCount(1);

        expect(dispatchMock.lastCall).to.have.been.calledWith(
          invalidStarters(gameId, ['GK']));
      });

    }); // describe('completed action creator')

  }); // describe('Starters')
});
