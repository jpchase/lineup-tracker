import { LineupGameClock } from "@app/components/lineup-game-clock.js";
import { Button } from "@material/mwc-button";
import { IconButton } from "@material/mwc-icon-button";
import { IconButtonToggle } from "@material/mwc-icon-button-toggle";
import { expect } from "@open-wc/testing";

export function getClockToggleButton(el: LineupGameClock) {
  const toggle = el.shadowRoot!.querySelector('#toggle-button');
  expect(toggle, 'Missing toggle button for clock').to.be.ok;
  return toggle as IconButtonToggle;
}

export function getClockStartPeriodButton(el: LineupGameClock) {
  const button = el.shadowRoot!.querySelector('#start-button');
  expect(button, 'Missing start period button for clock').to.be.ok;
  return button as Button;
}

export function getClockEndPeriodButton(el: LineupGameClock) {
  const button = el.shadowRoot!.querySelector('#end-button');
  expect(button, 'Missing end period button for clock').to.be.ok;
  return button as IconButton;
}
