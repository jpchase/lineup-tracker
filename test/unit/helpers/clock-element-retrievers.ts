import { LineupGameClock } from "@app/components/lineup-game-clock.js";
import { Button } from "@material/mwc-button";
import { Dialog } from "@material/mwc-dialog";
import { IconButton } from "@material/mwc-icon-button";
import { IconButtonToggle } from "@material/mwc-icon-button-toggle";
import { Radio } from "@material/mwc-radio";
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

export function getClockEndOverdueDialog(el: LineupGameClock) {
  const element = el.shadowRoot!.querySelector('#end-overdue-dialog');
  expect(element, 'Missing overdue dialog').to.be.ok;
  return element as Dialog;
}

export function getClockEndOverdueRetroactiveOption(el: LineupGameClock) {
  const element = el.shadowRoot!.querySelector('#overdue-retro-radio');
  expect(element, 'Missing retroactive overdue option').to.be.ok;
  return element as Radio;
}

export function getClockEndOverdueExtraMinutes(el: LineupGameClock) {
  const element = el.shadowRoot!.querySelector('#overdue-minutes-field > input');
  expect(element, 'Missing overdue minutes field').to.be.ok;
  return element as HTMLInputElement;
}

export function getClockEndOverdueSaveButton(el: LineupGameClock) {
  const overdueDialog = getClockEndOverdueDialog(el);
  const saveButton = overdueDialog.querySelector('mwc-button[dialogAction="save"]');
  expect(saveButton, 'Missing save button for overdue dialog').to.be.ok;
  return saveButton as HTMLElement;
}
