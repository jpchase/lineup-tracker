import '@app/components/lineup-game-clock.js';
import { ClockEndPeriodEvent, ClockStartPeriodEvent, ClockToggleDetail, ClockToggleEvent, LineupGameClock } from '@app/components/lineup-game-clock.js';
import { Duration } from '@app/models/clock.js';
import { PeriodStatus } from '@app/models/live.js';
import { Dialog } from '@material/mwc-dialog';
import { aTimeout, expect, fixture, nextFrame, oneEvent } from '@open-wc/testing';
import sinon from 'sinon';
import { ClockEndPeriodDetail } from '../../../src/components/lineup-game-clock.js';
import {
  getClockEndOverdueDialog, getClockEndOverdueExtraMinutes,
  getClockEndOverdueRetroactiveOption, getClockEndOverdueSaveButton,
  getClockEndPeriodButton, getClockStartPeriodButton, getClockToggleButton
} from '../helpers/clock-element-retrievers.js';
import { addElementAssertions } from '../helpers/element-assertions.js';
import { Radio } from '@material/mwc-radio';

const CORE_CONTENT = {
  ignoreTags: ['mwc-dialog'],
};

describe('lineup-game-clock tests', () => {
  let el: LineupGameClock;
  let fakeClock: sinon.SinonFakeTimers;
  const startTime = new Date(2016, 0, 1, 14, 0, 0).getTime();

  before(async () => {
    addElementAssertions();
  });

  beforeEach(async () => {
    el = await fixture('<lineup-game-clock></lineup-game-clock>');
  });

  afterEach(async () => {
    if (fakeClock) {
      fakeClock.restore();
    }
  });

  function mockTimeProvider(t0: number) {
    fakeClock = sinon.useFakeTimers({ now: t0 });
  }

  function getPeriodElement() {
    const element = el.shadowRoot!.querySelector('#game-period');
    expect(element, 'Missing period element').to.be.ok;
    return element as HTMLElement;
  }

  function getTimerElement() {
    const element = el.shadowRoot!.querySelector('#period-timer');
    expect(element, 'Missing timer element').to.be.ok;
    return element as HTMLElement;
  }

  function getOverdueElement() {
    const element = el.shadowRoot!.querySelector('#period-overdue');
    expect(element, 'Missing overdue element').to.be.ok;
    return element as HTMLElement;
  }

  function getEndOverdueDialog() {
    return getClockEndOverdueDialog(el);
  }

  function getToggleButton() {
    return getClockToggleButton(el);
  }

  function getStartPeriodButton() {
    return getClockStartPeriodButton(el);
  }

  function getEndPeriodButton() {
    return getClockEndPeriodButton(el);
  }

  describe('button states', () => {
    it('only Start button shown when first period is ready to be started', async () => {
      el.timerData = {
        isRunning: false,
        startTime: startTime,
        duration: Duration.zero().toJSON()
      };
      el.periodData = {
        currentPeriod: 0,
        periodLength: 10,
        periodStatus: PeriodStatus.Pending
      }
      await el.updateComplete;

      const startButton = getStartPeriodButton();
      expect(startButton.hidden, 'startButton.hidden').to.be.false;

      const endButton = getEndPeriodButton();
      expect(endButton.hidden, 'endButton.hidden').to.be.true;

      const toggleButton = getToggleButton();
      expect(toggleButton.hidden, 'toggleButton.hidden').to.be.true;

      await expect(el).shadowDom.to.equalSnapshot(CORE_CONTENT);
      await expect(el).to.be.accessible();
    });

    it('only Start button shown during break before next period (at halftime)', async () => {
      el.timerData = {
        isRunning: false,
        startTime: startTime,
        duration: Duration.zero().toJSON()
      };
      el.periodData = {
        currentPeriod: 1,
        periodLength: 10,
        periodStatus: PeriodStatus.Pending
      }
      await el.updateComplete;

      const startButton = getStartPeriodButton();
      expect(startButton.hidden, 'startButton.hidden').to.be.false;

      const endButton = getEndPeriodButton();
      expect(endButton.hidden, 'endButton.hidden').to.be.true;

      const toggleButton = getToggleButton();
      expect(toggleButton.hidden, 'toggleButton.hidden').to.be.true;
    });

    it('only End and toggle buttons shown when period in progress', async () => {
      // Timer is not started, so that the displayed time is fixed at 2:10.
      // If running, would need to mock the time to get a stable value. For
      // some reason, mocking the time causes the accessibility assertion to
      // hang, leading to a test timeout.
      el.timerData = {
        isRunning: false,
        startTime: startTime,
        duration: Duration.create(130).toJSON()
      };
      el.periodData = {
        currentPeriod: 1,
        periodLength: 10,
        periodStatus: PeriodStatus.Running
      }
      await el.updateComplete;

      const startButton = getStartPeriodButton();
      expect(startButton.hidden, 'startButton.hidden').to.be.true;

      const endButton = getEndPeriodButton();
      expect(endButton.hidden, 'endButton.hidden').to.be.false;

      const toggleButton = getToggleButton();
      expect(toggleButton.hidden, 'toggleButton.hidden').to.be.false;

      await expect(el).shadowDom.to.equalSnapshot(CORE_CONTENT);
      await expect(el).to.be.accessible();
    });

    it('Late warning, End and toggle buttons shown when period is overdue', async () => {
      // Timer is not started, so that the displayed time is fixed at 22:15.
      // If running, would need to mock the time to get a stable value. For
      // some reason, mocking the time causes the accessibility assertion to
      // hang, leading to a test timeout.
      el.timerData = {
        isRunning: false,
        startTime: startTime,
        duration: Duration.create(1335).toJSON()
      };
      el.periodData = {
        currentPeriod: 1,
        periodLength: 20,
        periodStatus: PeriodStatus.Overdue
      }
      await el.updateComplete;

      const startButton = getStartPeriodButton();
      expect(startButton.hidden, 'startButton.hidden').to.be.true;

      const endButton = getEndPeriodButton();
      expect(endButton.hidden, 'endButton.hidden').to.be.false;

      const toggleButton = getToggleButton();
      expect(toggleButton.hidden, 'toggleButton.hidden').to.be.false;

      const overdueElement = getOverdueElement();
      expect(overdueElement.hidden, 'period-overdue.hidden').to.be.false;

      await expect(el).shadowDom.to.equalSnapshot(CORE_CONTENT);
      await expect(el).to.be.accessible();
    });

    it('all buttons hidden when game is done', async () => {
      el.timerData = {
        isRunning: false,
        startTime: startTime,
        duration: Duration.create(600).toJSON()
      };
      el.periodData = {
        currentPeriod: 2,
        periodLength: 10,
        periodStatus: PeriodStatus.Done
      }
      await el.updateComplete;

      const startButton = getStartPeriodButton();
      expect(startButton.hidden, 'startButton.hidden').to.be.true;

      const endButton = getEndPeriodButton();
      expect(endButton.hidden, 'endButton.hidden').to.be.true;

      const toggleButton = getToggleButton();
      expect(toggleButton.hidden, 'toggleButton.hidden').to.be.true;

      await expect(el).shadowDom.to.equalSnapshot(CORE_CONTENT);
      await expect(el).to.be.accessible();
    });

  }); // describe('button states')

  describe('toggle', () => {
    it('starts with clock not running', async () => {
      const toggle = getToggleButton();
      expect(toggle.on, 'Restart/pause button should be in stopped state').to.be.false;

      const timerElement = getTimerElement();
      expect(timerElement.innerText, 'Timer text').to.be.empty;

      await expect(el).shadowDom.to.equalSnapshot(CORE_CONTENT);
    });

    it('fires event when clock is toggled on', async () => {
      const toggle = getToggleButton();
      expect(toggle.on, 'Restart/pause button should be in stopped state').to.be.false;

      setTimeout(() => toggle.click());
      const { detail } = await oneEvent(el, ClockToggleEvent.eventName);

      expect((detail as ClockToggleDetail).isStarted, 'Clock should be started').to.be.true;
    });

    it('starts running when timer data is running', async () => {
      mockTimeProvider(startTime);
      el.timerData = {
        isRunning: true,
        startTime: startTime,
        duration: Duration.zero().toJSON()
      };
      await el.updateComplete;

      const toggle = getToggleButton();
      expect(toggle.on, 'Restart/pause button should be in started state').to.be.true;

      const timerElement = getTimerElement();
      expect(timerElement.innerText, 'Initial running timer text').to.equal('00:00');

      // Advance the clock by just over a minute, and allow timers to run to update.
      fakeClock.tick('01:05');
      fakeClock.next();
      await el.updateComplete;

      expect(timerElement.innerText, 'Updated timer text').to.equal('01:05');
      await expect(el).shadowDom.to.equalSnapshot(CORE_CONTENT);
    });

    it('fires event when clock is toggled off', async () => {
      el.timerData = {
        isRunning: true,
        startTime: startTime,
        duration: Duration.zero().toJSON()
      };
      await el.updateComplete;

      const toggle = getToggleButton();

      setTimeout(() => toggle.click());
      const { detail } = await oneEvent(el, ClockToggleEvent.eventName);

      expect((detail as ClockToggleDetail).isStarted, 'Clock should be stopped').to.be.false;

      expect(toggle.on, 'Restart/pause button should be in stopped state').to.be.false;
    });

    it('stops running when timer data is stopped', async () => {
      mockTimeProvider(startTime);
      el.timerData = {
        isRunning: true,
        startTime: startTime,
        duration: Duration.zero().toJSON()
      };
      await el.updateComplete;

      const toggle = getToggleButton();
      expect(toggle.on, 'Restart/pause button should be in started state').to.be.true;

      // Set the clock to stopped.
      el.timerData = {
        isRunning: false,
        startTime: startTime,
        duration: Duration.create(30).toJSON()
      };
      await el.updateComplete;

      const timerElement = getTimerElement();
      expect(timerElement.innerText, 'Stopped timer text').to.equal('00:30');
      await expect(el).shadowDom.to.equalSnapshot(CORE_CONTENT);
    });
  });  // describe('toggle')

  describe('start period', () => {
    it('fires start event when pressed', async () => {
      el.timerData = {
        isRunning: false,
        startTime: startTime,
        duration: Duration.zero().toJSON()
      };
      el.periodData = {
        currentPeriod: 0,
        periodLength: 10,
        periodStatus: PeriodStatus.Pending
      }
      await el.updateComplete;

      const startButton = getStartPeriodButton();

      setTimeout(() => startButton.click());
      await oneEvent(el, ClockStartPeriodEvent.eventName);

      const periodElement = getPeriodElement();
      expect(periodElement.innerText, 'Game period text').to.equal('Period: 1');
    });

  }); // describe('start period')

  describe('end period', () => {
    it('fires end event when pressed with clock running', async () => {
      el.timerData = {
        isRunning: true,
        startTime: startTime,
        duration: Duration.zero().toJSON()
      };
      el.periodData = {
        currentPeriod: 1,
        periodLength: 10,
        periodStatus: PeriodStatus.Running
      }
      await el.updateComplete;

      const endButton = getEndPeriodButton();

      setTimeout(() => endButton.click());
      await oneEvent(el, ClockEndPeriodEvent.eventName);

      const periodElement = getPeriodElement();
      expect(periodElement.innerText, 'Game period text').to.equal('Period: 1');
    });

    it('fires end event when pressed with clock paused', async () => {
      el.timerData = {
        isRunning: false,
        startTime: startTime,
        duration: Duration.zero().toJSON()
      };
      el.periodData = {
        currentPeriod: 1,
        periodLength: 10,
        periodStatus: PeriodStatus.Running
      }
      await el.updateComplete;

      const endButton = getEndPeriodButton();

      setTimeout(() => endButton.click());
      await oneEvent(el, ClockEndPeriodEvent.eventName);
    });

    it('shows dialog instead of firing end event when period overdue', async () => {
      el.timerData = {
        isRunning: false,
        startTime: startTime,
        duration: Duration.create(11 * 60).toJSON()
      };
      el.periodData = {
        currentPeriod: 1,
        periodLength: 10,
        periodStatus: PeriodStatus.Overdue
      }
      await el.updateComplete;

      const endButton = getEndPeriodButton();
      setTimeout(() => endButton!.click());
      await oneEvent(endButton!, 'click');

      const overdueDialog = getEndOverdueDialog();
      expect(overdueDialog, 'after end period clicked').to.be.open;

      await expect(el).shadowDom.to.equalSnapshot();
      // TODO: Figure out field accessibility errors when using new material components
      // await expect(el).to.be.accessible();
    });

    describe('overdue', () => {
      let overdueDialog: Dialog;

      beforeEach(async () => {
        el.timerData = {
          isRunning: true,
          startTime: startTime,
          duration: Duration.zero().toJSON()
        };
        el.periodData = {
          currentPeriod: 1,
          periodLength: 10,
          periodStatus: PeriodStatus.Overdue
        }
        await el.updateComplete;

        const endButton = getEndPeriodButton();
        setTimeout(() => endButton!.click());
        await oneEvent(endButton!, 'click');

        overdueDialog = getEndOverdueDialog();
        expect(overdueDialog, 'after end click').to.be.open;
      });

      it.skip('clears fields when overdue dialog shown again', () => {
        expect.fail();
      });

      it.skip('validates fields when overdue dialog saved', () => {
        expect.fail();
      });

      it('does not fire end event when overdue dialog cancelled', async () => {
        // Listen for end event
        let eventFired = false;
        const handler = function () {
          eventFired = true;
          el.removeEventListener(ClockEndPeriodEvent.eventName, handler);
        };
        el.addEventListener(ClockEndPeriodEvent.eventName, handler);

        const cancelButton = overdueDialog.querySelector('mwc-button[dialogAction="close"]') as HTMLElement;
        setTimeout(() => cancelButton!.click());
        await oneEvent(cancelButton!, 'click');
        await nextFrame();
        await aTimeout(100);

        expect(overdueDialog, 'after cancel click').not.to.be.open;
        expect(eventFired, 'End period event should not be fired').to.be.false;
      });

      it('fires end event for overdue period when dialog saved for current time', async () => {
        // Check that the "current time" option is the default.
        const useCurrent = el.shadowRoot!.querySelector('#overdue-current-radio') as Radio;
        expect(useCurrent, 'Missing current overdue option').to.be.ok;
        expect(useCurrent.checked, 'Current option should be checked by default').to.be.true;

        const saveButton = overdueDialog.querySelector('mwc-button[dialogAction="save"]') as HTMLElement;
        setTimeout(() => saveButton.click());

        const { detail } = await oneEvent(el, ClockEndPeriodEvent.eventName);
        expect((detail as ClockEndPeriodDetail).extraMinutes, 'Extra minutes should not be set').to.not.be.ok;
      });

      it('fires end event with extra minutes for overdue period when dialog saved for retroactive time', async () => {
        // The retroactive/extra minutes fields are not initially set/available.
        const useRetroactive = getClockEndOverdueRetroactiveOption(el);
        expect(useRetroactive.checked, 'Retroactive option should not be checked initially').to.be.false;

        const extraMinutesField = getClockEndOverdueExtraMinutes(el);
        expect(extraMinutesField.disabled, 'Extra minutes field should be disabled initially').to.be.true;

        // Set the retroactive option.
        setTimeout(() => useRetroactive.click());
        await oneEvent(useRetroactive, 'click');
        await el.updateComplete;

        expect(useRetroactive.checked, 'Retroactive option should now be checked').to.be.true;
        expect(extraMinutesField.disabled, 'Extra minutes field should now be enabled').to.be.false;
        // await expect(overdueDialog).to.be.accessible();

        extraMinutesField.value = "3";

        const saveButton = getClockEndOverdueSaveButton(el);
        setTimeout(() => saveButton.click());

        const { detail } = await oneEvent(el, ClockEndPeriodEvent.eventName);
        expect((detail as ClockEndPeriodDetail).extraMinutes, 'Event extra minutes should be set to input value').to.equal(3);
      });
    }); // describe('overdue')
  }); // describe('end period')

  it('a11y', async () => {
    await expect(el).to.be.accessible();
  });
});
