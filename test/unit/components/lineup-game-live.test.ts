import { LineupGameLive } from '@app/components/lineup-game-live';
import '@app/components/lineup-game-live.js';
import { LineupOnPlayerList } from '@app/components/lineup-on-player-list';
import { LineupPlayerCard } from '@app/components/lineup-player-card';
import { LineupPlayerList } from '@app/components/lineup-player-list';
import { addMiddleware, removeMiddleware } from '@app/middleware/dynamic-middlewares';
import { FormationType } from '@app/models/formation';
import { GameDetail, GameStatus, LiveGame, LivePlayer } from '@app/models/game';
import { PlayerStatus } from '@app/models/player';
import { GET_GAME_SUCCESS, SET_FORMATION } from '@app/slices/game-types';
import { getLiveStoreConfigurator } from '@app/slices/live-store';
import { APPLY_STARTER, CANCEL_SUB, CONFIRM_SUB, SELECT_PLAYER, SELECT_STARTER, SELECT_STARTER_POSITION } from '@app/slices/live-types';
import { resetState, store } from '@app/store';
import { Button } from '@material/mwc-button';
import { expect, fixture, html } from '@open-wc/testing';
import * as sinon from 'sinon';
import * as testlive from '../helpers/test-live-game-data';
import { buildRoster, getNewGameDetail } from '../helpers/test_data';

let actions: string[] = [];
const actionLoggerMiddleware = (/* api */) => (next: any) => (action: any) => {
  actions.push(action);
  return next(action);
}

function getGameDetail(): { game: GameDetail, live: LiveGame } {
  const live = testlive.getLiveGameWithPlayers();
  const game = getNewGameDetail(buildRoster(live.players));
  game.status = GameStatus.Start;
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
    expect(store.getState().live!.liveGame, 'LiveState should have game unset').to.not.be.ok;

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

      // Setup the live game, with at least one ON player, by simulating the
      // steps to get the data in the right state.
      // TODO: Use hydrate action if/when implemented.
      store.dispatch({ type: GET_GAME_SUCCESS, game: game });
      store.dispatch({ type: SET_FORMATION, formationType: FormationType.F4_3_3 });
      const offPlayer = findPlayer(live, PlayerStatus.Off)!;
      store.dispatch({ type: SELECT_STARTER, playerId: offPlayer.id, selected: true });
      store.dispatch({ type: SELECT_STARTER_POSITION, position: offPlayer.currentPosition! });
      store.dispatch({ type: APPLY_STARTER });
      // store.dispatch({ type: ROSTER_DONE, roster: newGame.roster });
      await el.updateComplete;
      liveGame = store.getState().live!.liveGame!;
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
      expect(actions[actions.length - 1]).to.include(
        { type: SELECT_PLAYER, playerId: player.id, selected: true });
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
      expect(actions[actions.length - 1]).to.include(
        { type: SELECT_PLAYER, playerId: player.id, selected: true });
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

      store.dispatch({ type: SELECT_PLAYER, playerId: offPlayer.id, selected: true });
      store.dispatch({ type: SELECT_PLAYER, playerId: onPlayer.id, selected: true });
      await el.updateComplete;

      const confirmSection = el.shadowRoot!.querySelector('#confirm-sub');
      expect(confirmSection, 'Missing confirm sub div').to.be.ok;

      expect(confirmSection).dom.to.equalSnapshot();
    });

    it('dispatches confirm sub action when confirmed', async () => {
      let foundPlayer = findPlayer(liveGame, PlayerStatus.Off);
      expect(foundPlayer, 'Missing player with off status').to.be.ok;
      const offPlayer = foundPlayer!;

      foundPlayer = findPlayer(liveGame, PlayerStatus.On);
      expect(foundPlayer, 'Missing player with on status').to.be.ok;
      const onPlayer = foundPlayer!;

      store.dispatch({ type: SELECT_PLAYER, playerId: offPlayer.id, selected: true });
      store.dispatch({ type: SELECT_PLAYER, playerId: onPlayer.id, selected: true });
      await el.updateComplete;

      const confirmSection = el.shadowRoot!.querySelector('#confirm-sub');
      expect(confirmSection, 'Missing confirm sub div').to.be.ok;

      const applyButton = confirmSection!.querySelector('mwc-button.ok') as Button;
      expect(applyButton, 'Missing apply button').to.be.ok;

      applyButton.click();

      // Verifies that the apply sub action was dispatched.
      expect(dispatchStub).to.have.callCount(1);

      expect(actions).to.have.lengthOf.at.least(1);
      expect(actions[actions.length - 1]).to.include({ type: CONFIRM_SUB });
    });

    it('dispatches cancel sub action when cancelled', async () => {
      let foundPlayer = findPlayer(liveGame, PlayerStatus.Off);
      expect(foundPlayer, 'Missing player with off status').to.be.ok;
      const offPlayer = foundPlayer!;

      foundPlayer = findPlayer(liveGame, PlayerStatus.On);
      expect(foundPlayer, 'Missing player with on status').to.be.ok;
      const onPlayer = foundPlayer!;

      store.dispatch({ type: SELECT_PLAYER, playerId: offPlayer.id, selected: true });
      store.dispatch({ type: SELECT_PLAYER, playerId: onPlayer.id, selected: true });
      await el.updateComplete;

      const confirmSection = el.shadowRoot!.querySelector('#confirm-sub');
      expect(confirmSection, 'Missing confirm sub div').to.be.ok;

      const cancelButton = confirmSection!.querySelector('mwc-button.cancel') as Button;
      expect(cancelButton, 'Missing cancel button').to.be.ok;

      cancelButton.click();

      // Verifies that the cancel sub action was dispatched.
      expect(dispatchStub).to.have.callCount(1);

      expect(actions).to.have.lengthOf.at.least(1);
      expect(actions[actions.length - 1]).to.include({ type: CANCEL_SUB });
    });

  }); // describe('Subs')

  it('a11y', async () => {
    await expect(el).to.be.accessible();
  });
});
