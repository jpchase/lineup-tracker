import { ClockToggleDetail, ClockToggleEvent, LineupGameClock } from '@app/components/lineup-game-clock';
import '@app/components/lineup-game-clock.js';
import { Duration } from '@app/models/clock';
import { IconButtonToggle } from '@material/mwc-icon-button-toggle';
import { expect, fixture, oneEvent } from '@open-wc/testing';
import * as sinon from 'sinon';

describe('lineup-game-clock tests', () => {
  let el: LineupGameClock;
  let fakeClock: sinon.SinonFakeTimers;
  const startTime = new Date(2016, 0, 1, 14, 0, 0).getTime();

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

  function getTimerElement() {
    const element = el.shadowRoot!.querySelector('#periodTimer');
    expect(element, 'Missing timer element').to.be.ok;
    return element as HTMLElement;
  }

  function getToggleButton() {
    const toggle = el.shadowRoot!.querySelector('mwc-icon-button-toggle');
    expect(toggle, 'Missing toggle button for clock').to.be.ok;
    return toggle as IconButtonToggle;
  }

  function getClickableButton(toggle: IconButtonToggle) {
    // Get the internal button that actually handles the clicks.
    const button = toggle?.shadowRoot?.querySelector('button');
    expect(button, 'Missing clickable button for clock toggle').to.be.ok;
    return button as HTMLButtonElement;
  }

  it('starts with clock not running', () => {
    const toggle = getToggleButton();
    expect(toggle.on, 'Start/stop button should be in stopped state').to.be.false;

    const timerElement = getTimerElement();
    expect(timerElement.innerText, 'Timer text').to.be.empty;

    expect(el).shadowDom.to.equalSnapshot();
  });

  it('fires event when clock is toggled on', async () => {
    const toggle = getToggleButton();
    expect(toggle.on, 'Start/stop button should be in stopped state').to.be.false;

    setTimeout(() => getClickableButton(toggle).click());
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
    expect(toggle.on, 'Start/stop button should be in started state').to.be.true;

    const timerElement = getTimerElement();
    expect(timerElement.innerText, 'Initial running timer text').to.equal('00:00');

    // Advance the clock by just over a minute, and allow timers to run to update.
    fakeClock.tick('01:05');
    fakeClock.next();
    await el.updateComplete;

    expect(timerElement.innerText, 'Updated timer text').to.equal('01:05');
    expect(el).shadowDom.to.equalSnapshot();
  });

  it('fires event when clock is toggled off', async () => {
    el.timerData = {
      isRunning: true,
      startTime: startTime,
      duration: Duration.zero().toJSON()
    };
    await el.updateComplete;

    const toggle = getToggleButton();

    setTimeout(() => getClickableButton(toggle).click());
    const { detail } = await oneEvent(el, ClockToggleEvent.eventName);

    expect((detail as ClockToggleDetail).isStarted, 'Clock should be stopped').to.be.false;

    expect(toggle.on, 'Start/stop button should be in stopped state').to.be.false;
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
    expect(toggle.on, 'Start/stop button should be in started state').to.be.true;

    // Set the clock to stopped.
    el.timerData = {
      isRunning: false,
      startTime: startTime,
      duration: Duration.create(30).toJSON()
    };
    await el.updateComplete;

    const timerElement = getTimerElement();
    expect(timerElement.innerText, 'Stopped timer text').to.equal('00:30');
    expect(el).shadowDom.to.equalSnapshot();
  });

  // TODO: Log issue/figure out error with aria-hidden-focus on button.
  it.skip('a11y', async () => {
    await expect(el).to.be.accessible();
  });
});
