import { Duration } from '@app/models/clock.js';
import { GameStatus } from '@app/models/game.js';
import { PeriodStatus, SetupSteps } from '@app/models/live.js';
import { configurePeriods, live, LiveState, startPeriod, endPeriod, toggleClock, markPeriodOverdue } from '@app/slices/live/live-slice.js';
import { expect } from '@open-wc/testing';
import sinon from 'sinon';
import { buildClock, buildClockWithTimer, buildLiveGameWithSetupTasksAndPlayers, buildLiveStateWithCurrentGame, buildShiftWithTrackersFromGame, getGame } from '../../helpers/live-state-setup.js';
import { buildRunningTimer, buildStoppedTimer } from '../../helpers/test-clock-data.js';
import * as testlive from '../../helpers/test-live-game-data.js';

describe('Live slice: Clock actions', () => {
  const startTime = new Date(2016, 0, 1, 14, 0, 0).getTime();
  const timeStartPlus5 = new Date(2016, 0, 1, 14, 0, 5).getTime();
  const timeStartPlus10 = new Date(2016, 0, 1, 14, 0, 10).getTime();
  const timeStartPlus1Minute55 = new Date(2016, 0, 1, 14, 1, 55).getTime();
  const timeStartPlus15Minutes = new Date(2016, 0, 1, 14, 15, 0).getTime();
  let fakeClock: sinon.SinonFakeTimers;

  afterEach(async () => {
    sinon.restore();
    if (fakeClock) {
      fakeClock.restore();
    }
  });

  function mockTimeProvider(t0: number) {
    fakeClock = sinon.useFakeTimers({ now: t0 });
  }

  describe('live/configurePeriods', () => {
    let currentState: LiveState;
    let gameId: string;

    beforeEach(() => {
      const game = testlive.getLiveGameWithPlayers();
      game.clock = buildClockWithTimer();
      currentState = buildLiveStateWithCurrentGame(game);
      gameId = game.id;
    });

    it('should set the period total/length', () => {
      const newState = live(currentState,
        configurePeriods(gameId, /*totalPeriods=*/1, /*periodLength=*/20));

      const newGame = getGame(newState, gameId);
      expect(newGame?.clock).to.deep.include({
        totalPeriods: 1,
        periodLength: 20
      });

      expect(newState).not.to.equal(currentState);
    });

    it('should update setup tasks to mark periods complete, in New status', () => {
      const game = buildLiveGameWithSetupTasksAndPlayers(
        /*lastCompletedStep=*/SetupSteps.Periods - 1);
      currentState = buildLiveStateWithCurrentGame(game);

      const expectedGame = buildLiveGameWithSetupTasksAndPlayers(
        /*lastCompletedStep=*/SetupSteps.Periods);
      expectedGame.clock = buildClock(undefined, {
        totalPeriods: 3,
        periodLength: 25
      });
      const expectedState = buildLiveStateWithCurrentGame(expectedGame);

      const newState = live(currentState, configurePeriods(gameId, /*totalPeriods=*/3, /*periodLength=*/25));

      expect(newState).to.deep.include(expectedState);

      expect(newState).not.to.equal(currentState);
    });

    it('should ignore setup tasks, after setup is complete', () => {
      const game = getGame(currentState, gameId)!;
      game.status = GameStatus.Start;

      const expectedGame = {
        ...game,
        clock: buildClock(buildStoppedTimer(), {
          totalPeriods: 3,
          periodLength: 25
        })
      };
      delete expectedGame.setupTasks;
      const expectedState = buildLiveStateWithCurrentGame(expectedGame);

      const newState = live(currentState, configurePeriods(gameId, /*totalPeriods=*/3, /*periodLength=*/25));

      expect(newState).to.deep.include(expectedState);

      expect(newState).not.to.equal(currentState);
    });

    it('should do nothing if totalPeriods is invalid', () => {
      const game = buildLiveGameWithSetupTasksAndPlayers(
        /*lastCompletedStep=*/SetupSteps.Periods - 1);
      currentState = buildLiveStateWithCurrentGame(game);

      const newState = live(currentState,
        configurePeriods(gameId, /*totalPeriods=*/0, /*periodLength=*/45));

      expect(newState).to.equal(currentState);
    });

    it('should do nothing if periodLength is invalid', () => {
      const newState = live(currentState,
        configurePeriods(gameId, /*totalPeriods=*/2, /*periodLength=*/5));

      expect(newState).to.equal(currentState);
    });

    it('should do nothing if already started', () => {
      const currentGame = getGame(currentState, gameId)!;
      currentGame.clock!.periodStatus = PeriodStatus.Running;

      const newState = live(currentState,
        configurePeriods(gameId, /*totalPeriods=*/2, /*periodLength=*/35));

      expect(newState).to.equal(currentState);
    });

    it('should do nothing if already on period 1', () => {
      const currentGame = getGame(currentState, gameId)!;
      currentGame.clock!.currentPeriod = 1;

      const newState = live(currentState,
        configurePeriods(gameId, /*totalPeriods=*/2, /*periodLength=*/35));

      expect(newState).to.equal(currentState);
    });
  }); // describe('live/configurePeriods')

  describe('live/startPeriod', () => {
    let currentState: LiveState;
    let gameId: string;

    beforeEach(() => {
      const game = testlive.getLiveGameWithPlayers();
      currentState = buildLiveStateWithCurrentGame(
        game,
        {
          shift: buildShiftWithTrackersFromGame(game)
        });
      gameId = game.id;
    });

    it('should set the clock running and capture the start time', () => {
      mockTimeProvider(startTime);

      const newState = live(currentState, startPeriod(gameId, /*gameAllowsStart=*/true));

      const newGame = getGame(newState, gameId);
      expect(newGame?.clock).to.deep.include({
        timer: {
          isRunning: true,
          startTime: startTime,
          duration: Duration.zero().toJSON()
        }
      });

      expect(newState).not.to.equal(currentState);
    });

    it('should start the first period when currentPeriod not set', () => {
      mockTimeProvider(startTime);

      const newState = live(currentState, startPeriod(gameId, /*gameAllowsStart=*/true));

      const newGame = getGame(newState, gameId);
      expect(newGame?.clock).to.deep.include({
        currentPeriod: 1,
        periodStatus: PeriodStatus.Running
      });

      expect(newState).not.to.equal(currentState);
    });

    it('should start the next period when currentPeriod already set', () => {
      mockTimeProvider(startTime);
      const currentGame = getGame(currentState, gameId)!;
      currentGame.clock = buildClock(
        /* timer= */undefined,
        {
          currentPeriod: 1,
        });

      const newState = live(currentState, startPeriod(gameId, /*gameAllowsStart=*/true));

      const newGame = getGame(newState, gameId);
      expect(newGame?.clock).to.deep.include({
        currentPeriod: 2,
        periodStatus: PeriodStatus.Running
      });

      expect(newState).not.to.equal(currentState);
    });

    it.skip('should do nothing if already at last period', () => {
      mockTimeProvider(startTime);
      const currentGame = getGame(currentState, gameId)!;
      currentGame.clock = buildClock(
        /* timer= */undefined,
        {
          currentPeriod: 2,
          totalPeriods: 2,
        });

      const newState = live(currentState, startPeriod(gameId, /*gameAllowsStart=*/true));

      const newGame = getGame(newState, gameId);
      expect(newGame?.clock).to.deep.include({
        currentPeriod: 2,
        periodStatus: PeriodStatus.Pending
      });

      // TODO: Move the "at last period" check into the creator that sets |gameAllowsStart|
      // Also add a test.
      expect(newState).to.equal(currentState);
    });

    it('should do nothing if game does not allow period to be started', () => {
      mockTimeProvider(startTime);

      const newState = live(currentState, startPeriod(gameId, /*gameAllowsStart=*/false));

      const newGame = getGame(newState, gameId);
      expect(newGame?.clock).to.not.be.ok;

      expect(newState).to.equal(currentState);
    });

  }); // describe('live/startPeriod')

  describe('live/endPeriod', () => {
    let currentState: LiveState;
    let gameId: string;

    beforeEach(() => {
      const game = testlive.getLiveGameWithPlayers();
      game.status = GameStatus.Live;
      currentState = buildLiveStateWithCurrentGame(game);
      gameId = game.id;
    });

    it('should stop the clock and save the duration', () => {
      mockTimeProvider(timeStartPlus10);
      const currentGame = getGame(currentState, gameId)!;
      currentGame.clock = buildClock(
        buildRunningTimer(startTime),
        {
          currentPeriod: 1,
          periodStatus: PeriodStatus.Running,
        });

      const newState = live(currentState, endPeriod(gameId));

      const newGame = getGame(newState, gameId);
      expect(newGame?.clock).to.deep.include({
        timer: {
          isRunning: false,
          startTime: undefined,
          duration: Duration.create(10).toJSON()
        }
      });

      expect(newState).not.to.equal(currentState);
    });

    it('should reset the period status', () => {
      mockTimeProvider(timeStartPlus10);
      const currentGame = getGame(currentState, gameId)!;
      currentGame.clock = buildClock(
        /* timer= */undefined,
        {
          currentPeriod: 1,
          periodStatus: PeriodStatus.Running,
        });

      const newState = live(currentState, endPeriod(gameId));

      const newGame = getGame(newState, gameId);
      expect(newGame?.clock).to.deep.include({
        currentPeriod: 1,
        periodStatus: PeriodStatus.Pending
      });

      expect(newState).not.to.equal(currentState);
    });

    it('should reset the period status when timer is not running', () => {
      mockTimeProvider(timeStartPlus10);
      const currentGame = getGame(currentState, gameId)!;
      currentGame.clock = buildClock(
        buildStoppedTimer(),
        {
          currentPeriod: 1,
          periodStatus: PeriodStatus.Running,
        });

      const newState = live(currentState, endPeriod(gameId));

      const newGame = getGame(newState, gameId);
      expect(newGame?.clock).to.deep.include({
        currentPeriod: 1,
        periodStatus: PeriodStatus.Pending,
      });

      expect(newState).not.to.equal(currentState);
    });

    it('should set the period status to done when on the last period', () => {
      mockTimeProvider(timeStartPlus10);
      const currentGame = getGame(currentState, gameId)!;
      currentGame.clock = buildClock(
        /* timer= */undefined,
        {
          currentPeriod: 3,
          periodStatus: PeriodStatus.Running,
          totalPeriods: 3
        });

      const newState = live(currentState, endPeriod(gameId));

      const newGame = getGame(newState, gameId);
      expect(newGame?.clock).to.deep.include({
        currentPeriod: 3,
        periodStatus: PeriodStatus.Done
      });

      expect(newState).not.to.equal(currentState);
    });

    it('should do nothing if period is not started', () => {
      mockTimeProvider(startTime);
      const currentGame = getGame(currentState, gameId)!;
      currentGame.clock = buildClock(
        /* timer= */undefined,
        {
          currentPeriod: 1,
          periodStatus: PeriodStatus.Pending,
        });

      const newState = live(currentState, endPeriod(gameId));

      const newGame = getGame(newState, gameId);
      expect(newGame?.clock).to.deep.include({
        currentPeriod: 1,
        periodStatus: PeriodStatus.Pending
      });

      expect(newState).to.equal(currentState);
    });

    it('should do nothing if periods are done', () => {
      mockTimeProvider(startTime);
      const currentGame = getGame(currentState, gameId)!;
      currentGame.clock = buildClock(
        /* timer= */undefined,
        {
          currentPeriod: 3,
          periodStatus: PeriodStatus.Done,
          totalPeriods: 3
        });

      const newState = live(currentState, endPeriod(gameId));

      const newGame = getGame(newState, gameId);
      expect(newGame?.clock).to.deep.include({
        currentPeriod: 3,
        periodStatus: PeriodStatus.Done
      });

      expect(newState).to.equal(currentState);
    });

  }); // describe('live/endPeriod')

  describe('live/markPeriodOverdue', () => {
    let currentState: LiveState;
    let gameId: string;

    beforeEach(() => {
      const game = testlive.getLiveGameWithPlayers();
      game.status = GameStatus.Live;
      currentState = buildLiveStateWithCurrentGame(game);
      gameId = game.id;
    });

    it('should set the period status to overdue and keep timer running', () => {
      mockTimeProvider(timeStartPlus15Minutes);
      const currentGame = getGame(currentState, gameId)!;
      currentGame.clock = buildClock(
        buildRunningTimer(startTime),
        {
          currentPeriod: 1,
          periodStatus: PeriodStatus.Running,
          periodLength: 10,
        });

      const newState = live(currentState, markPeriodOverdue(gameId));

      const newGame = getGame(newState, gameId);
      expect(newGame?.clock).to.deep.include({
        currentPeriod: 1,
        periodStatus: PeriodStatus.Overdue,
        timer: buildRunningTimer(startTime)
      });

      expect(newState).not.to.equal(currentState);
    });

    it('should set the period status to overdue when timer is not running', () => {
      mockTimeProvider(timeStartPlus15Minutes);
      const currentGame = getGame(currentState, gameId)!;
      currentGame.clock = buildClock(
        buildStoppedTimer(15 * 60), // 15 minutes elapsed
        {
          currentPeriod: 1,
          periodStatus: PeriodStatus.Running,
          periodLength: 10,
        });

      const newState = live(currentState, markPeriodOverdue(gameId));

      const newGame = getGame(newState, gameId);
      expect(newGame?.clock).to.deep.include({
        currentPeriod: 1,
        periodStatus: PeriodStatus.Overdue,
      });

      expect(newState).not.to.equal(currentState);
    });

    it('should do nothing if timer running before the period length', () => {
      mockTimeProvider(timeStartPlus1Minute55);
      const currentGame = getGame(currentState, gameId)!;
      currentGame.clock = buildClock(
        buildRunningTimer(startTime),
        {
          currentPeriod: 1,
          periodStatus: PeriodStatus.Running,
          periodLength: 10,
        });

      const newState = live(currentState, markPeriodOverdue(gameId));

      const newGame = getGame(newState, gameId);
      expect(newGame?.clock).to.deep.include({
        currentPeriod: 1,
        periodStatus: PeriodStatus.Running,
        timer: buildRunningTimer(startTime)
      });

      expect(newState).to.equal(currentState);
    });

    it('should do nothing if timer stopped before the period length', () => {
      mockTimeProvider(timeStartPlus1Minute55);
      const currentGame = getGame(currentState, gameId)!;
      currentGame.clock = buildClock(
        buildStoppedTimer(10 * 60), // 10 minutes
        {
          currentPeriod: 1,
          periodStatus: PeriodStatus.Running,
          periodLength: 10,
        });

      const newState = live(currentState, markPeriodOverdue(gameId));

      const newGame = getGame(newState, gameId);
      expect(newGame?.clock).to.deep.include({
        currentPeriod: 1,
        periodStatus: PeriodStatus.Running,
        timer: buildStoppedTimer(10 * 60), // 10 minutes
      });

      expect(newState).to.equal(currentState);
    });

    it('should do nothing if period is not started', () => {
      mockTimeProvider(startTime);
      const currentGame = getGame(currentState, gameId)!;
      currentGame.clock = buildClock(
        /* timer= */undefined,
        {
          currentPeriod: 1,
          periodStatus: PeriodStatus.Pending,
        });

      const newState = live(currentState, markPeriodOverdue(gameId));

      const newGame = getGame(newState, gameId);
      expect(newGame?.clock).to.deep.include({
        currentPeriod: 1,
        periodStatus: PeriodStatus.Pending
      });

      expect(newState).to.equal(currentState);
    });

    it('should do nothing if period is done', () => {
      mockTimeProvider(startTime);
      const currentGame = getGame(currentState, gameId)!;
      currentGame.clock = buildClock(
        /* timer= */undefined,
        {
          currentPeriod: 3,
          periodStatus: PeriodStatus.Done,
          totalPeriods: 3
        });

      const newState = live(currentState, markPeriodOverdue(gameId));

      const newGame = getGame(newState, gameId);
      expect(newGame?.clock).to.deep.include({
        currentPeriod: 3,
        periodStatus: PeriodStatus.Done
      });

      expect(newState).to.equal(currentState);
    });

  }); // describe('live/markPeriodOverdue')

  describe('live/toggle', () => {
    let currentState: LiveState;
    let gameId: string;

    beforeEach(() => {
      const game = testlive.getLiveGameWithPlayers();
      currentState = buildLiveStateWithCurrentGame(game);
      gameId = game.id;
    });

    it('should start when no timer data exists', () => {
      mockTimeProvider(timeStartPlus1Minute55);
      const currentGame = getGame(currentState, gameId)!;
      currentGame.clock = buildClock(/* timer= */undefined);

      const newState = live(currentState, toggleClock(gameId));

      const newGame = getGame(newState, gameId);
      expect(newGame?.clock).to.deep.include({
        timer: {
          isRunning: true,
          startTime: timeStartPlus1Minute55,
          duration: Duration.zero().toJSON()
        }
      });

      expect(newState).not.to.equal(currentState);
    });

    it('should start when timer is set to not running', () => {
      mockTimeProvider(startTime);
      const currentGame = getGame(currentState, gameId)!;
      currentGame.clock = buildClock(
        buildStoppedTimer());

      const newState = live(currentState, toggleClock(gameId));

      const newGame = getGame(newState, gameId);
      expect(newGame?.clock).to.deep.include({
        timer: {
          isRunning: true,
          startTime: startTime,
          duration: Duration.zero().toJSON()
        }
      });

      expect(newState).not.to.equal(currentState);
    });

    it('should stop when timer is already running', () => {
      mockTimeProvider(timeStartPlus10);
      const currentGame = getGame(currentState, gameId)!;
      currentGame.clock = buildClock(
        buildRunningTimer(timeStartPlus5));

      const newState = live(currentState, toggleClock(gameId));

      const newGame = getGame(newState, gameId);
      expect(newGame?.clock).to.deep.include({
        timer: {
          isRunning: false,
          startTime: undefined,
          duration: Duration.create(5).toJSON()
        }
      });

      expect(newState).not.to.equal(currentState);
    });

    it('should stop when running and add to existing duration', () => {
      mockTimeProvider(timeStartPlus10);
      const currentGame = getGame(currentState, gameId)!;
      currentGame.clock = buildClock(
        buildRunningTimer(startTime, 20));

      const newState = live(currentState, toggleClock(gameId));

      const newGame = getGame(newState, gameId);
      expect(newGame?.clock).to.deep.include({
        timer: {
          isRunning: false,
          startTime: undefined,
          duration: Duration.create(30).toJSON()
        }
      });

      expect(newState).not.to.equal(currentState);
    });

    it('should not change the period when timer is set to not running', () => {
      mockTimeProvider(startTime);
      const currentGame = getGame(currentState, gameId)!;
      currentGame.clock = buildClock(
        buildStoppedTimer(),
        {
          currentPeriod: 1,
          periodStatus: PeriodStatus.Running,
        });

      const newState = live(currentState, toggleClock(gameId));

      const newGame = getGame(newState, gameId);
      expect(newGame?.clock).to.deep.include({
        currentPeriod: 1,
        periodStatus: PeriodStatus.Running,
      });

      expect(newState).not.to.equal(currentState);
      // Check the timer to make sure the toggle happened, but the values don't
      // matter for this test.
      expect(newGame?.clock?.timer).not.to.equal(currentGame.clock?.timer);
    });

    it('should not change the period when timer is already running', () => {
      mockTimeProvider(timeStartPlus10);
      const currentGame = getGame(currentState, gameId)!;
      currentGame.clock = buildClock(
        buildRunningTimer(timeStartPlus5),
        {
          currentPeriod: 2,
          periodStatus: PeriodStatus.Running,
        });

      const newState = live(currentState, toggleClock(gameId));

      const newGame = getGame(newState, gameId);
      expect(newGame?.clock).to.deep.include({
        currentPeriod: 2,
        periodStatus: PeriodStatus.Running,
      });

      expect(newState).not.to.equal(currentState);
      // Check the timer to make sure the toggle happened, but the values don't
      // matter for this test.
      expect(newGame?.clock?.timer).not.to.equal(currentGame.clock?.timer);
    });

  }); // describe('live/toggle')
});
