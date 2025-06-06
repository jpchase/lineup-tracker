/** @format */

import { RootState, setupStore } from '@app/app/store.js';
import { ClockEndPeriodEvent, LineupGameClock } from '@app/components/lineup-game-clock.js';
import { EventsUpdatedEvent } from '@app/components/lineup-game-events.js';
import '@app/components/lineup-game-live.js';
import { LineupGameLive } from '@app/components/lineup-game-live.js';
import { LineupOnPlayerList } from '@app/components/lineup-on-player-list.js';
import { LineupPlayerCard } from '@app/components/lineup-player-card.js';
import { LineupPlayerList } from '@app/components/lineup-player-list.js';
import { FormationType } from '@app/models/formation.js';
import { GameDetail, GameStatus } from '@app/models/game.js';
import {
  GameEventCollection,
  LiveGame,
  LivePlayer,
  PeriodStatus,
  getPlayer,
} from '@app/models/live.js';
import { PlayerStatus } from '@app/models/player.js';
import {
  endPeriodCreator,
  eventSelected,
  eventUpdateRequested,
  eventsUpdated,
  selectLiveGameById,
} from '@app/slices/live/index.js';
import { actions as liveActions } from '@app/slices/live/live-slice.js';
import { Button } from '@material/mwc-button';
import { aTimeout, expect, fixture, html, nextFrame, oneEvent } from '@open-wc/testing';
import sinon from 'sinon';
import { ActionLogger } from '../helpers/action-logger.js';
import {
  getClockEndOverdueExtraMinutes,
  getClockEndOverdueRetroactiveOption,
  getClockEndOverdueSaveButton,
  getClockEndPeriodButton,
  getClockStartPeriodButton,
  getClockToggleButton,
} from '../helpers/clock-element-retrievers.js';
import { buildGameStateWithCurrentGame } from '../helpers/game-state-setup.js';
import {
  buildClock,
  buildEventState,
  buildLiveStateWithCurrentGame,
  buildShiftWithTrackersFromGame,
} from '../helpers/live-state-setup.js';
import { buildRootState } from '../helpers/root-state-setup.js';
import { buildRunningTimer, manualTimeProvider } from '../helpers/test-clock-data.js';
import { buildGameEvents } from '../helpers/test-event-data.js';
import * as testlive from '../helpers/test-live-game-data.js';
import { buildRoster, getNewGameDetail } from '../helpers/test_data.js';

const {
  applyPendingSubs,
  cancelSub,
  cancelSwap,
  confirmSub,
  confirmSwap,
  discardPendingSubs,
  endPeriod,
  gameCompleted,
  markPeriodOverdue,
  markPlayerOut,
  returnOutPlayer,
  selectPlayer,
  startPeriod,
  toggleClock,
} = liveActions;

function getGameDetail(): { game: GameDetail; live: LiveGame } {
  const live = testlive.getLiveGameWithPlayers();
  const game = getNewGameDetail(buildRoster(live.players));
  game.status = live.status = GameStatus.Start;
  return { game, live };
}

function findPlayer(game: LiveGame, status: PlayerStatus) {
  return game.players!.find((player) => player.status === status);
}

describe('lineup-game-live tests', () => {
  let el: LineupGameLive;
  let dispatchStub: sinon.SinonSpy;
  let actionLogger: ActionLogger;
  beforeEach(async () => {
    actionLogger = new ActionLogger();
    actionLogger.setup();

    await setupElement();
  });

  afterEach(async () => {
    sinon.restore();
  });

  async function setupElement(preloadedState?: RootState, gameId?: string) {
    const store = setupStore(preloadedState, /*hydrate=*/ false);

    const template = html`<lineup-game-live
      .gameId="${gameId}"
      .store="${store}"
    ></lineup-game-live>`;
    el = await fixture(template);
    dispatchStub = sinon.spy(el, 'dispatch');
  }

  function getStore() {
    return el.store!;
  }

  function getClockElement(): LineupGameClock {
    const element = el.shadowRoot!.querySelector('lineup-game-clock');
    expect(element, 'Missing clock element').to.be.ok;

    return element as LineupGameClock;
  }

  function getCompleteButton() {
    const button = el.shadowRoot!.querySelector('#complete-button');
    expect(button, 'Missing complete button').to.be.ok;
    return button as Button;
  }

  function getPlayerElement(list: LineupPlayerList, player: LivePlayer): LineupPlayerCard {
    const items = list.shadowRoot!.querySelectorAll('lineup-player-card');

    let playerElement: LineupPlayerCard | undefined;
    for (const element of Array.from(items)) {
      const playerCard = element as LineupPlayerCard;

      if (playerCard.player && playerCard.player.id === player.id) {
        playerElement = playerCard;
        break;
      }
    }

    expect(playerElement, `Missing element for player, id = ${player.id}`).to.be.ok;
    return playerElement!;
  }

  function getOnPlayerElement(list: LineupOnPlayerList, player: LivePlayer): LineupPlayerCard {
    const items = list.shadowRoot!.querySelectorAll('lineup-player-card');

    let playerElement: LineupPlayerCard | undefined;
    for (const element of Array.from(items)) {
      const playerCard = element as LineupPlayerCard;

      if (playerCard.data && playerCard.data.player && playerCard.data.player.id === player.id) {
        playerElement = playerCard;
        break;
      }
    }

    expect(playerElement, `Missing element for player, id = ${player.id}`).to.be.ok;
    return playerElement!;
  }

  function getPlayerSection(mode: string): HTMLDivElement {
    const section = el.shadowRoot!.querySelector(`#live-${mode}`);
    expect(section, `Missing section for mode ${mode}`).to.be.ok;

    return section as HTMLDivElement;
  }

  function getPlayingList(): LineupOnPlayerList {
    const element = el.shadowRoot!.querySelector('lineup-on-player-list');
    expect(element, 'Missing playing (on) player list').to.be.ok;

    return element as LineupOnPlayerList;
  }

  function getNextList(): LineupPlayerList {
    const element = el.shadowRoot!.querySelector('lineup-player-list[mode="next"]');
    expect(element, 'Missing next player list').to.be.ok;

    return element as LineupPlayerList;
  }

  function getSubsList(): LineupPlayerList {
    const element = el.shadowRoot!.querySelector('lineup-player-list[mode="off"]');
    expect(element, 'Missing subs player list').to.be.ok;

    return element as LineupPlayerList;
  }

  function getOutList(): LineupPlayerList {
    const element = el.shadowRoot!.querySelector('lineup-player-list[mode="out"]');
    expect(element, 'Missing subs player list').to.be.ok;

    return element as LineupPlayerList;
  }

  it('shows no game placeholder when no current game', async () => {
    const store = getStore();
    expect(store.getState().live, 'LiveState should exist').to.be.ok;

    const placeholder = el.shadowRoot!.querySelector('div p.empty-list');
    expect(placeholder, 'Missing empty placeholder element').to.be.ok;

    await expect(el).shadowDom.to.equalSnapshot();
  });

  it('shows all player sections for started game', async () => {
    const { game, live } = getGameDetail();
    const gameState = buildGameStateWithCurrentGame(game);
    const liveState = buildLiveStateWithCurrentGame(live);

    await setupElement(buildRootState(gameState, liveState), live.id);
    await el.updateComplete;

    const onPlayers = getPlayerSection('on');
    expect(onPlayers.hidden, 'Section for on should be shown').to.be.false;

    const nextPlayers = getPlayerSection('next');
    expect(nextPlayers.hidden, 'Section for next should be shown').to.be.false;

    const offPlayers = getPlayerSection('off');
    expect(offPlayers.hidden, 'Section for off should be shown').to.be.false;

    const outPlayers = getPlayerSection('out');
    expect(outPlayers.hidden, 'Section for out should be shown').to.be.false;

    await expect(el).shadowDom.to.equalSnapshot();
    await expect(el).to.be.accessible();
  }).timeout(4000); // The accessibility check often takes > 2s.

  describe('Subs', () => {
    const ON_PLAYER_ID = 'P0';
    const ON_PLAYER2_ID = 'P1';
    const OFF_PLAYER_ID = 'P13';
    const OFF_PLAYER2_ID = 'P14';
    let liveGame: LiveGame;
    let gameId: string;

    beforeEach(async () => {
      const { game, live } = getGameDetail();

      live.formation = { type: FormationType.F4_3_3 };
      live.status = GameStatus.Live;
      live.clock = buildClock(buildRunningTimer(), {
        currentPeriod: 1,
        periodStatus: PeriodStatus.Running,
      });
      // This will set the first 11 players to On status, the next 6 to Off status,
      // and the last player to Out status.
      const shift = buildShiftWithTrackersFromGame(live);

      // Setup the live game, with the period in progress.
      const gameState = buildGameStateWithCurrentGame(game);
      const liveState = buildLiveStateWithCurrentGame(live, { shift });

      await setupElement(buildRootState(gameState, liveState), live.id);
      await el.updateComplete;
      liveGame = selectLiveGameById(getStore().getState(), live.id)!;
      gameId = liveGame.id;
    });

    // Sets up a sub that is ready to be confirmed.
    // Returns the confirm button, ready to be clicked.
    async function prepareTentativeSub(onPlayerId: string, offPlayerId: string) {
      const onPlayer = getPlayer(liveGame, onPlayerId)!;
      const offPlayer = getPlayer(liveGame, offPlayerId)!;

      const store = getStore();
      store.dispatch(selectPlayer(gameId, onPlayer.id, /*selected =*/ true));
      store.dispatch(selectPlayer(gameId, offPlayer.id, /*selected =*/ true));
      await el.updateComplete;

      const confirmSection = el.shadowRoot!.querySelector('#confirm-sub');
      expect(confirmSection, 'Missing confirm sub div').to.be.ok;

      const confirmButton = confirmSection!.querySelector('mwc-button.ok') as Button;
      expect(confirmButton, 'Missing confirm button').to.be.ok;

      return confirmButton;
    }

    // Sets up a confirmed sub that is ready to be applied.
    async function preparePendingSub(onPlayerId: string, offPlayerId: string) {
      await prepareTentativeSub(onPlayerId, offPlayerId);

      getStore().dispatch(confirmSub(gameId));
      await el.updateComplete;
    }

    async function preparePendingSwap() {
      const onPlayer = getPlayer(liveGame, ON_PLAYER_ID)!;
      const onPlayer2 = getPlayer(liveGame, ON_PLAYER2_ID)!;

      const store = getStore();
      store.dispatch(selectPlayer(gameId, onPlayer.id, /*selected =*/ true));
      store.dispatch(selectPlayer(gameId, onPlayer2.id, /*selected =*/ true));
      await el.updateComplete;

      const confirmSection = el.shadowRoot!.querySelector('#confirm-swap');
      expect(confirmSection, 'Missing confirm swap element').to.be.ok;

      const confirmButton = confirmSection!.querySelector('mwc-button.ok') as Button;
      expect(confirmButton, 'Missing confirm button').to.be.ok;

      confirmButton.click();

      // Verifies that the confirm swap action was dispatched.
      expect(dispatchStub).to.have.callCount(1);
      expect(actionLogger.lastAction()).to.deep.include(confirmSwap(gameId));
    }

    it('dispatches select player action when off player selected', async () => {
      const foundPlayer = findPlayer(liveGame, PlayerStatus.Off);
      expect(foundPlayer, 'Missing player with off status').to.be.ok;
      const player = foundPlayer!;

      const subsList = getSubsList();
      const playerElement = getPlayerElement(subsList, player);

      // Simulates selection of the player.
      playerElement.click();

      // Verifies that the select player action was dispatched.
      expect(dispatchStub).to.have.callCount(1);
      expect(actionLogger.lastAction()).to.deep.include(
        selectPlayer(gameId, player.id, /*selected =*/ true),
      );
    });

    it('dispatches select player action when on player in formation selected', async () => {
      const foundPlayer = findPlayer(liveGame, PlayerStatus.On);
      expect(foundPlayer, 'Missing player with on status').to.be.ok;
      const player = foundPlayer!;

      const onList = getPlayingList();
      const playerElement = getOnPlayerElement(onList, player);

      // Simulates selection of the position.
      playerElement.click();

      // Verifies that the select player action was dispatched.
      expect(dispatchStub).to.have.callCount(1);
      expect(actionLogger.lastAction()).to.deep.include(
        selectPlayer(gameId, player.id, /*selected =*/ true),
      );
    });

    it('dispatches select player action when out player selected', async () => {
      const foundPlayer = findPlayer(liveGame, PlayerStatus.Out);
      expect(foundPlayer, 'Missing player with out status').to.be.ok;
      const player = foundPlayer!;

      const outList = getOutList();
      const playerElement = getPlayerElement(outList, player);

      // Simulates selection of the player.
      playerElement.click();

      // Verifies that the select player action was dispatched.
      expect(dispatchStub).to.have.callCount(1);
      expect(actionLogger.lastAction()).to.deep.include(
        selectPlayer(gameId, player.id, /*selected =*/ true),
      );
    });

    it('on player card is selected after selection is processed', async () => {
      const foundPlayer = findPlayer(liveGame, PlayerStatus.On);
      expect(foundPlayer, 'Missing player with on status').to.be.ok;
      const player = foundPlayer!;

      const onList = getPlayingList();
      const playerElement = getOnPlayerElement(onList, player);

      // Simulates selection of the position.
      playerElement.click();
      await el.updateComplete;

      expect(playerElement.selected, 'Player card should be selected').to.be.true;
    });

    it('shows confirm sub UI when proposed sub exists', async () => {
      let foundPlayer = findPlayer(liveGame, PlayerStatus.Off);
      expect(foundPlayer, 'Missing player with off status').to.be.ok;
      const offPlayer = foundPlayer!;

      foundPlayer = findPlayer(liveGame, PlayerStatus.On);
      expect(foundPlayer, 'Missing player with on status').to.be.ok;
      const onPlayer = foundPlayer!;

      const store = getStore();
      store.dispatch(selectPlayer(gameId, offPlayer.id, /*selected =*/ true));
      store.dispatch(selectPlayer(gameId, onPlayer.id, /*selected =*/ true));
      await el.updateComplete;

      const confirmSection = el.shadowRoot!.querySelector('#confirm-sub');
      expect(confirmSection, 'Missing confirm sub div').to.be.ok;

      await expect(confirmSection).dom.to.equalSnapshot();
      await expect(confirmSection).to.be.accessible({
        // Disable label-title-only until UI revamped to use MWC components, instead of bare <select>.
        // TODO: Remove this ignored rule after verifying accessibility with new UI
        ignoredRules: ['label-title-only'],
      });
    });

    it('dispatches confirm sub action when confirmed', async () => {
      let foundPlayer = findPlayer(liveGame, PlayerStatus.Off);
      expect(foundPlayer, 'Missing player with off status').to.be.ok;
      const offPlayer = foundPlayer!;

      foundPlayer = findPlayer(liveGame, PlayerStatus.On);
      expect(foundPlayer, 'Missing player with on status').to.be.ok;
      const onPlayer = foundPlayer!;

      const store = getStore();
      store.dispatch(selectPlayer(gameId, offPlayer.id, /*selected =*/ true));
      store.dispatch(selectPlayer(gameId, onPlayer.id, /*selected =*/ true));
      await el.updateComplete;

      const confirmSection = el.shadowRoot!.querySelector('#confirm-sub');
      expect(confirmSection, 'Missing confirm sub div').to.be.ok;

      const applyButton = confirmSection!.querySelector('mwc-button.ok') as Button;
      expect(applyButton, 'Missing apply button').to.be.ok;

      applyButton.click();

      // Verifies that the confirm sub action was dispatched.
      expect(dispatchStub).to.have.callCount(1);
      expect(actionLogger.lastAction()).to.deep.include(confirmSub(gameId));
    });

    it('dispatches confirm sub action with new position when confirmed', async () => {
      const onPlayer = getPlayer(liveGame, 'P0')!;
      const offPlayer = getPlayer(liveGame, 'P11')!;
      const otherPositionPlayer = getPlayer(liveGame, 'P1')!;

      const store = getStore();
      store.dispatch(selectPlayer(gameId, offPlayer.id, /*selected =*/ true));
      store.dispatch(selectPlayer(gameId, onPlayer.id, /*selected =*/ true));
      await el.updateComplete;

      const confirmSection = el.shadowRoot!.querySelector('#confirm-sub');
      expect(confirmSection, 'Missing confirm sub div').to.be.ok;

      const applyButton = confirmSection!.querySelector('mwc-button.ok') as Button;
      expect(applyButton, 'Missing apply button').to.be.ok;

      const positionSelect = confirmSection?.querySelector(
        '#new-position-select',
      ) as HTMLSelectElement;
      expect(positionSelect, 'Missing position select').to.be.ok;

      positionSelect.value = otherPositionPlayer.currentPosition!.id;

      applyButton.click();

      // Verifies that the confirm sub action was dispatched.
      expect(dispatchStub).to.have.callCount(1);
      expect(actionLogger.lastAction()).to.deep.include(
        confirmSub(gameId, otherPositionPlayer.currentPosition),
      );
    });

    it('dispatches cancel sub action when cancelled', async () => {
      let foundPlayer = findPlayer(liveGame, PlayerStatus.Off);
      expect(foundPlayer, 'Missing player with off status').to.be.ok;
      const offPlayer = foundPlayer!;

      foundPlayer = findPlayer(liveGame, PlayerStatus.On);
      expect(foundPlayer, 'Missing player with on status').to.be.ok;
      const onPlayer = foundPlayer!;

      const store = getStore();
      store.dispatch(selectPlayer(gameId, offPlayer.id, /*selected =*/ true));
      store.dispatch(selectPlayer(gameId, onPlayer.id, /*selected =*/ true));
      await el.updateComplete;

      const confirmSection = el.shadowRoot!.querySelector('#confirm-sub');
      expect(confirmSection, 'Missing confirm sub div').to.be.ok;

      const cancelButton = confirmSection!.querySelector('mwc-button.cancel') as Button;
      expect(cancelButton, 'Missing cancel button').to.be.ok;

      cancelButton.click();

      // Verifies that the cancel sub action was dispatched.
      expect(dispatchStub).to.have.callCount(1);
      expect(actionLogger.lastAction()).to.deep.include(cancelSub(gameId));
    });

    it('shows confirm swap UI when proposed swap exists', async () => {
      const onPlayer = getPlayer(liveGame, 'P0')!;
      const onPlayer2 = getPlayer(liveGame, 'P1')!;

      const store = getStore();
      store.dispatch(selectPlayer(gameId, onPlayer.id, /*selected =*/ true));
      store.dispatch(selectPlayer(gameId, onPlayer2.id, /*selected =*/ true));
      await el.updateComplete;

      const confirmSection = el.shadowRoot!.querySelector('#confirm-swap');
      expect(confirmSection, 'Missing confirm swap element').to.be.ok;

      await expect(confirmSection).dom.to.equalSnapshot();
      await expect(confirmSection).to.be.accessible();
    });

    it('dispatches confirm swap action when confirmed', async () => {
      const onPlayer = getPlayer(liveGame, 'P0')!;
      const onPlayer2 = getPlayer(liveGame, 'P1')!;

      const store = getStore();
      store.dispatch(selectPlayer(gameId, onPlayer.id, /*selected =*/ true));
      store.dispatch(selectPlayer(gameId, onPlayer2.id, /*selected =*/ true));
      await el.updateComplete;

      const confirmSection = el.shadowRoot!.querySelector('#confirm-swap');
      expect(confirmSection, 'Missing confirm swap element').to.be.ok;

      const applyButton = confirmSection!.querySelector('mwc-button.ok') as Button;
      expect(applyButton, 'Missing apply button').to.be.ok;

      applyButton.click();

      // Verifies that the apply swap action was dispatched.
      expect(dispatchStub).to.have.callCount(1);
      expect(actionLogger.lastAction()).to.deep.include(confirmSwap(gameId));
    });

    it('dispatches cancel swap action when cancelled', async () => {
      const onPlayer = getPlayer(liveGame, 'P0')!;
      const onPlayer2 = getPlayer(liveGame, 'P1')!;

      const store = getStore();
      store.dispatch(selectPlayer(gameId, onPlayer.id, /*selected =*/ true));
      store.dispatch(selectPlayer(gameId, onPlayer2.id, /*selected =*/ true));
      await el.updateComplete;

      const confirmSection = el.shadowRoot!.querySelector('#confirm-swap');
      expect(confirmSection, 'Missing confirm swap element').to.be.ok;

      const cancelButton = confirmSection!.querySelector('mwc-button.cancel') as Button;
      expect(cancelButton, 'Missing cancel button').to.be.ok;

      cancelButton.click();

      // Verifies that the cancel sub action was dispatched.
      expect(dispatchStub).to.have.callCount(1);
      expect(actionLogger.lastAction()).to.deep.include(cancelSwap(gameId));
    });

    it('shows errors when pending subs are invalid', async () => {
      await preparePendingSwap();

      const onPlayer = getPlayer(liveGame, 'P0')!;
      const onPlayer2 = getPlayer(liveGame, 'P1')!;

      const store = getStore();
      store.dispatch(selectPlayer(gameId, onPlayer.id, /*selected =*/ true));
      store.dispatch(selectPlayer(gameId, onPlayer2.id, /*selected =*/ true));
      await el.updateComplete;

      const applyButton = el.shadowRoot!.querySelector('#sub-apply-btn') as Button;
      expect(applyButton, 'Missing apply button').to.be.ok;

      applyButton.click();
      await el.updateComplete;

      const errorElement = el.shadowRoot!.querySelector('#sub-errors');
      expect(errorElement, 'Missing sub error element').to.be.ok;

      const errorText = errorElement!.querySelector('.error');
      expect(errorText, 'Missing sub error text').to.be.ok;

      const expectedInvalidPositions = [onPlayer.currentPosition?.id, onPlayer2.currentPosition?.id]
        .sort()
        .join(', ');
      expect(
        errorText!.textContent,
        'Sub error text should contain invalid swap positions',
      ).to.contain(expectedInvalidPositions);

      await expect(errorElement).dom.to.equalSnapshot();
      await expect(errorElement).to.be.accessible({
        // Disable color-contrast as colors depend on global styles, which are
        // not available in standalone component.
        ignoredRules: ['color-contrast'],
      });
    });

    it('dispatches apply pending action for all subs when none are selected', async () => {
      await preparePendingSub(ON_PLAYER_ID, OFF_PLAYER_ID);
      await preparePendingSub(ON_PLAYER2_ID, OFF_PLAYER2_ID);

      const nextList = getNextList();
      expect(nextList.hasSelected(), 'Next list should not have any players selected').to.be.false;

      // Apply the pending subs.
      const applyButton = el.shadowRoot!.querySelector('#sub-apply-btn') as Button;
      expect(applyButton, 'Missing apply button').to.be.ok;

      applyButton.click();
      await el.updateComplete;

      // Verifies that the apply sub action was dispatched.
      const expectedSub1 = { ...getPlayer(liveGame, OFF_PLAYER_ID)!, selected: false };
      testlive.setupSub(expectedSub1, getPlayer(liveGame, ON_PLAYER_ID)!);
      const expectedSub2 = { ...getPlayer(liveGame, OFF_PLAYER2_ID)!, selected: false };
      testlive.setupSub(expectedSub2, getPlayer(liveGame, ON_PLAYER2_ID)!);

      expect(dispatchStub).to.have.callCount(1);
      expect(actionLogger.lastAction()).to.deep.include(
        applyPendingSubs(gameId, [expectedSub1, expectedSub2], /* selectedOnly */ false),
      );
    });

    it('dispatches apply pending action with only selected subs', async () => {
      await preparePendingSub(ON_PLAYER_ID, OFF_PLAYER_ID);
      await preparePendingSub(ON_PLAYER2_ID, OFF_PLAYER2_ID);

      const nextList = getNextList();
      expect(nextList.hasSelected(), 'Next list should not have any players selected').to.be.false;

      // Select one of the pending subs.
      getStore().dispatch(selectPlayer(gameId, OFF_PLAYER_ID, /*selected =*/ true));
      await el.updateComplete;
      expect(nextList.hasSelected(), 'Next list should now have one player selected').to.be.true;

      // Apply the pending subs.
      const applyButton = el.shadowRoot!.querySelector('#sub-apply-btn') as Button;
      expect(applyButton, 'Missing apply button').to.be.ok;

      applyButton.click();
      await el.updateComplete;

      // Verifies that the apply sub action was dispatched.
      const selectedSub1 = { ...getPlayer(liveGame, OFF_PLAYER_ID)!, selected: true };
      testlive.setupSub(selectedSub1, getPlayer(liveGame, ON_PLAYER_ID)!);

      expect(dispatchStub).to.have.callCount(1);
      expect(actionLogger.lastAction()).to.deep.include(
        applyPendingSubs(gameId, [selectedSub1], /* selectedOnly */ true),
      );
    });

    it('dispatches discard action for all subs when none are selected', async () => {
      await preparePendingSub(ON_PLAYER_ID, OFF_PLAYER_ID);
      await preparePendingSub(ON_PLAYER2_ID, OFF_PLAYER2_ID);

      const nextList = getNextList();
      expect(nextList.hasSelected(), 'Next list should not have any players selected').to.be.false;

      // Discard the pending subs.
      const discardButton = el.shadowRoot!.querySelector('#sub-discard-btn') as Button;
      expect(discardButton, 'Missing discard button').to.be.ok;

      discardButton.click();
      await el.updateComplete;

      // Verifies that the discard sub action was dispatched.
      expect(dispatchStub).to.have.callCount(1);
      expect(actionLogger.lastAction()).to.deep.include(
        discardPendingSubs(gameId, /* selectedOnly */ false),
      );
    });

    it('dispatches discard action with selected only', async () => {
      await preparePendingSub(ON_PLAYER_ID, OFF_PLAYER_ID);
      await preparePendingSub(ON_PLAYER2_ID, OFF_PLAYER2_ID);

      const nextList = getNextList();
      expect(nextList.hasSelected(), 'Next list should not have any players selected').to.be.false;

      // Select one of the pending subs.
      getStore().dispatch(selectPlayer(gameId, OFF_PLAYER_ID, /*selected =*/ true));
      await el.updateComplete;
      expect(nextList.hasSelected(), 'Next list should now have one player selected').to.be.true;

      // Discard the pending subs.
      const discardButton = el.shadowRoot!.querySelector('#sub-discard-btn') as Button;
      expect(discardButton, 'Missing discard button').to.be.ok;

      discardButton.click();
      await el.updateComplete;

      // Verifies that the discard sub action was dispatched.
      expect(dispatchStub).to.have.callCount(1);
      expect(actionLogger.lastAction()).to.deep.include(
        discardPendingSubs(gameId, /* selectedOnly */ true),
      );
    });

    it('dispatches mark player out action', async () => {
      const foundPlayer = findPlayer(liveGame, PlayerStatus.Off);
      expect(foundPlayer, 'Missing player with off status').to.be.ok;
      const offPlayer = foundPlayer!;

      // Verifies the off player is initially in the Off section.
      const subsList = getSubsList();
      const subElement = getPlayerElement(subsList, offPlayer);
      expect(subElement, 'Missing player card in Off section').to.be.ok;

      // Simulates selection of the player.
      subElement.click();
      await el.updateComplete;

      const outButton = el.shadowRoot!.querySelector('#out-mark-btn') as Button;
      expect(outButton, 'Missing out button').to.be.ok;

      outButton.click();
      await el.updateComplete;

      // Verifies that the mark player out action was dispatched.
      expect(dispatchStub).to.have.callCount(2);
      expect(actionLogger.lastAction()).to.deep.include(markPlayerOut(gameId));

      // Verifies the off player is now in the Out section.
      const outList = getOutList();
      const outElement = getPlayerElement(outList, offPlayer);
      expect(outElement, 'Missing player card in Out section').to.be.ok;
    });

    it('dispatches return out player action', async () => {
      const foundPlayer = findPlayer(liveGame, PlayerStatus.Out);
      expect(foundPlayer, 'Missing player with out status').to.be.ok;
      const outPlayer = foundPlayer!;

      // Verifies the out player is initially in the Out section.
      const outList = getOutList();
      const outElement = getPlayerElement(outList, outPlayer);
      expect(outElement, 'Missing player card in Out section').to.be.ok;

      // Simulates selection of the player.
      outElement.click();
      await el.updateComplete;

      const returnButton = el.shadowRoot!.querySelector('#out-return-btn') as Button;
      expect(returnButton, 'Missing out return button').to.be.ok;

      returnButton.click();
      await el.updateComplete;

      // Verifies that the return out player action was dispatched.
      expect(dispatchStub).to.have.callCount(2);
      expect(actionLogger.lastAction()).to.deep.include(returnOutPlayer(gameId));

      // Verifies the out player is now back in the Off section.
      const subsList = getSubsList();
      const subElement = getPlayerElement(subsList, outPlayer);
      expect(subElement, 'Missing player card in Off section').to.be.ok;
    });
  }); // describe('Subs')

  describe('Clock', () => {
    const startTime = new Date(2016, 0, 1, 14, 0, 0).getTime();
    let fakeClock: sinon.SinonFakeTimers;
    let gameId: string;

    beforeEach(async () => {
      const { game, live } = getGameDetail();
      live.clock = buildClock();
      const shift = buildShiftWithTrackersFromGame(live);
      gameId = live.id;

      // Setup the live game, in Start status.
      const gameState = buildGameStateWithCurrentGame(game);
      const liveState = buildLiveStateWithCurrentGame(live, { shift });

      await setupElement(buildRootState(gameState, liveState), live.id);
      await el.updateComplete;
    });

    afterEach(async () => {
      if (fakeClock) {
        fakeClock.restore();
      }
    });

    it('dispatches start period action when event fired by clock component', async () => {
      fakeClock = sinon.useFakeTimers({
        now: startTime,
        shouldAdvanceTime: false,
      });

      // Trigger the event by clicking the start button.
      const clockElement = getClockElement();
      const startButton = getClockStartPeriodButton(clockElement);

      startButton.click();

      // Verifies that the start period action was dispatched.
      expect(dispatchStub).to.have.callCount(1);
      expect(actionLogger.lastAction()).to.deep.include(
        startPeriod(gameId, /*gameAllowsStart=*/ true, /*currentPeriod=*/ 1, startTime),
      );
    });

    it('dispatches end period action when event fired by clock component', async () => {
      fakeClock = sinon.useFakeTimers({
        now: startTime,
        shouldAdvanceTime: false,
      });

      // Get the clock component into a state that allows the period to end.
      getStore().dispatch(startPeriod(gameId, /*gameAllowsStart =*/ true));
      await el.updateComplete;

      // Trigger the event by clicking the end period button.
      const clockElement = getClockElement();
      const endButton = getClockEndPeriodButton(clockElement);

      endButton.click();

      // Verifies that the end period action was dispatched.
      expect(dispatchStub).to.have.callCount(1);
      expect(actionLogger.lastAction()).to.deep.include(
        endPeriod(gameId, /*gameAllowsEnd=*/ true, /*currentPeriod=*/ 1, startTime),
      );
    });

    it('dispatches end period action with extra minutes when event fired by clock component', async () => {
      // Get the clock component into a state that allows the period to end.
      const store = getStore();
      store.dispatch(startPeriod(gameId, /*gameAllowsStart =*/ true));
      store.dispatch(markPeriodOverdue(gameId, /*ignoreTimeForTesting =*/ true));
      await el.updateComplete;

      // Trigger the overdue dialog by clicking the end period button.
      const clockElement = getClockElement();
      const endButton = getClockEndPeriodButton(clockElement);

      setTimeout(() => endButton!.click());
      await oneEvent(endButton!, 'click');
      await el.updateComplete;

      // Fill the extra minutes and save in the overdue dialog.
      const useRetroactive = getClockEndOverdueRetroactiveOption(clockElement);
      const extraMinutesField = getClockEndOverdueExtraMinutes(clockElement);

      setTimeout(() => useRetroactive.click());
      await oneEvent(useRetroactive, 'click');
      await el.updateComplete;
      extraMinutesField.value = '3';

      const saveButton = getClockEndOverdueSaveButton(clockElement);
      setTimeout(() => saveButton.click());
      await oneEvent(el, ClockEndPeriodEvent.eventName);

      // Verifies that the end period action was dispatched.
      expect(dispatchStub).to.have.callCount(1);
      expect(actionLogger.lastAction()).to.deep.include(endPeriodCreator(gameId, 3));
    });

    it('dispatches toggle clock action when fired by clock component', async () => {
      fakeClock = sinon.useFakeTimers({
        now: startTime,
        shouldAdvanceTime: false,
      });

      // Get the clock component into a state that allows the toggle.
      getStore().dispatch(startPeriod(gameId, /*gameAllowsStart =*/ true));
      await el.updateComplete;

      // Trigger the event by clicking the toggle button.
      const clockElement = getClockElement();
      const toggleButton = getClockToggleButton(clockElement);

      toggleButton.click();

      // Verifies that the toggle clock action was dispatched.
      expect(dispatchStub).to.have.callCount(1);
      expect(actionLogger.lastAction()).to.deep.include(
        toggleClock(
          gameId,
          /*gameAllowsToggle =*/ true,
          /*currentPeriod =*/ 1,
          startTime,
          /*isRunning =*/ false,
        ),
      );
    });
  }); // describe('Clock')

  describe('Overdue periods', () => {
    const startTime = new Date(2016, 0, 1, 14, 0, 0).getTime();
    const period10Minutes = 10;
    const overdueBuffer = 5;
    let fakeClock: sinon.SinonFakeTimers;
    let gameId: string;

    beforeEach(async () => {
      fakeClock = sinon.useFakeTimers({
        now: startTime,
        shouldAdvanceTime: false,
      });

      const { game, live } = getGameDetail();

      live.clock = buildClock();
      live.clock.periodLength = period10Minutes;
      const shift = buildShiftWithTrackersFromGame(live);
      gameId = live.id;

      // Setup the live game, with the period running.
      const gameState = buildGameStateWithCurrentGame(game);
      const liveState = buildLiveStateWithCurrentGame(live, { shift });

      await setupElement(buildRootState(gameState, liveState), live.id);
      await el.updateComplete;
    });

    afterEach(async () => {
      if (fakeClock) {
        fakeClock.restore();
      }
    });

    it('marked overdue when running past length', async () => {
      // Initially, no action has been dispatched.
      expect(dispatchStub).to.have.callCount(0);

      // Get the period running.
      getStore().dispatch(startPeriod(gameId, /*gameAllowsStart =*/ true));
      await el.updateComplete;

      // Advance the clock beyond the period length + overdue buffer.
      const elapsedSeconds = (period10Minutes + overdueBuffer + 1) * 60;
      fakeClock.tick(elapsedSeconds * 1000);
      fakeClock.next();

      // The action should now have been dispatched.
      //  - First action is the startPeriod
      expect(dispatchStub).to.be.called;
      expect(actionLogger.lastAction()).to.deep.include(markPeriodOverdue(gameId));
    });
  }); // describe('Overdue periods');

  describe('Complete Game', () => {
    let liveGame: LiveGame;

    beforeEach(async () => {
      const { game, live } = getGameDetail();
      live.clock = buildClock();
      const shift = buildShiftWithTrackersFromGame(live);

      const gameState = buildGameStateWithCurrentGame(game);
      const liveState = buildLiveStateWithCurrentGame(live, { shift });

      await setupElement(buildRootState(gameState, liveState), live.id);
      await el.updateComplete;
      liveGame = selectLiveGameById(getStore().getState(), live.id)!;
    });

    function advanceToAfterLastPeriod() {
      // Game has two periods (halves), and begins in "Start" status, before
      // the first half is started.
      const store = getStore();
      store.dispatch(startPeriod(liveGame.id, /*gameAllowsStart =*/ true));
      store.dispatch(endPeriod(liveGame.id, /*gameAllowsEnd=*/ true));
      store.dispatch(startPeriod(liveGame.id, /*gameAllowsStart =*/ true));
      store.dispatch(endPeriod(liveGame.id, /*gameAllowsEnd=*/ true));
    }

    it('complete button is disabled initially', async () => {
      const completeButton = getCompleteButton();
      expect(completeButton.disabled, 'Complete setup should be disabled').to.be.true;
    });

    it('complete button is enabled after game periods are completed', async () => {
      advanceToAfterLastPeriod();
      await el.updateComplete;

      const completeButton = getCompleteButton();
      expect(completeButton.disabled, 'Complete button should be enabled').to.be.false;
    });

    it('dispatches game completed action when complete button clicked', async () => {
      advanceToAfterLastPeriod();
      await el.updateComplete;

      const completeButton = getCompleteButton();
      completeButton.click();

      // Verifies that the complete game action was dispatched.
      expect(dispatchStub).to.have.callCount(1);
      expect(actionLogger.lastAction()).to.deep.include(gameCompleted(liveGame.id));
    });
  }); // describe('Complete Game')

  describe('Events', () => {
    const eventTime = new Date(2016, 0, 1, 14, 0, 0).getTime();
    let liveGame: LiveGame;
    let gameEvents: GameEventCollection;

    beforeEach(async () => {
      const { game, live } = getGameDetail();
      gameEvents = buildGameEvents(live, manualTimeProvider(eventTime));

      const gameState = buildGameStateWithCurrentGame(game);
      const liveState = buildLiveStateWithCurrentGame(live, buildEventState(gameEvents));

      await setupElement(buildRootState(gameState, liveState), live.id);
      await el.updateComplete;
      liveGame = selectLiveGameById(getStore().getState(), live.id)!;
    });

    function getEventsElement() {
      const element = el.shadowRoot!.querySelector('lineup-game-events');
      expect(element, 'game events element should be shown').to.be.ok;
      return element!;
    }

    function getEventItems(eventsElement: Element) {
      const items =
        eventsElement.shadowRoot!.querySelectorAll<HTMLTableRowElement>('#events-list tr');
      expect(items.length, 'event items rendered').to.be.at.least(0);
      return items;
    }

    it('dispatches event selected action when event item selected', async () => {
      const eventToSelect = gameEvents.eventsForTesting[0];

      const eventsElement = getEventsElement();
      const eventItems = getEventItems(eventsElement);

      const eventItem = Array.from(eventItems).find(
        (item) => item.dataset.eventId === eventToSelect.id,
      );
      expect(eventItem, `rendered item for event ${eventToSelect.id}`).to.be.ok;

      // Simulates selection of an event item.
      eventItem!.click();

      // Verifies that the event selected action was dispatched.
      expect(dispatchStub).to.have.callCount(1);
      expect(actionLogger.lastAction()).to.deep.include(
        eventSelected(liveGame.id, eventToSelect.id!, /* selected= */ true),
      );
    });

    it('marks event item selected when already selected', async () => {
      const eventToSelect = gameEvents.eventsForTesting[0];

      const store = getStore();
      store.dispatch(eventSelected(liveGame.id, eventToSelect.id!, /* selected= */ true));
      await el.updateComplete;

      const eventsElement = getEventsElement();
      const eventItems = getEventItems(eventsElement);

      const eventItem = Array.from(eventItems).find(
        (item) => item.dataset.eventId === eventToSelect.id,
      );
      expect(eventItem, `rendered item for event ${eventToSelect.id}`).to.be.ok;

      expect(eventItem, 'already selected item').to.have.attribute('selected');
    });

    it('dispatches events updated action when event edits completed', async () => {
      const eventToSelect = gameEvents.eventsForTesting[0];

      const store = getStore();
      store.dispatch(eventSelected(liveGame.id, eventToSelect.id!, /* selected= */ true));
      await el.updateComplete;

      const eventsElement = getEventsElement();

      // Set the event time 1 minute earlier.
      const customTime = eventToSelect.timestamp! - 60000;
      eventsElement.dispatchEvent(
        new EventsUpdatedEvent({
          updatedEventIds: [eventToSelect.id!],
          useExistingTime: false,
          // existingEventId,
          customTime,
        }),
      );

      await Promise.race([nextFrame(), aTimeout(10)]);

      // Verifies that the event selected action was dispatched.
      expect(dispatchStub).to.have.callCount(1);
      expect(actionLogger.lastAction(eventsUpdated.type)).to.deep.include(
        eventUpdateRequested(
          liveGame.id,
          [eventToSelect.id!],
          /* useExistingTime= */ false,
          /* existingEventId= */ undefined,
          customTime,
        ),
      );
    });
  }); // describe('Events')
});
