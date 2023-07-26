/** @format */

import { Position } from '@app/models/formation.js';
import { GameDetail, GameStatus } from '@app/models/game.js';
import { LiveGame, LivePlayer, PeriodStatus, getPlayer } from '@app/models/live.js';
import { PlayerStatus } from '@app/models/player.js';
import { getGame as getGameCreator } from '@app/slices/game/game-slice.js';
import { live } from '@app/slices/live/composed-reducer.js';
import { startPeriodCreator } from '@app/slices/live/index.js';
import { LiveState, actions } from '@app/slices/live/live-slice.js';
import { RootState } from '@app/store.js';
import { expect } from '@open-wc/testing';
import sinon from 'sinon';
import {
  buildClock,
  buildClockWithTimer,
  buildInitialLiveState,
  buildLiveGameWithSetupTasks,
  buildLiveGameWithSetupTasksAndPlayers,
  buildLiveStateWithCurrentGame,
  buildShiftWithTrackers,
  getGame,
  getTrackerMap,
} from '../../helpers/live-state-setup.js';
import * as testlive from '../../helpers/test-live-game-data.js';
import { buildRoster, getFakeAction, getNewGame, getStoredGame } from '../../helpers/test_data.js';

const {
  cancelSub,
  cancelSwap,
  confirmSub,
  confirmSwap,
  endPeriod,
  gameCompleted,
  selectPlayer,
  startPeriod,
} = actions;

function buildLiveGameWithPlayers(): LiveGame {
  return testlive.getLiveGameWithPlayers();
}

function buildSwapPlayerPlaceholder(onPlayer: LivePlayer, position: Position) {
  const swap: LivePlayer = {
    ...onPlayer,
    nextPosition: { ...position },
    isSwap: true,
  };
  return swap;
}

function mockGetState(currentState: LiveState) {
  return sinon.fake(() => {
    const mockState: RootState = {
      live: currentState,
    };
    return mockState;
  });
}

describe('Live slice', () => {
  it('should return the initial state', () => {
    expect(live(undefined, getFakeAction())).to.deep.equal(buildInitialLiveState());
  });

  describe('game/getGame', () => {
    let currentState: LiveState;

    beforeEach(() => {
      currentState = buildInitialLiveState();
    });

    it('should set live game to given game with full detail', () => {
      const expectedGame = buildLiveGameWithSetupTasksAndPlayers();
      expectedGame.clock = buildClock();
      const expectedState = buildLiveStateWithCurrentGame(expectedGame);

      const existingGame = getStoredGame();
      const inputGame: GameDetail = {
        ...existingGame,
        hasDetail: true,
        roster: buildRoster(expectedGame.players),
      };

      const newState = live(currentState, getGameCreator.fulfilled(inputGame, 'unused', 'unused'));

      expect(newState).to.deep.include(expectedState);

      expect(getGame(newState, inputGame.id)).not.to.equal(getGame(currentState, inputGame.id));
    });

    it('should initialize live game for new game', () => {
      const currentGame = getNewGame();
      const inputGame: GameDetail = {
        ...currentGame,
        roster: {},
      };

      const expectedGame = buildLiveGameWithSetupTasks();
      expectedGame.id = currentGame.id;
      expectedGame.clock = buildClock();
      const expectedState = buildLiveStateWithCurrentGame(expectedGame);

      const newState = live(currentState, getGameCreator.fulfilled(inputGame, 'unused', 'unused'));

      expect(newState).to.deep.include(expectedState);

      expect(getGame(newState, inputGame.id)).not.to.equal(getGame(currentState, inputGame.id));
    });
  }); // describe('game/getGame')

  describe('live/selectPlayer', () => {
    const selectedPlayerId = 'P0';
    let currentState: LiveState;
    let selectedPlayer: LivePlayer;
    let gameId: string;

    beforeEach(() => {
      selectedPlayer = testlive.getLivePlayer();

      const game = buildLiveGameWithPlayers();
      gameId = game.id;
      currentState = buildLiveStateWithCurrentGame(game);
    });

    function setPlayerStatus(game: LiveGame, playerId: string, status: PlayerStatus) {
      const player = game.players!.find((p) => p.id === playerId);
      if (player) {
        player.status = status;
      }
    }

    function buildLiveGameForSelected(
      status: PlayerStatus,
      selected: boolean,
      playerId?: string
    ): LiveGame {
      const game = buildLiveGameWithPlayers();
      const lookupId = playerId || selectedPlayerId;
      const player = game.players!.find((p) => p.id === lookupId);
      if (player) {
        player.status = status;
        player.selected = selected;
      }
      return game;
    }

    function setTrackedPlayer(state: LiveState, status: PlayerStatus) {
      switch (status) {
        case PlayerStatus.Off:
          state.selectedOffPlayer = selectedPlayerId;
          break;
        case PlayerStatus.On:
          state.selectedOnPlayer = selectedPlayerId;
          break;
        default:
        // Ignore other statuses.
      }
    }

    const trackedStatuses = [PlayerStatus.On, PlayerStatus.Off];
    const flagOnlyStatuses = [PlayerStatus.Next, PlayerStatus.Out];

    it('All statuses are covered by selected tests', () => {
      expect(
        trackedStatuses.length + flagOnlyStatuses.length,
        'Selected tests for every status'
      ).to.equal(Object.values(PlayerStatus).length);
    });

    for (const status of trackedStatuses) {
      // eslint-disable-next-line no-loop-func
      describe(`Status: ${status}`, () => {
        beforeEach(async () => {
          setPlayerStatus(getGame(currentState, gameId)!, selectedPlayer.id, status);
        });

        it(`should only set selectedPlayer with no other player selected`, () => {
          const newState = live(currentState, selectPlayer(gameId, selectedPlayer.id, true));

          const expectedState = buildLiveStateWithCurrentGame(
            buildLiveGameForSelected(status, true)
          );
          setTrackedPlayer(expectedState, status);

          expect(newState).to.deep.include(expectedState);
        });

        it(`should clear selectedPlayer when de-selected`, () => {
          const state = buildLiveStateWithCurrentGame(buildLiveGameForSelected(status, true));
          setTrackedPlayer(state, status);

          const expectedState = buildLiveStateWithCurrentGame(
            buildLiveGameForSelected(status, false)
          );

          const newState = live(state, selectPlayer(gameId, selectedPlayer.id, false));

          expect(newState).to.deep.include(expectedState);

          expect(newState).not.to.equal(state);
        });
      });
    } // for (const status of trackedStatuses)

    for (const status of flagOnlyStatuses) {
      // eslint-disable-next-line no-loop-func
      describe(`Status: ${status}`, () => {
        beforeEach(async () => {
          setPlayerStatus(getGame(currentState, gameId)!, selectedPlayer.id, status);
        });

        it(`should select individual player only`, () => {
          const newState = live(currentState, selectPlayer(gameId, selectedPlayer.id, true));

          const expectedGame = buildLiveGameForSelected(status, true);

          expect(getGame(newState, gameId)).to.deep.include(expectedGame);
          expect(newState.selectedOffPlayer).to.be.undefined;
          expect(newState.selectedOnPlayer).to.be.undefined;
        });

        it(`should de-select individual player only`, () => {
          currentState.selectedOffPlayer = 'other off';
          currentState.selectedOnPlayer = 'other on';

          const newState = live(currentState, selectPlayer(gameId, selectedPlayer.id, false));

          const expectedGame = buildLiveGameForSelected(status, false);

          expect(getGame(newState, gameId)).to.deep.include(expectedGame);
          expect(newState).to.deep.include({
            selectedOffPlayer: 'other off',
            selectedOnPlayer: 'other on',
          });
        });
      });
    } // for (const status of flagOnlyStatuses)

    describe('Propose sub', () => {
      const offPlayerId = 'P1';
      const onPlayerId = 'P2';
      let offPlayer: LivePlayer;
      let onPlayer: LivePlayer;

      beforeEach(async () => {
        const game = getGame(currentState, gameId)!;
        offPlayer = getPlayer(game, offPlayerId)!;
        offPlayer.status = PlayerStatus.Off;
        onPlayer = getPlayer(game, onPlayerId)!;
        onPlayer.status = PlayerStatus.On;
      });

      it(`should propose sub when OFF player selected after ON player already selected`, () => {
        // Sets an already selected ON player.
        currentState.selectedOnPlayer = onPlayerId;
        onPlayer.selected = true;

        const newState = live(currentState, selectPlayer(gameId, offPlayerId, true));

        expect(newState.proposedSub).to.deep.include({
          ...offPlayer,
          selected: true,
          currentPosition: onPlayer.currentPosition,
          replaces: onPlayerId,
        });
      });

      it(`should propose sub when ON player selected after OFF player already selected`, () => {
        // Sets an already selected OFF player.
        currentState.selectedOffPlayer = offPlayerId;
        offPlayer.selected = true;

        const newState = live(currentState, selectPlayer(gameId, onPlayerId, true));

        expect(newState.proposedSub).to.deep.include({
          ...offPlayer,
          selected: true,
          currentPosition: onPlayer.currentPosition,
          replaces: onPlayerId,
        });
      });
    }); // describe('Propose sub')

    describe('Propose swap', () => {
      const positionPlayerId = 'P1';
      const onPlayerId = 'P2';
      let positionPlayer: LivePlayer;
      let onPlayer: LivePlayer;

      beforeEach(async () => {
        const currentGame = getGame(currentState, gameId)!;
        positionPlayer = getPlayer(currentGame, positionPlayerId)!;
        positionPlayer.status = PlayerStatus.On;
        onPlayer = getPlayer(currentGame, onPlayerId)!;
        onPlayer.status = PlayerStatus.On;
      });

      it('should propose swap when ON player selected after other ON player already selected', () => {
        // Sets an already selected ON player.
        currentState.selectedOnPlayer = onPlayerId;
        onPlayer.selected = true;

        const newState = live(currentState, selectPlayer(gameId, positionPlayerId, true));

        expect(newState.proposedSwap).to.deep.include({
          ...onPlayer,
          nextPosition: positionPlayer.currentPosition,
          isSwap: true,
        });
      });
    }); // describe('Propose swap')
  }); // describe('live/selectPlayer')

  describe('Proposed Subs', () => {
    const offPlayerId = 'P1';
    const onPlayerId = 'P2';
    const otherPositionPlayerId = 'P3';
    let offPlayer: LivePlayer;
    let onPlayer: LivePlayer;
    let otherPositionPlayer: LivePlayer;
    let currentState: LiveState;
    let gameId: string;

    beforeEach(async () => {
      const game = buildLiveGameWithPlayers();
      gameId = game.id;
      offPlayer = getPlayer(game, offPlayerId)!;
      offPlayer.status = PlayerStatus.Off;
      offPlayer.selected = true;
      onPlayer = getPlayer(game, onPlayerId)!;
      onPlayer.status = PlayerStatus.On;
      onPlayer.selected = true;
      otherPositionPlayer = getPlayer(game, otherPositionPlayerId)!;

      const sub: LivePlayer = {
        ...offPlayer,
        currentPosition: { ...onPlayer.currentPosition! },
        replaces: onPlayer.id,
      };

      currentState = buildLiveStateWithCurrentGame(game, {
        selectedOffPlayer: offPlayerId,
        selectedOnPlayer: onPlayerId,
        proposedSub: sub,
      });
    });

    describe('live/confirmSub', () => {
      it('should set off player to Next with currentPosition', () => {
        const newState: LiveState = live(currentState, confirmSub(gameId));
        const newGame = getGame(newState, gameId)!;

        expect(newGame.players).to.not.be.undefined;
        const newPlayers = newGame.players!;
        expect(newPlayers).not.to.equal(getGame(currentState, gameId)?.players);

        const newPlayer = newPlayers.find((player) => player.id === offPlayerId);
        expect(newPlayer).to.not.be.undefined;
        expect(newPlayer).to.deep.include({
          status: PlayerStatus.Next,
          currentPosition: { ...onPlayer.currentPosition },
          replaces: onPlayerId,
        });
        expect(newPlayer!.selected, 'Off player should no longer be selected').to.not.be.ok;
      });

      it('should set off player to Next with overridden position', () => {
        const newState: LiveState = live(
          currentState,
          confirmSub(gameId, otherPositionPlayer.currentPosition!)
        );
        const newGame = getGame(newState, gameId)!;

        expect(newGame.players).to.not.be.undefined;
        const newPlayers = newGame.players!;
        expect(newPlayers).not.to.equal(getGame(currentState, gameId)?.players);

        const newPlayer = newPlayers.find((player) => player.id === offPlayerId);
        expect(newPlayer).to.not.be.undefined;
        expect(newPlayer).to.deep.include({
          status: PlayerStatus.Next,
          currentPosition: { ...otherPositionPlayer.currentPosition },
          replaces: onPlayerId,
        });
        expect(newPlayer!.selected, 'Off player should no longer be selected').to.not.be.ok;
      });

      it('should clear selected players and proposed sub', () => {
        const newState = live(currentState, confirmSub(gameId));
        const newGame = getGame(newState, gameId)!;

        expect(newGame.players).to.not.be.undefined;

        const newPlayer = newGame.players?.find((player) => player.id === onPlayerId);
        expect(newPlayer).to.not.be.undefined;
        expect(newPlayer!.selected, 'On player should no longer be selected').to.not.be.ok;

        expect(newState.selectedOffPlayer).to.be.undefined;
        expect(newState.selectedOnPlayer).to.be.undefined;
        expect(newState.proposedSub).to.be.undefined;
      });

      it('should do nothing if proposed sub is missing', () => {
        currentState = buildLiveStateWithCurrentGame(buildLiveGameWithPlayers());
        const newState = live(currentState, confirmSub(gameId));

        expect(newState).to.equal(currentState);
      });
    }); // describe('live/confirmSub')

    describe('live/cancelSub', () => {
      it('should clear selected players and proposed sub', () => {
        const newState = live(currentState, cancelSub(gameId));
        const newGame = getGame(newState, gameId)!;

        const cancelledOffPlayer = newGame?.players?.find((player) => player.id === offPlayerId);
        expect(cancelledOffPlayer).to.not.be.undefined;
        expect(cancelledOffPlayer!.selected, 'Off player should no longer be selected').to.not.be
          .ok;

        const cancelledOnPlayer = newGame?.players?.find((player) => player.id === onPlayerId);
        expect(cancelledOnPlayer).to.not.be.undefined;
        expect(cancelledOnPlayer!.selected, 'On player should no longer be selected').to.not.be.ok;

        expect(newState.selectedOffPlayer).to.be.undefined;
        expect(newState.selectedOnPlayer).to.be.undefined;
        expect(newState.proposedSub).to.be.undefined;
      });

      it('should do nothing if proposed sub is missing', () => {
        currentState = buildLiveStateWithCurrentGame(buildLiveGameWithPlayers());

        const newState = live(currentState, cancelSub(gameId));

        expect(newState).to.equal(currentState);
      });
    }); // describe('live/cancelSub')
  }); // describe('Proposed Subs')

  describe('Proposed Swaps', () => {
    const positionPlayerId = 'P1';
    const onPlayerId = 'P2';
    const swapPlayerId = 'P2_swap';
    let positionPlayer: LivePlayer;
    let onPlayer: LivePlayer;
    let currentState: LiveState;
    let gameId: string;

    beforeEach(async () => {
      const game = buildLiveGameWithPlayers();
      gameId = game.id;
      positionPlayer = getPlayer(game, positionPlayerId)!;
      positionPlayer.status = PlayerStatus.On;
      positionPlayer.selected = true;
      onPlayer = getPlayer(game, onPlayerId)!;
      onPlayer.status = PlayerStatus.On;
      onPlayer.selected = true;

      const swap = buildSwapPlayerPlaceholder(onPlayer, positionPlayer.currentPosition!);

      currentState = buildLiveStateWithCurrentGame(game, {
        selectedOnPlayer: onPlayerId,
        selectedOnPlayer2: positionPlayerId,
        proposedSwap: swap,
      });
    });

    describe('live/confirmSwap', () => {
      it('should clone on player to Next as a swap', () => {
        const newState: LiveState = live(currentState, confirmSwap(gameId));
        const newGame = getGame(newState, gameId)!;

        expect(newGame.players).to.not.be.undefined;
        const newPlayers = newGame.players!;
        expect(newPlayers).not.to.equal(getGame(currentState, gameId)?.players);

        const newPlayer = getPlayer(newGame, onPlayerId);
        expect(newPlayer!.selected, 'On player should no longer be selected').to.not.be.ok;

        // Clone that is next to represent the swap
        const newNextPlayer = getPlayer(newGame, swapPlayerId);
        expect(newNextPlayer, 'Cloned player for swap').to.not.be.undefined;
        expect(newNextPlayer, 'Cloned player for swap').to.deep.include({
          status: PlayerStatus.Next,
          currentPosition: { ...onPlayer.currentPosition },
          nextPosition: { ...positionPlayer.currentPosition },
          isSwap: true,
          selected: false,
        });

        const newPositionPlayer = getPlayer(newGame, positionPlayerId);
        expect(newPositionPlayer!.selected, 'Position player should no longer be selected').to.not
          .be.ok;
      });

      it('should clear selected players and proposed swap', () => {
        const newState = live(currentState, confirmSwap(gameId));
        const newGame = getGame(newState, gameId)!;

        expect(newGame.players).to.not.be.undefined;

        const newPlayer = newGame.players?.find((player) => player.id === onPlayerId);
        expect(newPlayer).to.not.be.undefined;
        expect(newPlayer!.selected, 'On player should no longer be selected').to.not.be.ok;

        expect(newState.selectedOnPlayer).to.be.undefined;
        expect(newState.selectedOnPlayer2).to.be.undefined;
        expect(newState.proposedSwap).to.be.undefined;
      });

      it('should do nothing if proposed swap is missing', () => {
        currentState = buildLiveStateWithCurrentGame(buildLiveGameWithPlayers());

        const newState = live(currentState, confirmSwap(gameId));

        expect(newState).to.equal(currentState);
      });
    }); // describe('live/confirmSwap')

    describe('live/cancelSwap', () => {
      it('should clear selected players and proposed swap', () => {
        const newState = live(currentState, cancelSwap(gameId));
        const newGame = getGame(newState, gameId)!;

        const cancelledOnPlayer = newGame?.players?.find((player) => player.id === onPlayerId);
        expect(cancelledOnPlayer).to.not.be.undefined;
        expect(cancelledOnPlayer!.selected, 'On player should no longer be selected').to.not.be.ok;

        const cancelledPositionPlayer = newGame?.players?.find(
          (player) => player.id === positionPlayerId
        );
        expect(cancelledPositionPlayer).to.not.be.undefined;
        expect(cancelledPositionPlayer!.selected, 'Position player should no longer be selected').to
          .not.be.ok;

        expect(newState.selectedOnPlayer, 'selectedOnPlayer').to.be.undefined;
        expect(newState.selectedOnPlayer2, 'selectedOnPlayer2').to.be.undefined;
        expect(newState.proposedSwap, 'proposedSwap').to.be.undefined;
      });

      it('should do nothing if proposed swap is missing', () => {
        currentState = buildLiveStateWithCurrentGame(buildLiveGameWithPlayers());

        const newState = live(currentState, cancelSwap(gameId));

        expect(newState).to.equal(currentState);
      });
    }); // describe('live/cancelSwap')
  }); // describe('Proposed Swaps')

  describe('Clock', () => {
    const startTime = new Date(2016, 0, 1, 14, 0, 0).getTime();
    let currentState: LiveState;
    let gameId: string;
    let fakeClock: sinon.SinonFakeTimers;

    beforeEach(() => {
      fakeClock = sinon.useFakeTimers({ now: startTime });
      const game = buildLiveGameWithPlayers();
      game.clock = buildClockWithTimer();
      gameId = game.id;
      currentState = buildLiveStateWithCurrentGame(game, {
        shift: buildShiftWithTrackers(gameId),
      });
    });

    afterEach(async () => {
      sinon.restore();
      if (fakeClock) {
        fakeClock.restore();
      }
    });

    const startAllowedStatuses = [GameStatus.Start, GameStatus.Break];
    const endAllowedStatuses = [GameStatus.Live];
    const otherStatuses = [GameStatus.New, GameStatus.Done];

    it('All statuses are covered by start/end period tests', () => {
      expect(
        startAllowedStatuses.length + endAllowedStatuses.length + otherStatuses.length,
        'Start/end period tests for every status'
      ).to.equal(Object.values(GameStatus).length);
    });

    describe('live/startPeriod', () => {
      for (const status of startAllowedStatuses) {
        // eslint-disable-next-line no-loop-func
        it(`should dispatch action allow start = true when game is in ${status} status`, async () => {
          getGame(currentState, gameId)!.status = status;

          const dispatchMock = sinon.stub();
          const getStateMock = mockGetState(currentState);

          await startPeriodCreator(gameId)(dispatchMock, getStateMock, undefined);

          // The request action is dispatched, regardless.
          expect(dispatchMock).to.have.callCount(1);

          expect(dispatchMock.lastCall).to.have.been.calledWith(
            startPeriod(gameId, /*gameAllowsStart=*/ true, /*currentPeriod=*/ 1, startTime)
          );
        });

        // eslint-disable-next-line no-loop-func
        it(`should change game status from ${status} to Live`, () => {
          const currentGame = getGame(currentState, gameId)!;
          currentGame.status = status;

          const newState = live(
            currentState,
            startPeriod(currentGame.id, /*gameAllowsStart=*/ true, /*currentPeriod=*/ 1, startTime)
          );

          const newGame = getGame(newState, gameId)!;
          expect(newGame.status).to.equal(GameStatus.Live);
          expect(newGame.clock?.periodStatus).to.equal(PeriodStatus.Running);
          const newTrackerMap = getTrackerMap(newState.shift!, currentGame.id);
          expect(newTrackerMap?.clockRunning).to.be.true;
        });

        // eslint-disable-next-line no-loop-func
        it(`should dispatch action allow start = false when already at last period in ${status} status`, async () => {
          const currentGame = getGame(currentState, gameId)!;
          currentGame.status = status;
          currentGame.clock!.currentPeriod = 2;
          currentGame.clock!.totalPeriods = 2;

          const dispatchMock = sinon.stub();
          const getStateMock = mockGetState(currentState);

          await startPeriodCreator(gameId)(dispatchMock, getStateMock, undefined);

          // The request action is dispatched, regardless.
          expect(dispatchMock).to.have.callCount(1);

          expect(dispatchMock.lastCall).to.have.been.calledWith(
            startPeriod(gameId, /*gameAllowsStart=*/ false)
          );
        });
      }

      const startInvalidStatuses = endAllowedStatuses.concat(otherStatuses);

      for (const status of startInvalidStatuses) {
        // eslint-disable-next-line no-loop-func
        it(`should dispatch action allow start = false when game is in ${status} status`, async () => {
          getGame(currentState, gameId)!.status = status;

          const dispatchMock = sinon.stub();
          const getStateMock = mockGetState(currentState);

          await startPeriodCreator(gameId)(dispatchMock, getStateMock, undefined);

          // The request action is dispatched, regardless.
          expect(dispatchMock).to.have.callCount(1);

          expect(dispatchMock.lastCall).to.have.been.calledWith(
            startPeriod(gameId, /*gameAllowsStart=*/ false)
          );
        });

        // eslint-disable-next-line no-loop-func
        it(`should do nothing when game is in ${status} status`, () => {
          const currentGame = getGame(currentState, gameId)!;
          currentGame.status = status;

          const newState = live(
            currentState,
            startPeriod(currentGame.id, /*gameAllowsStart=*/ false)
          );

          expect(getGame(newState, gameId)?.status).to.equal(status);
          expect(newState).to.equal(currentState);
        });
      }
    }); // describe('live/startPeriod')

    describe('live/endPeriod', () => {
      it(`should change game status to Break for first period (first half)`, () => {
        const currentGame = getGame(currentState, gameId)!;
        currentGame.status = GameStatus.Live;
        currentGame.clock!.currentPeriod = 1;
        currentGame.clock!.periodStatus = PeriodStatus.Running;
        const currentTrackerMap = getTrackerMap(currentState.shift!, currentGame.id);
        currentTrackerMap!.clockRunning = true;

        const newState = live(
          currentState,
          endPeriod(currentGame.id, /*gameAllowsEnd=*/ true, /*currentPeriod=*/ 1, startTime)
        );

        const newGame = getGame(newState, gameId)!;
        expect(newGame.status).to.equal(GameStatus.Break);
        expect(newGame.clock?.periodStatus).to.equal(PeriodStatus.Pending);
        const newTrackerMap = getTrackerMap(newState.shift!, currentGame.id);
        expect(newTrackerMap?.clockRunning, 'clockRunning').to.be.false;
      });

      it(`should change game status to Break for middle period`, () => {
        const currentGame = getGame(currentState, gameId)!;
        currentGame.status = GameStatus.Live;
        currentGame.clock!.totalPeriods = 3;
        currentGame.clock!.currentPeriod = 2;
        currentGame.clock!.periodStatus = PeriodStatus.Running;

        const newState = live(
          currentState,
          endPeriod(currentGame.id, /*gameAllowsEnd=*/ true, /*currentPeriod=*/ 2, startTime)
        );

        expect(getGame(newState, gameId)?.status).to.equal(GameStatus.Break);
      });

      it(`should change game status to Done for last period (second half)`, () => {
        const currentGame = getGame(currentState, gameId)!;
        currentGame.status = GameStatus.Live;
        currentGame.clock!.currentPeriod = 2;
        currentGame.clock!.periodStatus = PeriodStatus.Running;

        const newState = live(
          currentState,
          endPeriod(currentGame.id, /*gameAllowsEnd=*/ true, /*currentPeriod=*/ 2, startTime)
        );

        expect(getGame(newState, gameId)?.status).to.equal(GameStatus.Done);
      });

      const endInvalidStatuses = startAllowedStatuses.concat(otherStatuses);

      for (const status of endInvalidStatuses) {
        // eslint-disable-next-line no-loop-func
        it(`should do nothing if game is in ${status} status`, () => {
          const currentGame = getGame(currentState, gameId)!;
          currentGame.status = status;

          const newState = live(currentState, endPeriod(currentGame.id, /*gameAllowsEnd=*/ false));

          expect(getGame(newState, gameId)?.status).to.equal(status);
          expect(newState).to.equal(currentState);
        });
      }
    }); // describe('live/endPeriod')
  }); // describe('Clock')

  describe('live/gameCompleted', () => {
    let currentState: LiveState;
    let gameId: string;

    beforeEach(() => {
      const game = buildLiveGameWithPlayers();
      gameId = game.id;
      game.clock = buildClockWithTimer();
      game.clock.totalPeriods = 4;
      game.clock.periodLength = 20;
      currentState = buildLiveStateWithCurrentGame(game);
    });

    afterEach(async () => {
      sinon.restore();
    });

    const completeAllowedStatuses = [GameStatus.Done];
    const otherStatuses = [GameStatus.New, GameStatus.Start, GameStatus.Break, GameStatus.Live];

    it('All statuses are covered by gameCompleted tests', () => {
      expect(
        completeAllowedStatuses.length + otherStatuses.length,
        'Game completed tests for every status'
      ).to.equal(Object.values(GameStatus).length);
    });

    it('should capture final data from Done status', () => {
      const currentGame = getGame(currentState, gameId)!;
      currentGame.status = GameStatus.Done;

      const newState = live(currentState, gameCompleted(currentGame.id));
      const newGame = getGame(newState, gameId)!;

      expect(newGame.status).to.equal(GameStatus.Done);
      expect(newGame.dataCaptured, 'liveGame.dataCaptured').to.be.true;
    });

    for (const status of otherStatuses) {
      // eslint-disable-next-line no-loop-func
      it(`should do nothing when game is in ${status} status`, () => {
        const currentGame = getGame(currentState, gameId)!;
        currentGame.status = status;

        const newState = live(currentState, gameCompleted(currentGame.id));

        expect(getGame(newState, gameId)?.status).to.equal(status);
        expect(newState).to.equal(currentState);
      });
    }
  }); // describe('live/gameCompleted')
});
