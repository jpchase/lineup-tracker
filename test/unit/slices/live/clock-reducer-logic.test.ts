/** @format */

import { Duration } from '@app/models/clock.js';
import { GameStatus } from '@app/models/game.js';
import { PeriodStatus, SetupSteps } from '@app/models/live.js';
import { live } from '@app/slices/live/composed-reducer.js';
import { endPeriodCreator, markPeriodOverdueCreator } from '@app/slices/live/index.js';
import { eventsUpdated } from '@app/slices/live/live-action-types.js';
import { LiveState, actions } from '@app/slices/live/live-slice.js';
import { expect } from '@open-wc/testing';
import sinon from 'sinon';
import {
  buildClock,
  buildClockWithTimer,
  buildLiveGameWithSetupTasksAndPlayers,
  buildLiveStateWithCurrentGame,
  buildShiftWithTrackersFromGame,
  getGame,
} from '../../helpers/live-state-setup.js';
import { mockGetState } from '../../helpers/root-state-setup.js';
import { buildRunningTimer, buildStoppedTimer } from '../../helpers/test-clock-data.js';
import { buildPeriodStartEvent } from '../../helpers/test-event-data.js';
import * as testlive from '../../helpers/test-live-game-data.js';

const { configurePeriods, endPeriod, markPeriodOverdue, startPeriod, toggleClock } = actions;

describe('Live slice: Clock actions', () => {
  const startTime = new Date(2016, 0, 1, 14, 5, 1, 300).getTime();
  const startDate = new Date(2016, 0, 1, 14, 0, 0, 0).getTime();
  const timeStartPlus5 = startTime + 5 * 1000;
  const timeStartPlus10 = startTime + 10 * 1000;
  const timeStartPlus1Minute55 = startTime + (1 * 60 + 55) * 1000;
  const timeStartPlus15Minutes = startTime + 15 * 60 * 1000;
  const timeStartPlus18Minutes = startTime + 18 * 60 * 1000;
  const timeStartPlus20Minutes = startTime + 20 * 60 * 1000;
  const timeStartPlus23Minutes = startTime + 23 * 60 * 1000;
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
      const newState = live(
        currentState,
        configurePeriods(gameId, /*totalPeriods=*/ 1, /*periodLength=*/ 20),
      );

      const newGame = getGame(newState, gameId);
      expect(newGame?.clock).to.deep.include({
        totalPeriods: 1,
        periodLength: 20,
      });

      expect(newState).not.to.equal(currentState);
    });

    it('should update setup tasks to mark periods complete, in New status', () => {
      const game = buildLiveGameWithSetupTasksAndPlayers(
        /*lastCompletedStep=*/ SetupSteps.Periods - 1,
      );
      currentState = buildLiveStateWithCurrentGame(game);

      const expectedGame = buildLiveGameWithSetupTasksAndPlayers(
        /*lastCompletedStep=*/ SetupSteps.Periods,
      );
      expectedGame.clock = buildClock(undefined, {
        totalPeriods: 3,
        periodLength: 25,
      });
      const expectedState = buildLiveStateWithCurrentGame(expectedGame);

      const newState = live(
        currentState,
        configurePeriods(gameId, /*totalPeriods=*/ 3, /*periodLength=*/ 25),
      );

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
          periodLength: 25,
        }),
      };
      delete expectedGame.setupTasks;
      const expectedState = buildLiveStateWithCurrentGame(expectedGame);

      const newState = live(
        currentState,
        configurePeriods(gameId, /*totalPeriods=*/ 3, /*periodLength=*/ 25),
      );

      expect(newState).to.deep.include(expectedState);

      expect(newState).not.to.equal(currentState);
    });

    it('should do nothing if totalPeriods is invalid', () => {
      const game = buildLiveGameWithSetupTasksAndPlayers(
        /*lastCompletedStep=*/ SetupSteps.Periods - 1,
      );
      currentState = buildLiveStateWithCurrentGame(game);

      const newState = live(
        currentState,
        configurePeriods(gameId, /*totalPeriods=*/ 0, /*periodLength=*/ 45),
      );

      expect(newState).to.equal(currentState);
    });

    it('should do nothing if periodLength is invalid', () => {
      const newState = live(
        currentState,
        configurePeriods(gameId, /*totalPeriods=*/ 2, /*periodLength=*/ 5),
      );

      expect(newState).to.equal(currentState);
    });

    it('should do nothing if already started', () => {
      const currentGame = getGame(currentState, gameId)!;
      currentGame.clock!.periodStatus = PeriodStatus.Running;

      const newState = live(
        currentState,
        configurePeriods(gameId, /*totalPeriods=*/ 2, /*periodLength=*/ 35),
      );

      expect(newState).to.equal(currentState);
    });

    it('should do nothing if already on period 1', () => {
      const currentGame = getGame(currentState, gameId)!;
      currentGame.clock!.currentPeriod = 1;

      const newState = live(
        currentState,
        configurePeriods(gameId, /*totalPeriods=*/ 2, /*periodLength=*/ 35),
      );

      expect(newState).to.equal(currentState);
    });
  }); // describe('live/configurePeriods')

  describe('live/startPeriod', () => {
    let currentState: LiveState;
    let gameId: string;

    beforeEach(() => {
      const game = testlive.getLiveGameWithPlayers();
      currentState = buildLiveStateWithCurrentGame(game, {
        shift: buildShiftWithTrackersFromGame(game),
      });
      gameId = game.id;
    });

    it('should set the clock running and capture the start time', () => {
      mockTimeProvider(startTime);
      getGame(currentState, gameId)!.status = GameStatus.Start;

      const newState = live(
        currentState,
        startPeriod(gameId, /*gameAllowsStart=*/ true, /*currentPeriod=*/ 1, startTime),
      );

      const newGame = getGame(newState, gameId);
      expect(newGame?.clock).to.deep.include({
        periodStartTime: startTime,
        gameStartDate: startDate,
        timer: {
          isRunning: true,
          startTime,
          duration: Duration.zero().toJSON(),
        },
      });

      expect(newState).not.to.equal(currentState);
    });

    it('should start the first period when currentPeriod not set', () => {
      mockTimeProvider(startTime);
      getGame(currentState, gameId)!.status = GameStatus.Start;

      const newState = live(
        currentState,
        startPeriod(gameId, /*gameAllowsStart=*/ true, /*currentPeriod=*/ 1, startTime),
      );

      const newGame = getGame(newState, gameId);
      expect(newGame?.clock).to.deep.include({
        currentPeriod: 1,
        periodStatus: PeriodStatus.Running,
      });

      expect(newState).not.to.equal(currentState);
    });

    it('should start the next period when currentPeriod already set', () => {
      mockTimeProvider(timeStartPlus15Minutes);
      const currentGame = getGame(currentState, gameId)!;
      currentGame.status = GameStatus.Break;
      currentGame.clock = buildClock(/* timer= */ undefined, {
        currentPeriod: 1,
        periodStartTime: startTime,
      });

      const newState = live(currentState, startPeriod(gameId, /*gameAllowsStart=*/ true));

      const newGame = getGame(newState, gameId);
      expect(newGame?.clock).to.deep.include({
        currentPeriod: 2,
        periodStartTime: timeStartPlus15Minutes,
        periodStatus: PeriodStatus.Running,
      });

      expect(newState).not.to.equal(currentState);
    });

    it('should leave game start date unchanged when starting the next period', () => {
      const startTimeBeforeHour = new Date(2016, 0, 1, 14, 55, 1, 300).getTime();
      const startDateBeforeHour = new Date(2016, 0, 1, 14, 0, 0, 0).getTime();
      const nextStartTimeAfterHour = new Date(2016, 0, 1, 15, 25, 2, 425).getTime();
      mockTimeProvider(nextStartTimeAfterHour);
      const currentGame = getGame(currentState, gameId)!;
      currentGame.status = GameStatus.Break;
      currentGame.clock = buildClock(/* timer= */ undefined, {
        currentPeriod: 1,
        periodStartTime: startTimeBeforeHour,
        gameStartDate: startDateBeforeHour,
      });

      const newState = live(currentState, startPeriod(gameId, /*gameAllowsStart=*/ true));

      const newGame = getGame(newState, gameId);
      expect(newGame?.clock).to.deep.include({
        currentPeriod: 2,
        periodStartTime: nextStartTimeAfterHour,
        periodStatus: PeriodStatus.Running,
        gameStartDate: startDateBeforeHour,
      });

      expect(newState).not.to.equal(currentState);
    });

    it.skip('should do nothing if already at last period', () => {
      mockTimeProvider(startTime);
      const currentGame = getGame(currentState, gameId)!;
      currentGame.clock = buildClock(/* timer= */ undefined, {
        currentPeriod: 2,
        totalPeriods: 2,
      });

      const newState = live(
        currentState,
        startPeriod(gameId, /*gameAllowsStart=*/ true, /*currentPeriod=*/ 2, startTime),
      );

      const newGame = getGame(newState, gameId);
      expect(newGame?.clock).to.deep.include({
        currentPeriod: 2,
        periodStatus: PeriodStatus.Pending,
      });

      // TODO: Move the "at last period" check into the creator that sets |gameAllowsStart|
      // Also add a test.
      expect(newState).to.equal(currentState);
    });

    it('should do nothing if game does not allow period to be started', () => {
      mockTimeProvider(startTime);

      const newState = live(currentState, startPeriod(gameId, /*gameAllowsStart=*/ false));

      const newGame = getGame(newState, gameId);
      expect(newGame?.clock).to.not.be.ok;

      expect(newState).to.equal(currentState);
    });
  }); // describe('live/startPeriod')

  describe('events/periodStartUpdated', () => {
    let currentState: LiveState;
    let gameId: string;
    const startTimeDiffInSeconds = -30;
    const updatedStartTime = startTime + startTimeDiffInSeconds * 1000;

    beforeEach(() => {
      const game = testlive.getLiveGameWithPlayers();
      currentState = buildLiveStateWithCurrentGame(game, {
        shift: buildShiftWithTrackersFromGame(game),
      });
      gameId = game.id;
    });

    it('should update the start time on first period with the clock running', () => {
      const currentGame = getGame(currentState, gameId)!;
      currentGame.status = GameStatus.Live;
      currentGame.clock = buildClock(buildRunningTimer(startTime), {
        currentPeriod: 1,
        periodStartTime: startTime,
        gameStartDate: startDate,
      });

      const updatedPeriodStartEvent = buildPeriodStartEvent(updatedStartTime, /*currentPeriod=*/ 1);

      const newState = live(currentState, eventsUpdated(gameId, [updatedPeriodStartEvent]));

      const newGame = getGame(newState, gameId);
      expect(newGame?.clock).to.deep.include({
        periodStartTime: updatedStartTime,
        gameStartDate: startDate, // Start date should be unchanged
        timer: {
          isRunning: true,
          startTime: updatedStartTime,
          duration: Duration.zero().toJSON(),
        },
      });
    });

    it('should update the duration on first period with the clock stopped', () => {
      const currentGame = getGame(currentState, gameId)!;
      currentGame.status = GameStatus.Live;
      currentGame.clock = buildClock(buildStoppedTimer(200), {
        currentPeriod: 1,
        periodStartTime: startTime,
      });

      const updatedPeriodStartEvent = buildPeriodStartEvent(updatedStartTime, /*currentPeriod=*/ 1);

      const newState = live(currentState, eventsUpdated(gameId, [updatedPeriodStartEvent]));

      const newGame = getGame(newState, gameId);
      expect(newGame?.clock).to.deep.include({
        periodStartTime: updatedStartTime,
        timer: {
          isRunning: false,
          startTime: undefined,
          duration: Duration.create(200 - startTimeDiffInSeconds).toJSON(),
        },
      });
    });

    it('should update the duration on first period with the clock running after a stoppage', () => {
      const currentGame = getGame(currentState, gameId)!;
      currentGame.status = GameStatus.Live;
      currentGame.clock = buildClock(
        buildRunningTimer(timeStartPlus20Minutes, /*elapsedSeconds=*/ 100),
        {
          currentPeriod: 1,
          periodStartTime: startTime,
        },
      );

      const updatedPeriodStartEvent = buildPeriodStartEvent(updatedStartTime, /*currentPeriod=*/ 1);

      const newState = live(currentState, eventsUpdated(gameId, [updatedPeriodStartEvent]));

      const newGame = getGame(newState, gameId);
      expect(newGame?.clock).to.deep.include({
        periodStartTime: updatedStartTime,
        timer: {
          isRunning: true,
          startTime: timeStartPlus20Minutes,
          duration: Duration.create(100 - startTimeDiffInSeconds).toJSON(),
        },
      });
    });

    it('should update the start time on subsequent period with the clock running', () => {
      const currentGame = getGame(currentState, gameId)!;
      currentGame.status = GameStatus.Live;
      currentGame.clock = buildClock(buildRunningTimer(startTime), {
        currentPeriod: 2,
        periodStartTime: startTime,
        gameStartDate: startDate,
      });

      const updatedPeriodStartEvent = buildPeriodStartEvent(updatedStartTime, /*currentPeriod=*/ 2);

      const newState = live(currentState, eventsUpdated(gameId, [updatedPeriodStartEvent]));

      const newGame = getGame(newState, gameId);
      expect(newGame?.clock).to.deep.include({
        periodStartTime: updatedStartTime,
        gameStartDate: startDate, // Start date should be unchanged
        timer: {
          isRunning: true,
          startTime: updatedStartTime,
          duration: Duration.zero().toJSON(),
        },
      });
    });

    it('should update the duration on subsequent period with the clock stopped', () => {
      const currentGame = getGame(currentState, gameId)!;
      currentGame.status = GameStatus.Live;
      currentGame.clock = buildClock(buildStoppedTimer(200), {
        currentPeriod: 2,
        periodStartTime: startTime,
      });

      const updatedPeriodStartEvent = buildPeriodStartEvent(updatedStartTime, /*currentPeriod=*/ 2);

      const newState = live(currentState, eventsUpdated(gameId, [updatedPeriodStartEvent]));

      const newGame = getGame(newState, gameId);
      expect(newGame?.clock).to.deep.include({
        periodStartTime: updatedStartTime,
        timer: {
          isRunning: false,
          startTime: undefined,
          duration: Duration.create(200 - startTimeDiffInSeconds).toJSON(),
        },
      });
    });

    it('should update the duration on subsequent period with the clock running after a stoppage', () => {
      const currentGame = getGame(currentState, gameId)!;
      currentGame.status = GameStatus.Live;
      currentGame.clock = buildClock(
        buildRunningTimer(timeStartPlus20Minutes, /*elapsedSeconds=*/ 100),
        {
          currentPeriod: 2,
          periodStartTime: startTime,
        },
      );

      const updatedPeriodStartEvent = buildPeriodStartEvent(updatedStartTime, /*currentPeriod=*/ 2);

      const newState = live(currentState, eventsUpdated(gameId, [updatedPeriodStartEvent]));

      const newGame = getGame(newState, gameId);
      expect(newGame?.clock).to.deep.include({
        periodStartTime: updatedStartTime,
        timer: {
          isRunning: true,
          startTime: timeStartPlus20Minutes,
          duration: Duration.create(100 - startTimeDiffInSeconds).toJSON(),
        },
      });
    });

    it('should update the start time on current period during break before the next period', () => {
      const currentGame = getGame(currentState, gameId)!;
      currentGame.status = GameStatus.Break;
      currentGame.clock = buildClock(buildStoppedTimer(200), {
        currentPeriod: 1,
        periodStartTime: startTime,
      });

      const updatedPeriodStartEvent = buildPeriodStartEvent(updatedStartTime, /*currentPeriod=*/ 1);

      const newState = live(currentState, eventsUpdated(gameId, [updatedPeriodStartEvent]));

      const newGame = getGame(newState, gameId);
      expect(newGame?.clock).to.deep.include({
        currentPeriod: 1,
        periodStartTime: updatedStartTime,
        periodStatus: PeriodStatus.Pending,
        timer: {
          isRunning: false,
          startTime: undefined,
          duration: Duration.create(200 - startTimeDiffInSeconds).toJSON(),
        },
      });

      expect(newState).not.to.equal(currentState);
    });

    it('should ignore event for previous period', () => {
      const currentGame = getGame(currentState, gameId)!;
      currentGame.status = GameStatus.Live;
      currentGame.clock = buildClock(
        buildRunningTimer(timeStartPlus20Minutes, /*elapsedSeconds=*/ 10),
        {
          currentPeriod: 2,
          periodStartTime: startTime,
        },
      );

      const updatedPeriodStartEvent = buildPeriodStartEvent(updatedStartTime, /*currentPeriod=*/ 1);

      const newState = live(currentState, eventsUpdated(gameId, [updatedPeriodStartEvent]));

      const newGame = getGame(newState, gameId);
      expect(newGame?.clock).to.deep.include({
        periodStartTime: startTime,
        timer: {
          isRunning: true,
          startTime: timeStartPlus20Minutes,
          duration: Duration.create(10).toJSON(),
        },
      });

      expect(newState).to.equal(currentState);
    });

    it('should ignore event if last period completed', () => {
      const currentGame = getGame(currentState, gameId)!;
      currentGame.status = GameStatus.Done;
      currentGame.clock = buildClock(buildStoppedTimer(100), {
        currentPeriod: 2,
        totalPeriods: 2,
        periodStartTime: startTime,
        periodStatus: PeriodStatus.Done,
      });

      const updatedPeriodStartEvent = buildPeriodStartEvent(updatedStartTime, /*currentPeriod=*/ 2);

      const newState = live(currentState, eventsUpdated(gameId, [updatedPeriodStartEvent]));

      const newGame = getGame(newState, gameId);
      expect(newGame?.clock).to.deep.include({
        currentPeriod: 2,
        periodStartTime: startTime,
        periodStatus: PeriodStatus.Done,
        timer: {
          isRunning: false,
          startTime: undefined,
          duration: Duration.create(100).toJSON(),
        },
      });

      expect(newState).to.equal(currentState);
    });
  }); // describe('events/periodStartUpdated')

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
      currentGame.clock = buildClock(buildRunningTimer(startTime), {
        currentPeriod: 1,
        periodStartTime: startTime,
        periodStatus: PeriodStatus.Running,
        gameStartDate: startDate,
      });

      const newState = live(
        currentState,
        endPeriod(gameId, /*gameAllowsEnd=*/ true, /*currentPeriod=*/ 1, timeStartPlus10),
      );

      const newGame = getGame(newState, gameId);
      expect(newGame?.clock).to.deep.include({
        periodStartTime: startTime,
        timer: {
          isRunning: false,
          startTime: undefined,
          duration: Duration.create(10).toJSON(),
        },
        gameStartDate: startDate, // Start date should be unchanged
      });

      expect(newState).not.to.equal(currentState);
    });

    it('should reset the period status', () => {
      mockTimeProvider(timeStartPlus10);
      const currentGame = getGame(currentState, gameId)!;
      currentGame.clock = buildClock(/* timer= */ undefined, {
        currentPeriod: 1,
        periodStartTime: startTime,
        periodStatus: PeriodStatus.Running,
        gameStartDate: startDate,
      });

      const newState = live(
        currentState,
        endPeriod(gameId, /*gameAllowsEnd=*/ true, /*currentPeriod=*/ 1, timeStartPlus10),
      );

      const newGame = getGame(newState, gameId);
      expect(newGame?.clock).to.deep.include({
        currentPeriod: 1,
        periodStartTime: startTime,
        periodStatus: PeriodStatus.Pending,
        gameStartDate: startDate, // Start date should be unchanged
      });

      expect(newState).not.to.equal(currentState);
    });

    it('should reset the period status when overdue', () => {
      mockTimeProvider(timeStartPlus10);
      const currentGame = getGame(currentState, gameId)!;
      currentGame.clock = buildClock(/* timer= */ undefined, {
        currentPeriod: 1,
        periodStartTime: startTime,
        periodStatus: PeriodStatus.Overdue,
      });

      const newState = live(
        currentState,
        endPeriod(gameId, /*gameAllowsEnd=*/ true, /*currentPeriod=*/ 1, timeStartPlus10),
      );

      const newGame = getGame(newState, gameId);
      expect(newGame?.clock).to.deep.include({
        currentPeriod: 1,
        periodStartTime: startTime,
        periodStatus: PeriodStatus.Pending,
      });

      expect(newState).not.to.equal(currentState);
    });

    it('should reset the period status when timer is not running', () => {
      mockTimeProvider(timeStartPlus10);
      const currentGame = getGame(currentState, gameId)!;
      currentGame.clock = buildClock(buildStoppedTimer(), {
        currentPeriod: 1,
        periodStartTime: startTime,
        periodStatus: PeriodStatus.Running,
      });

      const newState = live(
        currentState,
        endPeriod(gameId, /*gameAllowsEnd=*/ true, /*currentPeriod=*/ 1, timeStartPlus10),
      );

      const newGame = getGame(newState, gameId);
      expect(newGame?.clock).to.deep.include({
        currentPeriod: 1,
        periodStartTime: startTime,
        periodStatus: PeriodStatus.Pending,
      });

      expect(newState).not.to.equal(currentState);
    });

    it('should set the period status to done when on the last period', () => {
      mockTimeProvider(timeStartPlus10);
      const currentGame = getGame(currentState, gameId)!;
      currentGame.clock = buildClock(/* timer= */ undefined, {
        currentPeriod: 3,
        periodStartTime: startTime,
        periodStatus: PeriodStatus.Running,
        totalPeriods: 3,
        gameStartDate: startDate,
      });

      const newState = live(
        currentState,
        endPeriod(gameId, /*gameAllowsEnd=*/ true, /*currentPeriod=*/ 3, timeStartPlus10),
      );

      const newGame = getGame(newState, gameId);
      expect(newGame?.clock).to.deep.include({
        currentPeriod: 3,
        periodStartTime: startTime,
        periodStatus: PeriodStatus.Done,
        gameStartDate: startDate, // Start date should be unchanged
      });

      expect(newState).not.to.equal(currentState);
    });

    it('should do nothing if period is not started', () => {
      mockTimeProvider(startTime);
      const currentGame = getGame(currentState, gameId)!;
      currentGame.clock = buildClock(/* timer= */ undefined, {
        currentPeriod: 1,
        periodStatus: PeriodStatus.Pending,
      });

      const newState = live(currentState, endPeriod(gameId, /*gameAllowsEnd=*/ false));

      const newGame = getGame(newState, gameId);
      expect(newGame?.clock).to.deep.include({
        currentPeriod: 1,
        periodStatus: PeriodStatus.Pending,
      });

      expect(newState).to.equal(currentState);
    });

    it('should do nothing if periods are done', () => {
      mockTimeProvider(startTime);
      const currentGame = getGame(currentState, gameId)!;
      currentGame.clock = buildClock(/* timer= */ undefined, {
        currentPeriod: 3,
        periodStatus: PeriodStatus.Done,
        totalPeriods: 3,
        gameStartDate: startDate,
      });

      const newState = live(currentState, endPeriod(gameId, /*gameAllowsEnd=*/ false));

      const newGame = getGame(newState, gameId);
      expect(newGame?.clock).to.deep.include({
        currentPeriod: 3,
        periodStatus: PeriodStatus.Done,
        gameStartDate: startDate,
      });

      expect(newState).to.equal(currentState);
    });

    describe('action creator', () => {
      it('should dispatch action for running period with clock running', async () => {
        mockTimeProvider(timeStartPlus10);
        const currentGame = getGame(currentState, gameId)!;
        currentGame.clock = buildClock(buildRunningTimer(startTime), {
          currentPeriod: 1,
          periodStatus: PeriodStatus.Running,
        });

        const dispatchMock = sinon.stub();
        const getStateMock = mockGetState(undefined, undefined, undefined, currentState);

        await endPeriodCreator(gameId)(dispatchMock, getStateMock, undefined);

        expect(dispatchMock).to.have.callCount(1);

        expect(dispatchMock.lastCall).to.have.been.calledWith(
          endPeriod(gameId, /*gameAllowsEnd=*/ true, /*currentPeriod=*/ 1, timeStartPlus10),
        );
      });

      it('should dispatch action for running period with clock stopped', async () => {
        mockTimeProvider(timeStartPlus10);
        const currentGame = getGame(currentState, gameId)!;
        currentGame.clock = buildClock(buildStoppedTimer(startTime), {
          currentPeriod: 1,
          periodStatus: PeriodStatus.Running,
        });

        const dispatchMock = sinon.stub();
        const getStateMock = mockGetState(undefined, undefined, undefined, currentState);

        endPeriodCreator(gameId)(dispatchMock, getStateMock, undefined);

        expect(dispatchMock).to.have.callCount(1);

        expect(dispatchMock.lastCall).to.have.been.calledWith(
          endPeriod(gameId, /*gameAllowsEnd=*/ true, /*currentPeriod=*/ 1, timeStartPlus10),
        );
      });

      it('should dispatch action for overdue period with extra minutes when clock running', async () => {
        mockTimeProvider(timeStartPlus20Minutes);
        const currentGame = getGame(currentState, gameId)!;
        currentGame.clock = buildClock(buildRunningTimer(startTime), {
          currentPeriod: 1,
          periodStatus: PeriodStatus.Overdue,
          periodLength: 12,
        });

        const dispatchMock = sinon.stub();
        const getStateMock = mockGetState(undefined, undefined, undefined, currentState);

        endPeriodCreator(gameId, /*extraMinutes=*/ 3)(dispatchMock, getStateMock, undefined);

        expect(dispatchMock).to.have.callCount(1);

        expect(dispatchMock.lastCall).to.have.been.calledWith(
          endPeriod(gameId, /*gameAllowsEnd=*/ true, /*currentPeriod=*/ 1, timeStartPlus15Minutes),
        );
      });

      it('should dispatch action for overdue period with extra minutes when clock running after being toggled', async () => {
        mockTimeProvider(timeStartPlus18Minutes);
        const currentGame = getGame(currentState, gameId)!;

        // Simulate the game clock being toggled off for 10 minutes.
        //   - Running for 10 minutes when toggled off
        //   - Left off for 8 minutes
        //   - Restarted at 18 minutes
        const toggledTimer = buildRunningTimer(timeStartPlus18Minutes, /*elapsedSeconds=*/ 10 * 60);
        currentGame.clock = buildClock(
          toggledTimer,
          {
            currentPeriod: 1,
            periodStatus: PeriodStatus.Overdue,
            periodLength: 12,
          },
          buildStoppedTimer(/*elapsedSeconds=*/ 8 * 60),
        );

        const dispatchMock = sinon.stub();
        const getStateMock = mockGetState(undefined, undefined, undefined, currentState);

        endPeriodCreator(gameId, /*extraMinutes=*/ 3)(dispatchMock, getStateMock, undefined);

        expect(dispatchMock).to.have.callCount(1);

        expect(dispatchMock.lastCall).to.have.been.calledWith(
          endPeriod(gameId, /*gameAllowsEnd=*/ true, /*currentPeriod=*/ 1, timeStartPlus23Minutes),
        );
      });

      it('should dispatch action for overdue period with explicit zero extra minutes when clock running', async () => {
        mockTimeProvider(timeStartPlus20Minutes);
        const currentGame = getGame(currentState, gameId)!;
        currentGame.clock = buildClock(buildRunningTimer(startTime), {
          currentPeriod: 1,
          periodStatus: PeriodStatus.Overdue,
          periodLength: 15,
        });

        const dispatchMock = sinon.stub();
        const getStateMock = mockGetState(undefined, undefined, undefined, currentState);

        endPeriodCreator(gameId, /*extraMinutes=*/ 0)(dispatchMock, getStateMock, undefined);

        expect(dispatchMock).to.have.callCount(1);

        expect(dispatchMock.lastCall).to.have.been.calledWith(
          endPeriod(gameId, /*gameAllowsEnd=*/ true, /*currentPeriod=*/ 1, timeStartPlus15Minutes),
        );
      });

      it('should dispatch action for overdue period without extra minutes when clock stopped', async () => {
        mockTimeProvider(timeStartPlus20Minutes);
        const currentGame = getGame(currentState, gameId)!;
        currentGame.clock = buildClock(
          buildStoppedTimer(17 * 60), // 17 minutes
          {
            currentPeriod: 1,
            periodStatus: PeriodStatus.Overdue,
            periodLength: 12,
          },
        );

        const dispatchMock = sinon.stub();
        const getStateMock = mockGetState(undefined, undefined, undefined, currentState);

        endPeriodCreator(gameId, /*extraMinutes=*/ 3)(dispatchMock, getStateMock, undefined);

        expect(dispatchMock).to.have.callCount(1);

        expect(dispatchMock.lastCall).to.have.been.calledWith(
          endPeriod(gameId, /*gameAllowsEnd=*/ true, /*currentPeriod=*/ 1, timeStartPlus20Minutes),
        );
      });
    }); // describe('action creator')
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
      currentGame.clock = buildClock(buildRunningTimer(startTime), {
        currentPeriod: 1,
        periodStartTime: startTime,
        periodStatus: PeriodStatus.Running,
        periodLength: 10,
      });

      const newState = live(currentState, markPeriodOverdue(gameId));

      const newGame = getGame(newState, gameId);
      expect(newGame?.clock).to.deep.include({
        currentPeriod: 1,
        periodStartTime: startTime,
        periodStatus: PeriodStatus.Overdue,
        timer: buildRunningTimer(startTime),
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
          periodStartTime: startTime,
          periodStatus: PeriodStatus.Running,
          periodLength: 10,
        },
      );

      const newState = live(currentState, markPeriodOverdue(gameId));

      const newGame = getGame(newState, gameId);
      expect(newGame?.clock).to.deep.include({
        currentPeriod: 1,
        periodStartTime: startTime,
        periodStatus: PeriodStatus.Overdue,
      });

      expect(newState).not.to.equal(currentState);
    });

    it('should do nothing if timer running before the period length', () => {
      mockTimeProvider(timeStartPlus1Minute55);
      const currentGame = getGame(currentState, gameId)!;
      currentGame.clock = buildClock(buildRunningTimer(startTime), {
        currentPeriod: 1,
        periodStatus: PeriodStatus.Running,
        periodLength: 10,
      });

      const newState = live(currentState, markPeriodOverdue(gameId));

      const newGame = getGame(newState, gameId);
      expect(newGame?.clock).to.deep.include({
        currentPeriod: 1,
        periodStatus: PeriodStatus.Running,
        timer: buildRunningTimer(startTime),
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
        },
      );

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
      currentGame.clock = buildClock(/* timer= */ undefined, {
        currentPeriod: 1,
        periodStatus: PeriodStatus.Pending,
      });

      const newState = live(currentState, markPeriodOverdue(gameId));

      const newGame = getGame(newState, gameId);
      expect(newGame?.clock).to.deep.include({
        currentPeriod: 1,
        periodStatus: PeriodStatus.Pending,
      });

      expect(newState).to.equal(currentState);
    });

    it('should do nothing if period is done', () => {
      mockTimeProvider(startTime);
      const currentGame = getGame(currentState, gameId)!;
      currentGame.clock = buildClock(/* timer= */ undefined, {
        currentPeriod: 3,
        periodStatus: PeriodStatus.Done,
        totalPeriods: 3,
      });

      const newState = live(currentState, markPeriodOverdue(gameId));

      const newGame = getGame(newState, gameId);
      expect(newGame?.clock).to.deep.include({
        currentPeriod: 3,
        periodStatus: PeriodStatus.Done,
      });

      expect(newState).to.equal(currentState);
    });

    describe('action creator', () => {
      it('should dispatch action if running past period length', async () => {
        mockTimeProvider(timeStartPlus15Minutes);
        const currentGame = getGame(currentState, gameId)!;
        currentGame.clock = buildClock(buildRunningTimer(startTime), {
          currentPeriod: 1,
          periodStatus: PeriodStatus.Running,
          periodLength: 10,
        });

        const dispatchMock = sinon.stub();
        const getStateMock = mockGetState(undefined, undefined, undefined, currentState);

        await markPeriodOverdueCreator(gameId)(dispatchMock, getStateMock, undefined);

        expect(dispatchMock).to.have.callCount(1);
        expect(dispatchMock.lastCall).to.have.been.calledWith(markPeriodOverdue(gameId));
      });

      it('should not dispatch action if running before the period length', async () => {
        mockTimeProvider(timeStartPlus1Minute55);
        const currentGame = getGame(currentState, gameId)!;
        currentGame.clock = buildClock(buildRunningTimer(startTime), {
          currentPeriod: 1,
          periodStatus: PeriodStatus.Running,
          periodLength: 10,
        });

        const dispatchMock = sinon.stub();
        const getStateMock = mockGetState(undefined, undefined, undefined, currentState);

        await markPeriodOverdueCreator(gameId)(dispatchMock, getStateMock, undefined);

        expect(dispatchMock).to.have.callCount(0);
      });

      it('should not dispatch action if period is already overdue', async () => {
        mockTimeProvider(timeStartPlus15Minutes);
        const currentGame = getGame(currentState, gameId)!;
        currentGame.clock = buildClock(buildRunningTimer(startTime), {
          currentPeriod: 1,
          periodStatus: PeriodStatus.Overdue,
          periodLength: 10,
        });

        const dispatchMock = sinon.stub();
        const getStateMock = mockGetState(undefined, undefined, undefined, currentState);

        await markPeriodOverdueCreator(gameId)(dispatchMock, getStateMock, undefined);

        expect(dispatchMock).to.have.callCount(0);
      });

      it('should not dispatch action if period is not started', async () => {
        mockTimeProvider(startTime);
        const currentGame = getGame(currentState, gameId)!;
        currentGame.clock = buildClock(/* timer= */ undefined, {
          currentPeriod: 1,
          periodStatus: PeriodStatus.Pending,
        });

        const dispatchMock = sinon.stub();
        const getStateMock = mockGetState(undefined, undefined, undefined, currentState);

        await markPeriodOverdueCreator(gameId)(dispatchMock, getStateMock, undefined);

        expect(dispatchMock).to.have.callCount(0);
      });

      it('should not dispatch action if period is done', async () => {
        mockTimeProvider(startTime);
        const currentGame = getGame(currentState, gameId)!;
        currentGame.clock = buildClock(/* timer= */ undefined, {
          currentPeriod: 3,
          periodStatus: PeriodStatus.Done,
          totalPeriods: 3,
        });

        const dispatchMock = sinon.stub();
        const getStateMock = mockGetState(undefined, undefined, undefined, currentState);

        await markPeriodOverdueCreator(gameId)(dispatchMock, getStateMock, undefined);

        expect(dispatchMock).to.have.callCount(0);
      });
    }); // describe('action creator')
  }); // describe('live/markPeriodOverdue')

  describe('live/toggle', () => {
    let currentState: LiveState;
    let gameId: string;

    beforeEach(() => {
      const game = testlive.getLiveGameWithPlayers();
      game.status = GameStatus.Live;
      currentState = buildLiveStateWithCurrentGame(game);
      gameId = game.id;
    });

    it('should do nothing when no timer data exists', () => {
      mockTimeProvider(timeStartPlus1Minute55);
      const currentGame = getGame(currentState, gameId)!;
      currentGame.clock = buildClock(/* timer= */ undefined, {
        periodStartTime: timeStartPlus10,
        periodStatus: PeriodStatus.Running,
      });

      const newState = live(
        currentState,
        toggleClock(
          gameId,
          /*gameAllowsToggle =*/ true,
          /*currentPeriod =*/ 1,
          timeStartPlus1Minute55,
          /*isRunning =*/ true,
        ),
      );

      const newGame = getGame(newState, gameId);
      expect(newGame?.clock).to.equal(currentGame.clock);
    });

    it('should start when timer is set to not running', () => {
      mockTimeProvider(timeStartPlus1Minute55);
      const currentGame = getGame(currentState, gameId)!;
      currentGame.clock = buildClock(buildStoppedTimer(), {
        periodStartTime: timeStartPlus10,
        periodStatus: PeriodStatus.Running,
      });

      const newState = live(
        currentState,
        toggleClock(
          gameId,
          /*gameAllowsToggle =*/ true,
          /*currentPeriod =*/ 1,
          timeStartPlus1Minute55,
          /*isRunning =*/ true,
        ),
      );

      const newGame = getGame(newState, gameId);
      expect(newGame?.clock).to.deep.include({
        periodStartTime: timeStartPlus10,
        timer: {
          isRunning: true,
          startTime: timeStartPlus1Minute55,
          duration: Duration.zero().toJSON(),
        },
      });

      expect(newState).not.to.equal(currentState);
    });

    it('should start when timer is not running and stop the stoppage timer', () => {
      mockTimeProvider(timeStartPlus10);
      const currentGame = getGame(currentState, gameId)!;
      currentGame.clock = buildClock(
        buildStoppedTimer(),
        {
          periodStartTime: startTime,
          periodStatus: PeriodStatus.Running,
        },
        buildRunningTimer(startTime),
      );

      const newState = live(
        currentState,
        toggleClock(
          gameId,
          /*gameAllowsToggle =*/ true,
          /*currentPeriod =*/ 1,
          timeStartPlus10,
          /*isRunning =*/ true,
        ),
      );

      const newGame = getGame(newState, gameId);
      expect(newGame?.clock).to.deep.include({
        periodStartTime: startTime,
        timer: {
          isRunning: true,
          startTime: timeStartPlus10,
          duration: Duration.zero().toJSON(),
        },
        stoppageTimer: {
          isRunning: false,
          startTime: undefined,
          duration: Duration.create(10).toJSON(),
        },
      });

      expect(newState).not.to.equal(currentState);
    });

    it('should stop when timer is already running', () => {
      mockTimeProvider(timeStartPlus10);
      const currentGame = getGame(currentState, gameId)!;
      currentGame.clock = buildClock(buildRunningTimer(timeStartPlus5), {
        periodStatus: PeriodStatus.Running,
      });

      const newState = live(
        currentState,
        toggleClock(
          gameId,
          /*gameAllowsToggle =*/ true,
          /*currentPeriod =*/ 1,
          timeStartPlus10,
          /*isRunning =*/ false,
        ),
      );

      const newGame = getGame(newState, gameId);
      expect(newGame?.clock).to.deep.include({
        periodStatus: PeriodStatus.Running,
        timer: {
          isRunning: false,
          startTime: undefined,
          duration: Duration.create(5).toJSON(),
        },
        stoppageTimer: {
          isRunning: true,
          startTime: timeStartPlus10,
          duration: Duration.zero().toJSON(),
        },
      });

      expect(newState).not.to.equal(currentState);
    });

    it('should stop when running and add to existing duration', () => {
      mockTimeProvider(timeStartPlus10);
      const originalPeriodStartTime = startTime - 20 * 1000;
      const currentGame = getGame(currentState, gameId)!;
      currentGame.clock = buildClock(buildRunningTimer(startTime, /*elapsedSeconds=*/ 20), {
        periodStartTime: originalPeriodStartTime,
        periodStatus: PeriodStatus.Running,
      });

      const newState = live(
        currentState,
        toggleClock(
          gameId,
          /*gameAllowsToggle =*/ true,
          /*currentPeriod =*/ 1,
          timeStartPlus10,
          /*isRunning =*/ false,
        ),
      );

      const newGame = getGame(newState, gameId);
      expect(newGame?.clock).to.deep.include({
        periodStartTime: originalPeriodStartTime,
        timer: {
          isRunning: false,
          startTime: undefined,
          duration: Duration.create(30).toJSON(),
        },
      });

      expect(newState).not.to.equal(currentState);
    });

    it('should stop when running and add to previous stoppages', () => {
      mockTimeProvider(timeStartPlus10);
      const originalPeriodStartTime = startTime - 20 * 1000;
      const currentGame = getGame(currentState, gameId)!;
      currentGame.clock = buildClock(
        buildRunningTimer(startTime, /*elapsedSeconds=*/ 20),
        {
          periodStartTime: originalPeriodStartTime,
          periodStatus: PeriodStatus.Running,
        },
        buildStoppedTimer(15),
      );

      const newState = live(
        currentState,
        toggleClock(
          gameId,
          /*gameAllowsToggle =*/ true,
          /*currentPeriod =*/ 1,
          timeStartPlus10,
          /*isRunning =*/ false,
        ),
      );

      const newGame = getGame(newState, gameId);
      expect(newGame?.clock).to.deep.include({
        periodStartTime: originalPeriodStartTime,
        timer: {
          isRunning: false,
          startTime: undefined,
          duration: Duration.create(30).toJSON(),
        },
        stoppageTimer: {
          isRunning: true,
          startTime: timeStartPlus10,
          duration: Duration.create(15).toJSON(),
        },
      });

      expect(newState).not.to.equal(currentState);
    });

    it('should not change the period when timer is set to not running', () => {
      mockTimeProvider(timeStartPlus10);
      const currentGame = getGame(currentState, gameId)!;
      currentGame.clock = buildClock(buildStoppedTimer(), {
        currentPeriod: 1,
        periodStartTime: startTime,
        periodStatus: PeriodStatus.Running,
      });

      const newState = live(
        currentState,
        toggleClock(
          gameId,
          /*gameAllowsToggle =*/ true,
          /*currentPeriod =*/ 1,
          timeStartPlus10,
          /*isRunning =*/ false,
        ),
      );

      const newGame = getGame(newState, gameId);
      expect(newGame?.clock).to.deep.include({
        currentPeriod: 1,
        periodStartTime: startTime,
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
      currentGame.clock = buildClock(buildRunningTimer(timeStartPlus5), {
        currentPeriod: 2,
        periodStartTime: startTime,
        periodStatus: PeriodStatus.Running,
      });

      const newState = live(
        currentState,
        toggleClock(
          gameId,
          /*gameAllowsToggle =*/ true,
          /*currentPeriod =*/ 1,
          timeStartPlus10,
          /*isRunning =*/ false,
        ),
      );

      const newGame = getGame(newState, gameId);
      expect(newGame?.clock).to.deep.include({
        currentPeriod: 2,
        periodStartTime: startTime,
        periodStatus: PeriodStatus.Running,
      });

      expect(newState).not.to.equal(currentState);
      // Check the timer to make sure the toggle happened, but the values don't
      // matter for this test.
      expect(newGame?.clock?.timer).not.to.equal(currentGame.clock?.timer);
    });
  }); // describe('live/toggle')
});
