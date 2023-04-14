import { LineupGameClock } from '@app/components/lineup-game-clock.js';
import '@app/components/lineup-game-live.js';
import { LineupGameLive } from '@app/components/lineup-game-live.js';
import { LineupOnPlayerList } from '@app/components/lineup-on-player-list.js';
import { LineupPlayerCard } from '@app/components/lineup-player-card.js';
import { LineupPlayerList } from '@app/components/lineup-player-list.js';
import { addMiddleware, removeMiddleware } from '@app/middleware/dynamic-middlewares.js';
import { FormationType } from '@app/models/formation.js';
import { GameDetail, GameStatus } from '@app/models/game.js';
import { getPlayer, LiveGame, LivePlayer, PeriodStatus } from '@app/models/live.js';
import { PlayerStatus } from '@app/models/player.js';
import { getLiveStoreConfigurator } from '@app/slices/live-store.js';
import { cancelSub, cancelSwap, confirmSub, confirmSwap, endPeriod, gameCompleted, markPeriodOverdue, markPlayerOut, returnOutPlayer, selectLiveGameById, selectPlayer, startPeriod, toggleClock } from '@app/slices/live/live-slice.js';
import { RootState, setupStore } from '@app/store.js';
import { Button } from '@material/mwc-button';
import { expect, fixture, html } from '@open-wc/testing';
import sinon from 'sinon';
import { getClockEndPeriodButton, getClockStartPeriodButton, getClockToggleButton } from '../helpers/clock-element-retrievers.js';
import { buildGameStateWithCurrentGame } from '../helpers/game-state-setup.js';
import { buildClock, buildLiveStateWithCurrentGame, buildShiftWithTrackersFromGame } from '../helpers/live-state-setup.js';
import { buildRootState } from '../helpers/root-state-setup.js';
import { buildRunningTimer /*, buildStoppedTimer*/ } from '../helpers/test-clock-data.js';
import * as testlive from '../helpers/test-live-game-data.js';
import { buildRoster, getNewGameDetail } from '../helpers/test_data.js';

let actions: string[] = [];
const actionLoggerMiddleware = (/* api */) => (next: any) => (action: any) => {
  actions.push(action);
  return next(action);
}

function getGameDetail(): { game: GameDetail, live: LiveGame } {
  const live = testlive.getLiveGameWithPlayers();
  const game = getNewGameDetail(buildRoster(live.players));
  game.status = live.status = GameStatus.Start;
  return { game, live };
}

function findPlayer(game: LiveGame, status: PlayerStatus) {
  return game.players!.find(player => (player.status === status));
}

describe('lineup-game-live tests', () => {
  let el: LineupGameLive;
  let dispatchStub: sinon.SinonSpy;
  beforeEach(async () => {
    actions = [];
    addMiddleware(actionLoggerMiddleware);

    await setupElement();
  });

  afterEach(async () => {
    sinon.restore();
    removeMiddleware(actionLoggerMiddleware);
  });

  async function setupElement(preloadedState?: RootState, gameId?: string) {
    const store = setupStore(preloadedState, /*hydrate=*/false);

    const template = html`<lineup-game-live .gameId="${gameId}" .store=${store} .storeConfigurator=${getLiveStoreConfigurator(/*hydrate=*/false)}></lineup-game-live>`;
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
    for (let element of Array.from(items)) {
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
    for (let element of Array.from(items)) {
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
  });

  describe('Subs', () => {
    let liveGame: LiveGame;
    let gameId: string;

    beforeEach(async () => {
      const { game, live } = getGameDetail();

      live.formation = { type: FormationType.F4_3_3 };
      live.status = GameStatus.Live;
      live.clock = buildClock(buildRunningTimer(), {
        currentPeriod: 1,
        periodStatus: PeriodStatus.Running
      });
      const shift = buildShiftWithTrackersFromGame(live);

      // Setup the live game, with the period in progress.
      const gameState = buildGameStateWithCurrentGame(game);
      const liveState = buildLiveStateWithCurrentGame(live,
        { shift });

      await setupElement(buildRootState(gameState, liveState), live.id);
      await el.updateComplete;
      liveGame = selectLiveGameById(getStore().getState(), live.id)!;
      gameId = liveGame.id;
    });

    async function preparePendingSwap() {
      const onPlayer = getPlayer(liveGame, 'P0')!;
      const onPlayer2 = getPlayer(liveGame, 'P1')!;

      const store = getStore();
      store.dispatch(selectPlayer(gameId, onPlayer.id, /*selected =*/true));
      store.dispatch(selectPlayer(gameId, onPlayer2.id, /*selected =*/true));
      await el.updateComplete;

      const confirmSection = el.shadowRoot!.querySelector('#confirm-swap');
      expect(confirmSection, 'Missing confirm swap element').to.be.ok;

      const applyButton = confirmSection!.querySelector('mwc-button.ok') as Button;
      expect(applyButton, 'Missing apply button').to.be.ok;

      applyButton.click();

      // Verifies that the apply swap action was dispatched.
      expect(dispatchStub).to.have.callCount(1);

      expect(actions).to.have.lengthOf.at.least(1);
      expect(actions[actions.length - 1]).to.deep.include(confirmSwap(gameId));
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

      expect(actions).to.have.lengthOf.at.least(1);
      expect(actions[actions.length - 1]).to.deep.include(
        selectPlayer(gameId, player.id, /*selected =*/true));
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

      expect(actions).to.have.lengthOf.at.least(1);
      expect(actions[actions.length - 1]).to.deep.include(
        selectPlayer(gameId, player.id, /*selected =*/true));
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

      expect(actions).to.have.lengthOf.at.least(1);
      expect(actions[actions.length - 1]).to.deep.include(
        selectPlayer(gameId, player.id, /*selected =*/true));
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
      store.dispatch(selectPlayer(gameId, offPlayer.id, /*selected =*/true));
      store.dispatch(selectPlayer(gameId, onPlayer.id, /*selected =*/true));
      await el.updateComplete;

      const confirmSection = el.shadowRoot!.querySelector('#confirm-sub');
      expect(confirmSection, 'Missing confirm sub div').to.be.ok;

      await expect(confirmSection).dom.to.equalSnapshot();
    });

    it('dispatches confirm sub action when confirmed', async () => {
      let foundPlayer = findPlayer(liveGame, PlayerStatus.Off);
      expect(foundPlayer, 'Missing player with off status').to.be.ok;
      const offPlayer = foundPlayer!;

      foundPlayer = findPlayer(liveGame, PlayerStatus.On);
      expect(foundPlayer, 'Missing player with on status').to.be.ok;
      const onPlayer = foundPlayer!;

      const store = getStore();
      store.dispatch(selectPlayer(gameId, offPlayer.id, /*selected =*/true));
      store.dispatch(selectPlayer(gameId, onPlayer.id, /*selected =*/true));
      await el.updateComplete;

      const confirmSection = el.shadowRoot!.querySelector('#confirm-sub');
      expect(confirmSection, 'Missing confirm sub div').to.be.ok;

      const applyButton = confirmSection!.querySelector('mwc-button.ok') as Button;
      expect(applyButton, 'Missing apply button').to.be.ok;

      applyButton.click();

      // Verifies that the apply sub action was dispatched.
      expect(dispatchStub).to.have.callCount(1);

      expect(actions).to.have.lengthOf.at.least(1);
      expect(actions[actions.length - 1]).to.deep.include(confirmSub(gameId));
    });

    it('dispatches confirm sub action with new position when confirmed', async () => {
      const onPlayer = getPlayer(liveGame, 'P0')!;
      const offPlayer = getPlayer(liveGame, 'P11')!;
      const otherPositionPlayer = getPlayer(liveGame, 'P1')!;

      const store = getStore();
      store.dispatch(selectPlayer(gameId, offPlayer.id, /*selected =*/true));
      store.dispatch(selectPlayer(gameId, onPlayer.id, /*selected =*/true));
      await el.updateComplete;

      const confirmSection = el.shadowRoot!.querySelector('#confirm-sub');
      expect(confirmSection, 'Missing confirm sub div').to.be.ok;

      const applyButton = confirmSection!.querySelector('mwc-button.ok') as Button;
      expect(applyButton, 'Missing apply button').to.be.ok;

      const positionSelect = confirmSection?.querySelector('#new-position-select') as HTMLSelectElement;
      expect(positionSelect, 'Missing position select').to.be.ok;

      positionSelect.value = otherPositionPlayer.currentPosition!.id;

      applyButton.click();

      // Verifies that the apply sub action was dispatched.
      expect(dispatchStub).to.have.callCount(1);

      expect(actions).to.have.lengthOf.at.least(1);
      expect(actions[actions.length - 1]).to.deep.include(
        confirmSub(gameId, otherPositionPlayer.currentPosition));
    });

    it('dispatches cancel sub action when cancelled', async () => {
      let foundPlayer = findPlayer(liveGame, PlayerStatus.Off);
      expect(foundPlayer, 'Missing player with off status').to.be.ok;
      const offPlayer = foundPlayer!;

      foundPlayer = findPlayer(liveGame, PlayerStatus.On);
      expect(foundPlayer, 'Missing player with on status').to.be.ok;
      const onPlayer = foundPlayer!;

      const store = getStore();
      store.dispatch(selectPlayer(gameId, offPlayer.id, /*selected =*/true));
      store.dispatch(selectPlayer(gameId, onPlayer.id, /*selected =*/true));
      await el.updateComplete;

      const confirmSection = el.shadowRoot!.querySelector('#confirm-sub');
      expect(confirmSection, 'Missing confirm sub div').to.be.ok;

      const cancelButton = confirmSection!.querySelector('mwc-button.cancel') as Button;
      expect(cancelButton, 'Missing cancel button').to.be.ok;

      cancelButton.click();

      // Verifies that the cancel sub action was dispatched.
      expect(dispatchStub).to.have.callCount(1);

      expect(actions).to.have.lengthOf.at.least(1);
      expect(actions[actions.length - 1]).to.deep.include(cancelSub(gameId));
    });

    it('shows confirm swap UI when proposed swap exists', async () => {
      const onPlayer = getPlayer(liveGame, 'P0')!;
      const onPlayer2 = getPlayer(liveGame, 'P1')!;

      const store = getStore();
      store.dispatch(selectPlayer(gameId, onPlayer.id, /*selected =*/true));
      store.dispatch(selectPlayer(gameId, onPlayer2.id, /*selected =*/true));
      await el.updateComplete;

      const confirmSection = el.shadowRoot!.querySelector('#confirm-swap');
      expect(confirmSection, 'Missing confirm swap element').to.be.ok;

      await expect(confirmSection).dom.to.equalSnapshot();
    });

    it('dispatches confirm swap action when confirmed', async () => {
      const onPlayer = getPlayer(liveGame, 'P0')!;
      const onPlayer2 = getPlayer(liveGame, 'P1')!;

      const store = getStore();
      store.dispatch(selectPlayer(gameId, onPlayer.id, /*selected =*/true));
      store.dispatch(selectPlayer(gameId, onPlayer2.id, /*selected =*/true));
      await el.updateComplete;

      const confirmSection = el.shadowRoot!.querySelector('#confirm-swap');
      expect(confirmSection, 'Missing confirm swap element').to.be.ok;

      const applyButton = confirmSection!.querySelector('mwc-button.ok') as Button;
      expect(applyButton, 'Missing apply button').to.be.ok;

      applyButton.click();

      // Verifies that the apply swap action was dispatched.
      expect(dispatchStub).to.have.callCount(1);

      expect(actions).to.have.lengthOf.at.least(1);
      expect(actions[actions.length - 1]).to.deep.include(confirmSwap(gameId));
    });

    it('dispatches cancel swap action when cancelled', async () => {
      const onPlayer = getPlayer(liveGame, 'P0')!;
      const onPlayer2 = getPlayer(liveGame, 'P1')!;

      const store = getStore();
      store.dispatch(selectPlayer(gameId, onPlayer.id, /*selected =*/true));
      store.dispatch(selectPlayer(gameId, onPlayer2.id, /*selected =*/true));
      await el.updateComplete;

      const confirmSection = el.shadowRoot!.querySelector('#confirm-swap');
      expect(confirmSection, 'Missing confirm swap element').to.be.ok;

      const cancelButton = confirmSection!.querySelector('mwc-button.cancel') as Button;
      expect(cancelButton, 'Missing cancel button').to.be.ok;

      cancelButton.click();

      // Verifies that the cancel sub action was dispatched.
      expect(dispatchStub).to.have.callCount(1);

      expect(actions).to.have.lengthOf.at.least(1);
      expect(actions[actions.length - 1]).to.deep.include(cancelSwap(gameId));
    });

    it('shows errors when pending subs are invalid', async () => {
      await preparePendingSwap();

      const onPlayer = getPlayer(liveGame, 'P0')!;
      const onPlayer2 = getPlayer(liveGame, 'P1')!;

      const store = getStore();
      store.dispatch(selectPlayer(gameId, onPlayer.id, /*selected =*/true));
      store.dispatch(selectPlayer(gameId, onPlayer2.id, /*selected =*/true));
      await el.updateComplete;

      const applyButton = el.shadowRoot!.querySelector('#sub-apply-btn') as Button;
      expect(applyButton, 'Missing apply button').to.be.ok;

      applyButton.click();
      await el.updateComplete;

      const errorElement = el.shadowRoot!.querySelector('#sub-errors');
      expect(errorElement, 'Missing sub error element').to.be.ok;

      const errorText = errorElement!.querySelector('.error');
      expect(errorText, 'Missing sub error text').to.be.ok;

      const expectedInvalidPositions = [
        onPlayer.currentPosition?.id,
        onPlayer2.currentPosition?.id].sort().join(', ');
      expect(errorText!.textContent, 'Sub error text should contain invalid swap positions').to.contain(expectedInvalidPositions);

      await expect(errorElement).dom.to.equalSnapshot();
    });

    it('dispatches mark player out action', async () => {
      let foundPlayer = findPlayer(liveGame, PlayerStatus.Off);
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

      expect(actions).to.have.lengthOf.at.least(1);
      expect(actions[actions.length - 1]).to.deep.include(markPlayerOut(gameId));

      // Verifies the off player is now in the Out section.
      const outList = getOutList();
      const outElement = getPlayerElement(outList, offPlayer);
      expect(outElement, 'Missing player card in Out section').to.be.ok;
    });

    it('dispatches return out player action', async () => {
      let foundPlayer = findPlayer(liveGame, PlayerStatus.Out);
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

      expect(actions).to.have.lengthOf.at.least(1);
      expect(actions[actions.length - 1]).to.deep.include(returnOutPlayer(gameId));

      // Verifies the out player is now back in the Off section.
      const subsList = getSubsList();
      const subElement = getPlayerElement(subsList, outPlayer);
      expect(subElement, 'Missing player card in Off section').to.be.ok;
    });

  }); // describe('Subs')

  describe('Clock', () => {
    let gameId: string;

    beforeEach(async () => {
      const { game, live } = getGameDetail();
      live.clock = buildClock();
      const shift = buildShiftWithTrackersFromGame(live);
      gameId = live.id;

      // Setup the live game, in Start status.
      const gameState = buildGameStateWithCurrentGame(game);
      const liveState = buildLiveStateWithCurrentGame(live,
        { shift });

      await setupElement(buildRootState(gameState, liveState), live.id);
      await el.updateComplete;
    });

    it('dispatches start period action when event fired by clock component', async () => {
      // Trigger the event by clicking the start button.
      const clockElement = getClockElement();
      const startButton = getClockStartPeriodButton(clockElement);

      startButton.click();

      // Verifies that the start period action was dispatched.
      expect(dispatchStub).to.have.callCount(1);

      expect(actions).to.have.lengthOf.at.least(1);
      expect(actions[actions.length - 1]).to.deep.include(
        startPeriod(gameId,/*gameAllowsStart  =*/true));
    });

    it('dispatches end period action when event fired by clock component', async () => {
      // Get the clock component into a state that allows the period to end.
      getStore().dispatch(startPeriod(gameId,/*gameAllowsStart =*/true));
      await el.updateComplete;

      // Trigger the event by clicking the end period button.
      const clockElement = getClockElement();
      const endButton = getClockEndPeriodButton(clockElement);

      endButton.click();

      // Verifies that the end period action was dispatched.
      expect(dispatchStub).to.have.callCount(1);

      expect(actions).to.have.lengthOf.at.least(1);
      expect(actions[actions.length - 1]).to.deep.include(
        endPeriod(gameId));
    });

    it('dispatches toggle clock action when fired by clock component', async () => {
      // Get the clock component into a state that allows the toggle.
      getStore().dispatch(startPeriod(gameId, /*gameAllowsStart =*/true));
      await el.updateComplete;

      // Trigger the event by clicking the toggle button.
      const clockElement = getClockElement();
      const toggleButton = getClockToggleButton(clockElement);

      toggleButton.click();

      // Verifies that the toggle clock action was dispatched.
      expect(dispatchStub).to.have.callCount(1);

      expect(actions).to.have.lengthOf.at.least(1);
      expect(actions[actions.length - 1]).to.deep.include(toggleClock(gameId));
    });

  }); // describe('Clock')

  describe('Overdue periods', () => {
    const startTime = new Date(2016, 0, 1, 14, 0, 0).getTime();
    let fakeClock: sinon.SinonFakeTimers;
    let gameId: string;

    beforeEach(async () => {
      fakeClock = sinon.useFakeTimers({
        now: startTime,
        toFake: ['setInterval', 'clearInterval'],
        shouldAdvanceTime: false
      });

      const { game, live } = getGameDetail();

      live.clock = buildClock();
      const shift = buildShiftWithTrackersFromGame(live);
      gameId = live.id;

      // Setup the live game, with the period running.
      const gameState = buildGameStateWithCurrentGame(game);
      const liveState = buildLiveStateWithCurrentGame(live,
        { shift });

      await setupElement(buildRootState(gameState, liveState), live.id);
      await el.updateComplete;
    });

    afterEach(async () => {
      if (fakeClock) {
        fakeClock.restore();
      }
    });

    it('checks for overdue when period is running', async () => {
      // Initially, no action has been dispatched.
      expect(dispatchStub).to.have.callCount(0);

      // Get the period running.
      getStore().dispatch(startPeriod(gameId, /*gameAllowsStart =*/true));
      await el.updateComplete;

      // Advance the clock more than 10 seconds, which is the interval for the
      // synchronized timer trigger.
      const elapsedSeconds = 11;
      fakeClock.tick(elapsedSeconds * 1000);
      fakeClock.next();
      // await aTimeout(10500);

      // The action should now have been dispatched.
      // TODO: Figure out why the action is dispatched twice. Time should be froken?
      expect(dispatchStub).to.have.callCount(2);

      expect(actions).to.have.lengthOf.at.least(1);
      expect(actions[actions.length - 1]).to.deep.include(markPeriodOverdue(gameId));
    });

  }); // describe('Overdue periods');

  describe('Complete Game', () => {
    let liveGame: LiveGame;

    beforeEach(async () => {
      const { game, live } = getGameDetail();
      live.clock = buildClock();
      const shift = buildShiftWithTrackersFromGame(live);

      const gameState = buildGameStateWithCurrentGame(game);
      const liveState = buildLiveStateWithCurrentGame(live,
        { shift });

      await setupElement(buildRootState(gameState, liveState), live.id);
      await el.updateComplete;
      liveGame = selectLiveGameById(getStore().getState(), live.id)!;
    });

    function advanceToAfterLastPeriod() {
      // Game has two periods (halves), and begins in "Start" status, before
      // the first half is started
      const store = getStore();
      store.dispatch(startPeriod(liveGame.id, /*gameAllowsStart =*/true));
      store.dispatch(endPeriod(liveGame.id));
      store.dispatch(startPeriod(liveGame.id, /*gameAllowsStart =*/true));
      store.dispatch(endPeriod(liveGame.id));
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

      expect(actions).to.have.lengthOf.at.least(1);
      expect(actions[actions.length - 1]).to.deep.include(gameCompleted(liveGame.id));
    });

  }); // describe('Complete Game')

  it('a11y', async () => {
    await expect(el).to.be.accessible();
  });
});
