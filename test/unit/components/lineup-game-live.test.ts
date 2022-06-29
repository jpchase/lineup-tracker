import { hydrateLive } from '@app/actions/live.js';
import { LineupGameClock } from '@app/components/lineup-game-clock.js';
import '@app/components/lineup-game-live.js';
import { LineupGameLive } from '@app/components/lineup-game-live.js';
import { LineupOnPlayerList } from '@app/components/lineup-on-player-list.js';
import { LineupPlayerCard } from '@app/components/lineup-player-card.js';
import { LineupPlayerList } from '@app/components/lineup-player-list.js';
import { addMiddleware, removeMiddleware } from '@app/middleware/dynamic-middlewares.js';
import { FormationType } from '@app/models/formation.js';
import { GameDetail, GameStatus } from '@app/models/game.js';
import { getPlayer, LiveGame, LivePlayer } from '@app/models/live.js';
import { PlayerStatus } from '@app/models/player.js';
import { GET_GAME_SUCCESS } from '@app/slices/game-types.js';
import { getLiveStoreConfigurator } from '@app/slices/live-store.js';
import { cancelSub, cancelSwap, confirmSub, confirmSwap, endPeriod, gameCompleted, selectCurrentLiveGame, selectLiveGameById, selectPlayer, startPeriod, toggleClock } from '@app/slices/live/live-slice.js';
import { resetState, store } from '@app/store.js';
import { Button } from '@material/mwc-button';
import { expect, fixture, html } from '@open-wc/testing';
import sinon from 'sinon';
import { getClockEndPeriodButton, getClockStartPeriodButton, getClockToggleButton } from '../helpers/clock-element-retrievers.js';
import { buildClock, buildShiftWithTrackers } from '../helpers/live-state-setup.js';
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
    // Resets to the initial store state.
    store.dispatch(resetState());

    actions = [];
    addMiddleware(actionLoggerMiddleware);

    const template = html`<lineup-game-live .store=${store} .storeConfigurator=${getLiveStoreConfigurator(false)}></lineup-game-live>`;
    el = await fixture(template);
    dispatchStub = sinon.spy(el, 'dispatch');
  });

  afterEach(async () => {
    sinon.restore();
    removeMiddleware(actionLoggerMiddleware);
  });

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

  it('shows no game placeholder when no current game', async () => {
    expect(store.getState().live, 'LiveState should exist').to.be.ok;
    expect(selectCurrentLiveGame(store.getState()), 'LiveState should have game unset').to.not.be.ok;

    const placeholder = el.shadowRoot!.querySelector('div p.empty-list');
    expect(placeholder, 'Missing empty placeholder element').to.be.ok;

    await expect(el).shadowDom.to.equalSnapshot();
  });

  it('shows all player sections for started game', async () => {
    const { game } = getGameDetail();

    store.dispatch({ type: GET_GAME_SUCCESS, game });
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

    beforeEach(async () => {
      const { game, live } = getGameDetail();
      live.formation = { type: FormationType.F4_3_3 };
      const shift = buildShiftWithTrackers(live.players);

      // Setup the live game, with the period in progress.
      store.dispatch({ type: GET_GAME_SUCCESS, game: game });
      store.dispatch(hydrateLive(testlive.buildLiveGames([live]), live.id, shift));
      store.dispatch(startPeriod(live.id,/*gameAllowsStart =*/true));
      liveGame = selectLiveGameById(store.getState(), live.id)!;

      await el.updateComplete;
    });

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
        selectPlayer(player.id, /*selected =*/true));
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
        selectPlayer(player.id, /*selected =*/true));
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

      store.dispatch(selectPlayer(offPlayer.id, /*selected =*/true));
      store.dispatch(selectPlayer(onPlayer.id, /*selected =*/true));
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

      store.dispatch(selectPlayer(offPlayer.id, /*selected =*/true));
      store.dispatch(selectPlayer(onPlayer.id, /*selected =*/true));
      await el.updateComplete;

      const confirmSection = el.shadowRoot!.querySelector('#confirm-sub');
      expect(confirmSection, 'Missing confirm sub div').to.be.ok;

      const applyButton = confirmSection!.querySelector('mwc-button.ok') as Button;
      expect(applyButton, 'Missing apply button').to.be.ok;

      applyButton.click();

      // Verifies that the apply sub action was dispatched.
      expect(dispatchStub).to.have.callCount(1);

      expect(actions).to.have.lengthOf.at.least(1);
      expect(actions[actions.length - 1]).to.deep.include(confirmSub());
    });

    it('dispatches confirm sub action with new position when confirmed', async () => {
      const onPlayer = getPlayer(liveGame, 'P0')!;
      const offPlayer = getPlayer(liveGame, 'P11')!;
      const otherPositionPlayer = getPlayer(liveGame, 'P1')!;

      store.dispatch(selectPlayer(offPlayer.id, /*selected =*/true));
      store.dispatch(selectPlayer(onPlayer.id, /*selected =*/true));
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
        confirmSub(otherPositionPlayer.currentPosition));
    });

    it('dispatches cancel sub action when cancelled', async () => {
      let foundPlayer = findPlayer(liveGame, PlayerStatus.Off);
      expect(foundPlayer, 'Missing player with off status').to.be.ok;
      const offPlayer = foundPlayer!;

      foundPlayer = findPlayer(liveGame, PlayerStatus.On);
      expect(foundPlayer, 'Missing player with on status').to.be.ok;
      const onPlayer = foundPlayer!;

      store.dispatch(selectPlayer(offPlayer.id, /*selected =*/true));
      store.dispatch(selectPlayer(onPlayer.id, /*selected =*/true));
      await el.updateComplete;

      const confirmSection = el.shadowRoot!.querySelector('#confirm-sub');
      expect(confirmSection, 'Missing confirm sub div').to.be.ok;

      const cancelButton = confirmSection!.querySelector('mwc-button.cancel') as Button;
      expect(cancelButton, 'Missing cancel button').to.be.ok;

      cancelButton.click();

      // Verifies that the cancel sub action was dispatched.
      expect(dispatchStub).to.have.callCount(1);

      expect(actions).to.have.lengthOf.at.least(1);
      expect(actions[actions.length - 1]).to.include(cancelSub());
    });

    it('shows confirm swap UI when proposed swap exists', async () => {
      const onPlayer = getPlayer(liveGame, 'P0')!;
      const onPlayer2 = getPlayer(liveGame, 'P1')!;

      store.dispatch(selectPlayer(onPlayer.id, /*selected =*/true));
      store.dispatch(selectPlayer(onPlayer2.id, /*selected =*/true));
      await el.updateComplete;

      const confirmSection = el.shadowRoot!.querySelector('#confirm-swap');
      expect(confirmSection, 'Missing confirm swap element').to.be.ok;

      await expect(confirmSection).dom.to.equalSnapshot();
    });

    it('dispatches confirm swap action when confirmed', async () => {
      const onPlayer = getPlayer(liveGame, 'P0')!;
      const onPlayer2 = getPlayer(liveGame, 'P1')!;

      store.dispatch(selectPlayer(onPlayer.id, /*selected =*/true));
      store.dispatch(selectPlayer(onPlayer2.id, /*selected =*/true));
      await el.updateComplete;

      const confirmSection = el.shadowRoot!.querySelector('#confirm-swap');
      expect(confirmSection, 'Missing confirm swap element').to.be.ok;

      const applyButton = confirmSection!.querySelector('mwc-button.ok') as Button;
      expect(applyButton, 'Missing apply button').to.be.ok;

      applyButton.click();

      // Verifies that the apply swap action was dispatched.
      expect(dispatchStub).to.have.callCount(1);

      expect(actions).to.have.lengthOf.at.least(1);
      expect(actions[actions.length - 1]).to.include(confirmSwap());
    });

    it('dispatches cancel sub action when cancelled', async () => {
      const onPlayer = getPlayer(liveGame, 'P0')!;
      const onPlayer2 = getPlayer(liveGame, 'P1')!;

      store.dispatch(selectPlayer(onPlayer.id, /*selected =*/true));
      store.dispatch(selectPlayer(onPlayer2.id, /*selected =*/true));
      await el.updateComplete;

      const confirmSection = el.shadowRoot!.querySelector('#confirm-swap');
      expect(confirmSection, 'Missing confirm swap element').to.be.ok;

      const cancelButton = confirmSection!.querySelector('mwc-button.cancel') as Button;
      expect(cancelButton, 'Missing cancel button').to.be.ok;

      cancelButton.click();

      // Verifies that the cancel sub action was dispatched.
      expect(dispatchStub).to.have.callCount(1);

      expect(actions).to.have.lengthOf.at.least(1);
      expect(actions[actions.length - 1]).to.include(cancelSwap());
    });

  }); // describe('Subs')

  describe('Clock', () => {
    let gameId: string;

    beforeEach(async () => {
      const { game, live } = getGameDetail();
      live.clock = buildClock();
      const shift = buildShiftWithTrackers(live.players);
      gameId = live.id;

      // Setup the live game, in Start status
      store.dispatch({ type: GET_GAME_SUCCESS, game: game });
      store.dispatch(hydrateLive(testlive.buildLiveGames([live]), live.id, shift));

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
      store.dispatch(startPeriod(gameId,/*gameAllowsStart =*/true));
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
      store.dispatch(startPeriod(gameId, /*gameAllowsStart =*/true));
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

  describe('Complete Game', () => {
    let liveGame: LiveGame;

    beforeEach(async () => {
      const { game, live } = getGameDetail();
      const shift = buildShiftWithTrackers(live.players);

      // Setup the live game, in second half, ready to end.
      store.dispatch({ type: GET_GAME_SUCCESS, game: game });
      store.dispatch(hydrateLive(testlive.buildLiveGames([live]), live.id, shift));
      liveGame = selectLiveGameById(store.getState(), live.id)!;

      await el.updateComplete;
    });

    function advanceToAfterLastPeriod() {
      // Game has two periods (halves), and begins in "Start" status, before
      // the first half is started
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
