import { ClockToggleEvent, ClockToggleDetail, LineupGameClock } from '@app/components/lineup-game-clock';
import '@app/components/lineup-game-clock.js';
import { IconButtonToggle } from '@material/mwc-icon-button-toggle';
import { expect, fixture, oneEvent } from '@open-wc/testing';

describe('lineup-game-clock tests', () => {
  let el: LineupGameClock;
  beforeEach(async () => {
    el = await fixture('<lineup-game-clock></lineup-game-clock>');
  });

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

    expect(el).shadowDom.to.equalSnapshot();
  });

  it('fires event when clock is toggled on', async () => {
    await el.updateComplete;

    const toggle = getToggleButton();

    expect(toggle.on, 'Start/stop button should be in stopped state').to.be.false;

    setTimeout(() => getClickableButton(toggle).click());
    const { detail } = await oneEvent(el, ClockToggleEvent.eventName);

    expect((detail as ClockToggleDetail).isStarted, 'Clock should be started').to.be.true;
  });

  // TODO: Log issue/figure out error with aria-hidden-focus on button.
  it.skip('a11y', async () => {
    await expect(el).to.be.accessible();
  });
});
