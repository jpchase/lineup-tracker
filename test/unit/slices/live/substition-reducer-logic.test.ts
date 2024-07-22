/** @format */

import { FormationType, Position } from '@app/models/formation.js';
import { LiveGame, getPlayer } from '@app/models/live.js';
import { PlayerStatus } from '@app/models/player.js';
import { live } from '@app/slices/live/composed-reducer.js';
import { pendingSubsAppliedCreator } from '@app/slices/live/index.js';
import { LiveState, actions } from '@app/slices/live/live-slice.js';
import { expect } from '@open-wc/testing';
import sinon from 'sinon';
import {
  buildLiveStateWithCurrentGame,
  buildShiftWithTrackersFromGame,
  getGame,
  selectPlayers,
} from '../../helpers/live-state-setup.js';
import { mockGetState as mockGetRootState } from '../../helpers/root-state-setup.js';
import * as testlive from '../../helpers/test-live-game-data.js';

const { applyPendingSubs, discardPendingSubs, invalidPendingSubs } = actions;

function mockGetState(currentState: LiveState) {
  return mockGetRootState(undefined, undefined, undefined, currentState);
}

describe('Live slice: Substitution actions', () => {
  describe('Pending Subs', () => {
    // The first 11 players (ids P0 - P10) fill all the positions for the 4-3-3 formation.
    // Subs: three off players (ids P11 - P12), replace on players.
    const sub1: SubData = {
      nextId: 'P11',
      replacedId: 'P4',
    };
    const sub2: SubData = {
      nextId: 'P12',
      replacedId: 'P5',
    };
    const sub3: SubData = {
      nextId: 'P13',
      replacedId: 'P6',
    };
    // Swaps: three on players move to other positions, no overlap with subs above.
    const swap1: SubData = {
      nextId: 'P8',
      replacedId: 'P9',
      isSwap: true,
      swapNextId: 'P8_swap',
    };
    const swap2: SubData = {
      nextId: 'P9',
      replacedId: 'P10',
      isSwap: true,
      swapNextId: 'P9_swap',
    };
    const swap3: SubData = {
      nextId: 'P10',
      replacedId: 'P8',
      isSwap: true,
      swapNextId: 'P10_swap',
    };
    let currentState: LiveState;
    let gameId: string;

    interface SubData {
      // Player in Next status (either going on or swapping position).
      nextId: string;
      // Player in On status to come off for sub, or the player whose position
      // will be taken by a swap.
      replacedId?: string;
      // Sub into this position, instead of that from the replaced player.
      positionOverride?: Position;
      isSwap?: boolean;
      // Placeholder id for player in Next status, that swap positions.
      swapNextId?: string;
      // The final position for the sub, after all subs/swaps applied.
      expectedFinalPosition?: Position;
    }

    function setupSubState(subs: SubData[] /*, game?: LiveGame*/) {
      const game = testlive.getLiveGameWithPlayers();
      game.formation = { type: FormationType.F4_3_3 };

      // Ensure the first 11 players are on.
      for (let i = 0; i < 11; i++) {
        const player = getPlayer(game, `P${i}`)!;
        player.status = PlayerStatus.On;
      }

      for (const sub of subs) {
        if (sub.isSwap) {
          const onPlayer = getPlayer(game, sub.nextId)!;
          const positionPlayer = getPlayer(game, sub.replacedId!)!;

          const nextPlayer = testlive.setupSwap(onPlayer, positionPlayer, sub.swapNextId!);
          game.players?.push(nextPlayer);
          continue;
        }

        // Usual sub
        const nextPlayer = getPlayer(game, sub.nextId)!;
        const onPlayer = getPlayer(game, sub.replacedId!)!;

        testlive.setupSub(nextPlayer, onPlayer, sub.positionOverride);
      }

      currentState = buildLiveStateWithCurrentGame(game, {
        shift: buildShiftWithTrackersFromGame(game, true),
      });
      gameId = game.id;
    }

    function buildSubs(...subs: SubData[]): SubData[] {
      // TODO: Use structuredClone
      return subs.map((input) => ({ ...input }));
    }

    function getNextIds(subs: SubData[]): string[] {
      return subs.map((input) => input.nextId);
    }

    function getSwapNextIds(subs: SubData[]): string[] {
      return subs.map((input) => input.swapNextId!);
    }

    function getReplacedIds(subs: SubData[]): string[] {
      return subs.map((input) => input.replacedId!);
    }

    function getIdsByStatus(game: LiveGame) {
      const nextIds = [];
      const offIds = [];
      const onIds = [];
      for (const newPlayer of game.players!) {
        switch (newPlayer.status) {
          case PlayerStatus.Next:
            nextIds.push(newPlayer.id);
            break;

          case PlayerStatus.Off:
            offIds.push(newPlayer.id);
            break;

          case PlayerStatus.On:
            onIds.push(newPlayer.id);
            break;

          default:
          // Ignore other statuses.
        }
      }
      return {
        [PlayerStatus.Next]: nextIds,
        [PlayerStatus.Off]: offIds,
        [PlayerStatus.On]: onIds,
      };
    }

    function getPlayersByIds(game: LiveGame, ids: string[]) {
      return game.players?.filter((player) => ids.includes(player.id)) || [];
    }

    function getPlayerPosition(game: LiveGame, playerId: string) {
      return getPlayer(game, playerId)?.currentPosition;
    }

    function expectPositionSwapsApplied(game: LiveGame, subs: SubData[], notSwappedIds?: string[]) {
      for (let i = 0; i < subs.length; i++) {
        const sub = subs[i];
        const player = getPlayer(game, sub.nextId)!;
        let expectedPosition = sub.expectedFinalPosition;
        if (!expectedPosition) {
          expectedPosition = getPlayerPosition(game, sub.replacedId!);
        }

        if (notSwappedIds?.includes(sub.nextId)) {
          expect(player.currentPosition).to.not.deep.equal(
            expectedPosition,
            `Not swapped [${player.id}], the currentPosition property`,
          );
        } else {
          expect(player.currentPosition).to.deep.equal(
            expectedPosition,
            `Swapped [${player.id}], the currentPosition property`,
          );
        }
      }
    }

    describe('live/applyPendingSubs', () => {
      it('should apply all next subs, when not selectedOnly', () => {
        const subs = buildSubs(sub1, sub2, sub3);
        setupSubState(subs);

        const newState: LiveState = live(
          currentState,
          applyPendingSubs(
            gameId,
            getPlayersByIds(getGame(currentState, gameId)!, getNextIds(subs)),
          ),
        );
        const newGame = getGame(newState, gameId)!;
        const newIds = getIdsByStatus(newGame);

        expect(newIds[PlayerStatus.On]).to.contain.members(
          getNextIds(subs),
          'All next players should now be on',
        );
        expect(newIds[PlayerStatus.Off]).to.contain.members(
          getReplacedIds(subs),
          'All replaced players should now be off',
        );
        expect(newIds[PlayerStatus.Next], 'No next players should remain').to.be.empty;
      });

      it('should apply all the next swaps, when not selectedOnly', () => {
        const subs = buildSubs(swap1, swap2, swap3);
        setupSubState(subs);

        const currentGame = getGame(currentState, gameId)!;
        for (const swap of subs) {
          const positionPlayer = getPlayer(currentGame, swap.replacedId!)!;
          swap.expectedFinalPosition = { ...positionPlayer.currentPosition! };
        }

        const newState: LiveState = live(
          currentState,
          applyPendingSubs(
            gameId,
            getPlayersByIds(getGame(currentState, gameId)!, getSwapNextIds(subs)),
          ),
        );
        const newGame = getGame(newState, gameId)!;
        const newIds = getIdsByStatus(newGame);

        expectPositionSwapsApplied(newGame, subs);

        expect(newIds[PlayerStatus.Next], 'No next swaps should remain').to.be.empty;
      });

      it('should apply all next subs and swaps, when not selectedOnly', () => {
        // Setup a combination of a swap and sub, e.g.:
        //  - A replaces B, but in C's position
        //  - C swaps to D's position, and D swaps to B's position
        // A = next player to be subbed on from |sub1|
        // B = player to be replaced from |sub1|
        // C = player to be swapped from |swap1|
        // D = player to be swapped from |swap2|
        const game = testlive.getLiveGameWithPlayers();
        const sub1ReplacedPlayer = getPlayer(game, sub1.replacedId!)!;
        const swap1Player = getPlayer(game, swap1.nextId!)!;
        const swap2Player = getPlayer(game, swap2.nextId!)!;

        const subs = [
          // Set A to go into C's position, instead of taking B's position by default.
          { ...sub1, positionOverride: { ...swap1Player.currentPosition! } },
          // Other subs are unchanged.
          sub2,
          sub3,
        ];
        const swaps = [
          // Set C to swap to D's position.
          {
            ...swap1,
            replacedId: swap2.nextId!,
            expectedFinalPosition: swap2Player.currentPosition,
          },
          // Set D to swap to B's position.
          {
            ...swap2,
            replacedId: sub1.replacedId!,
            expectedFinalPosition: sub1ReplacedPlayer.currentPosition,
          },
          // Other swaps are unchanged.
          { ...swap3, expectedFinalPosition: swap1Player.currentPosition },
        ];
        setupSubState(buildSubs(...subs, ...swaps));

        const nowPlayingIds = getNextIds(subs);
        const subbedOffIds = getReplacedIds(subs);

        const newState: LiveState = live(
          currentState,
          applyPendingSubs(
            gameId,
            getPlayersByIds(
              getGame(currentState, gameId)!,
              nowPlayingIds.concat(getSwapNextIds(swaps)),
            ),
          ),
        );
        const newGame = getGame(newState, gameId)!;
        const newIds = getIdsByStatus(newGame);

        expectPositionSwapsApplied(newGame, swaps);

        expect(newIds[PlayerStatus.On]).to.contain.members(
          nowPlayingIds,
          'All next players should now be on',
        );
        expect(newIds[PlayerStatus.Off]).to.contain.members(
          subbedOffIds,
          'All replaced players should now be off',
        );
        expect(newIds[PlayerStatus.Next], 'No next players should remain').to.be.empty;
      });

      it('should apply only selected next subs', () => {
        const selectedSubs = [sub1, sub3];
        const remainingSubs = [sub2];
        const subs = buildSubs(...selectedSubs, ...remainingSubs);
        setupSubState(subs);
        const currentGame = getGame(currentState, gameId)!;

        // Apply 2 of the 3 pending subs (> 1 to test it will actually handle multiple, not just first)
        const nowPlayingIds = getNextIds(selectedSubs);
        const stillNextIds = getNextIds(remainingSubs);
        const subbedOffIds = getReplacedIds(selectedSubs);
        const stillOnIds = getReplacedIds(remainingSubs);

        selectPlayers(currentGame, nowPlayingIds, true);

        const newState = live(
          currentState,
          applyPendingSubs(
            gameId,
            getPlayersByIds(currentGame, nowPlayingIds),
            /* selectedOnly */ true,
          ),
        );
        const newGame = getGame(newState, gameId)!;
        const newIds = getIdsByStatus(newGame);

        expect(newIds[PlayerStatus.On]).to.contain.members(
          nowPlayingIds,
          'Specified next players should now be on',
        );
        expect(newIds[PlayerStatus.On]).to.contain.members(
          stillOnIds,
          'Players not yet replaced should still be on',
        );
        expect(newIds[PlayerStatus.Off]).to.contain.members(
          subbedOffIds,
          'Specified replaced players should now be off',
        );
        expect(newIds[PlayerStatus.Next]).to.have.members(
          stillNextIds,
          'Next players not specified should remain',
        );

        for (const onId of nowPlayingIds) {
          const player = getPlayer(newGame, onId)!;

          expect(
            player.replaces,
            `Now playing [${player.id}], the replaces property should be cleared`,
          ).to.not.be.ok;
          expect(
            player.currentPosition,
            `Now playing [${player.id}], the currentPosition property should still be set`,
          ).to.be.ok;
          expect(
            player.selected,
            `Now playing [${player.id}], the selected property should be false`,
          ).to.be.false;
        }

        for (const nextId of stillNextIds) {
          const player = getPlayer(newGame, nextId)!;

          expect(player.replaces).to.equal(
            'P5',
            `Still next [${player.id}], the replaces property should still be set`,
          );
          expect(
            player.currentPosition,
            `Still next [${player.id}], the currentPosition property should still be set`,
          ).to.be.ok;
        }

        for (const offId of subbedOffIds) {
          const player = getPlayer(newGame, offId)!;

          expect(
            player.currentPosition,
            `Now off [${player.id}], the currentPosition property should be cleared`,
          ).to.not.be.ok;
          expect(player.selected, `Now off [${player.id}], the selected property should be false`)
            .to.not.be.ok;
        }
      });

      it('should apply only selected next swaps', () => {
        const selectedSwaps = [swap1, swap3];
        const remainingSwaps = [swap2];
        const swaps = buildSubs(...selectedSwaps, ...remainingSwaps);
        setupSubState(swaps);

        // Apply 2 of the 3 pending swaps (> 1 to test it will actually handle multiple, not just first)
        const nowSwappedIds = getNextIds(selectedSwaps);
        const onPendingSwapIds = getNextIds(remainingSwaps);
        const swappedNextIds = getSwapNextIds(selectedSwaps);
        const stillNextIds = getSwapNextIds(remainingSwaps);

        const currentGame = getGame(currentState, gameId)!;
        selectPlayers(currentGame, swappedNextIds, true);

        for (const swap of selectedSwaps) {
          const positionPlayer = getPlayer(currentGame, swap.replacedId!)!;
          swap.expectedFinalPosition = { ...positionPlayer.currentPosition! };
        }

        const newState = live(
          currentState,
          applyPendingSubs(
            gameId,
            getPlayersByIds(currentGame, swappedNextIds),
            /* selectedOnly */ true,
          ),
        );
        const newGame = getGame(newState, gameId)!;
        const newIds = getIdsByStatus(newGame);

        expectPositionSwapsApplied(newGame, selectedSwaps, /* notSwappedIds */ onPendingSwapIds);

        expect(newIds[PlayerStatus.On]).to.contain.members(
          getNextIds(swaps),
          'On players should be unchanged',
        );
        expect(newIds[PlayerStatus.Next]).to.have.members(
          stillNextIds,
          'Next swaps not specified should remain',
        );

        for (const onId of nowSwappedIds) {
          const player = getPlayer(newGame, onId)!;

          expect(player.selected, `Swapped [${player.id}], the selected property should be false`)
            .to.not.be.ok;
        }
      });

      it('should apply only selected next subs and swaps', () => {
        // Setup a combination of a swap and sub, e.g.:
        //  - A replaces B, but in C's position
        //  - C swaps to D's position, and D swaps to B's position
        // A = next player to be subbed on from |sub1|
        // B = player to be replaced from |sub1|
        // C = player to be swapped from |swap1|
        // D = player to be swapped from |swap2|
        const game = testlive.getLiveGameWithPlayers();
        const sub1ReplacedPlayer = getPlayer(game, sub1.replacedId!)!;
        const swap1Player = getPlayer(game, swap1.nextId!)!;
        const swap2Player = getPlayer(game, swap2.nextId!)!;

        const selectedSubs = [
          // Set A to go into C's position, instead of taking B's position by default.
          { ...sub1, positionOverride: { ...swap1Player.currentPosition! } },
          sub3,
        ];
        const remainingSubs = [sub2];
        const selectedSwaps = [
          // Set C to swap to D's position.
          {
            ...swap1,
            replacedId: swap2.nextId!,
            expectedFinalPosition: swap2Player.currentPosition,
          },
          // Set D to swap to B's position.
          {
            ...swap2,
            replacedId: sub1.replacedId!,
            expectedFinalPosition: sub1ReplacedPlayer.currentPosition,
          },
        ];
        const remainingSwaps = [swap3];
        const subs = buildSubs(...selectedSubs, ...remainingSubs);
        const swaps = buildSubs(...selectedSwaps, ...remainingSwaps);
        setupSubState(subs.concat(swaps));

        // Apply 2 of the 3 pending subs and swaps (> 1 to test it will actually handle multiple, not just first)
        const nowPlayingIds = getNextIds(selectedSubs);
        const subbedOffIds = getReplacedIds(selectedSubs);
        const stillNextIds = getNextIds(remainingSubs);
        const stillOnIds = getReplacedIds(remainingSubs);
        // const nowSwappedIds = getNextIds(selectedSwaps);
        const onPendingSwapIds = getNextIds(remainingSwaps);
        const stillNextSwapIds = getSwapNextIds(remainingSwaps);
        const toBeSelected = nowPlayingIds.concat(getSwapNextIds(selectedSwaps));

        const currentGame = getGame(currentState, gameId)!;

        selectPlayers(currentGame, toBeSelected, true);

        const newState = live(
          currentState,
          applyPendingSubs(
            gameId,
            getPlayersByIds(currentGame, toBeSelected),
            /* selectedOnly */ true,
          ),
        );
        const newGame = getGame(newState, gameId)!;
        const newIds = getIdsByStatus(newGame);

        expectPositionSwapsApplied(newGame, swaps, /* notSwappedIds */ onPendingSwapIds);

        expect(newIds[PlayerStatus.On]).to.contain.members(
          nowPlayingIds,
          'Specified next players should now be on',
        );
        expect(newIds[PlayerStatus.On]).to.contain.members(
          stillOnIds,
          'Players not yet replaced should still be on',
        );
        expect(newIds[PlayerStatus.Off]).to.contain.members(
          subbedOffIds,
          'Specified replaced players should now be off',
        );
        expect(newIds[PlayerStatus.Next]).to.have.members(
          stillNextIds.concat(stillNextSwapIds),
          'Next players not specified should remain',
        );

        for (const onId of nowPlayingIds) {
          const player = getPlayer(newGame, onId)!;

          expect(
            player.replaces,
            `Now playing [${player.id}], the replaces property should be cleared`,
          ).to.not.be.ok;
          expect(
            player.currentPosition,
            `Now playing [${player.id}], the currentPosition property should still be set`,
          ).to.be.ok;
          expect(
            player.selected,
            `Now playing [${player.id}], the selected property should be false`,
          ).to.be.false;
        }

        for (const nextId of stillNextIds) {
          const player = getPlayer(newGame, nextId)!;

          expect(player.replaces).to.equal(
            'P5',
            `Still next [${player.id}], the replaces property should still be set`,
          );
          expect(
            player.currentPosition,
            `Still next [${player.id}], the currentPosition property should still be set`,
          ).to.be.ok;
        }

        for (const offId of subbedOffIds) {
          const player = getPlayer(newGame, offId)!;

          expect(
            player.currentPosition,
            `Now off [${player.id}], the currentPosition property should be cleared`,
          ).to.not.be.ok;
          expect(player.selected, `Now off [${player.id}], the selected property should be false`)
            .to.not.be.ok;
        }
      });

      it('should clear selected, when subbing all players (not selectedOnly)', () => {
        const selectedSubs = [sub1, sub3];
        const remainingSubs = [sub2];
        const subs = buildSubs(...selectedSubs, ...remainingSubs);

        setupSubState(subs);
        const currentGame = getGame(currentState, gameId)!;

        const nowPlayingIds = getNextIds(subs);
        const subbedOffIds = getReplacedIds(subs);

        selectPlayers(currentGame, getNextIds(selectedSubs), true);
        selectPlayers(currentGame, getReplacedIds(selectedSubs), true);

        const newState: LiveState = live(
          currentState,
          applyPendingSubs(
            gameId,
            getPlayersByIds(currentGame, nowPlayingIds),
            /* selectedOnly */ false,
          ),
        );
        const newGame = getGame(newState, gameId)!;
        const newIds = getIdsByStatus(newGame);

        expect(newIds[PlayerStatus.On]).to.contain.members(
          nowPlayingIds,
          'All next players should now be on',
        );
        expect(newIds[PlayerStatus.Off]).to.contain.members(
          subbedOffIds,
          'All replaced players should now be off',
        );

        for (const onId of nowPlayingIds) {
          const player = getPlayer(newGame, onId)!;

          expect(
            player.selected,
            `Now playing [${player.id}], the selected property should be false`,
          ).to.be.false;
        }

        for (const offId of subbedOffIds) {
          const player = getPlayer(newGame, offId)!;

          expect(player.selected, `Now off [${player.id}], the selected property should be false`)
            .to.not.be.ok;
        }
      });

      it('should clear any invalid subs, when not selected only', () => {
        const subs = buildSubs(sub1, sub2);
        setupSubState(subs);
        currentState.invalidSubs = [sub3.nextId];

        const newState: LiveState = live(
          currentState,
          applyPendingSubs(
            gameId,
            getPlayersByIds(getGame(currentState, gameId)!, getNextIds(subs)),
          ),
        );

        expect(newState.invalidSubs, 'Invalid subs should be cleared').not.to.be.ok;
      });

      it('should clear any invalid subs, when selected only', () => {
        const selectedSubs = [sub1];
        const subs = buildSubs(...selectedSubs, sub2);
        setupSubState(subs);
        currentState.invalidSubs = [sub3.nextId];

        const currentGame = getGame(currentState, gameId)!;
        const nowPlayingIds = getNextIds(selectedSubs);

        selectPlayers(currentGame, nowPlayingIds, true);

        const newState = live(
          currentState,
          applyPendingSubs(
            gameId,
            getPlayersByIds(currentGame, nowPlayingIds),
            /* selectedOnly */ true,
          ),
        );

        expect(newState.invalidSubs, 'Invalid subs should be cleared').not.to.be.ok;
      });
    }); // describe('live/applyPendingSubs')

    describe('live/invalidPendingSubs', () => {
      it('should save the invalid subs, when two players subbing for same player', async () => {
        // Two subs for the same on player
        const subs = buildSubs(sub1, sub2, { ...sub2, nextId: sub3.nextId });
        setupSubState(subs);

        const newState: LiveState = live(currentState, invalidPendingSubs(gameId, [sub3.nextId]));

        expect(newState.invalidSubs).to.deep.equal([sub3.nextId]);
      });
    }); // describe('live/invalidPendingSubs')

    describe('apply action creator', () => {
      it('should dispatch action with all next subs, when valid and not selectedOnly', async () => {
        const subs = buildSubs(sub1, sub2, sub3);
        setupSubState(subs);

        const dispatchMock = sinon.stub();
        const getStateMock = mockGetState(currentState);

        await pendingSubsAppliedCreator(gameId)(dispatchMock, getStateMock, undefined);

        expect(dispatchMock).to.have.callCount(1);

        expect(dispatchMock.lastCall).to.have.been.calledWith(
          applyPendingSubs(
            gameId,
            getPlayersByIds(getGame(currentState, gameId)!, getNextIds(subs)),
          ),
        );
      });

      it('should dispatch action with all next swaps, when valid and not selectedOnly', async () => {
        const subs = buildSubs(swap1, swap2, swap3);
        setupSubState(subs);

        const dispatchMock = sinon.stub();
        const getStateMock = mockGetState(currentState);

        await pendingSubsAppliedCreator(gameId)(dispatchMock, getStateMock, undefined);

        expect(dispatchMock).to.have.callCount(1);

        expect(dispatchMock.lastCall).to.have.been.calledWith(
          applyPendingSubs(
            gameId,
            getPlayersByIds(getGame(currentState, gameId)!, getSwapNextIds(subs)),
          ),
        );
      });

      it('should dispatch action with all next subs and swaps, when valid and not selectedOnly', async () => {
        // Setup a combination of a swap and sub, e.g.:
        //  - A replaces B, but in C's position
        //  - C swaps to D's position, and D swaps to B's position
        // A = next player to be subbed on from |sub1|
        // B = player to be replaced from |sub1|
        // C = player to be swapped from |swap1|
        // D = player to be swapped from |swap2|
        const game = testlive.getLiveGameWithPlayers();
        const sub1ReplacedPlayer = getPlayer(game, sub1.replacedId!)!;
        const swap1Player = getPlayer(game, swap1.nextId!)!;
        const swap2Player = getPlayer(game, swap2.nextId!)!;

        const subs = [
          // Set A to go into C's position, instead of taking B's position by default.
          { ...sub1, positionOverride: { ...swap1Player.currentPosition! } },
          // Other subs are unchanged.
          sub2,
          sub3,
        ];
        const swaps = [
          // Set C to swap to D's position.
          {
            ...swap1,
            replacedId: swap2.nextId!,
            expectedFinalPosition: swap2Player.currentPosition,
          },
          // Set D to swap to B's position.
          {
            ...swap2,
            replacedId: sub1.replacedId!,
            expectedFinalPosition: sub1ReplacedPlayer.currentPosition,
          },
          // Other swaps are unchanged.
          // swap3
        ];
        setupSubState(buildSubs(...subs, ...swaps));

        const dispatchMock = sinon.stub();
        const getStateMock = mockGetState(currentState);

        await pendingSubsAppliedCreator(gameId)(dispatchMock, getStateMock, undefined);

        expect(dispatchMock).to.have.callCount(1);

        expect(dispatchMock.lastCall).to.have.been.calledWith(
          applyPendingSubs(
            gameId,
            getPlayersByIds(
              getGame(currentState, gameId)!,
              getNextIds(subs).concat(getSwapNextIds(swaps)),
            ),
          ),
        );
      });

      it('should dispatch error with invalid subs, when two players subbing for same player and not selectedOnly', async () => {
        // Two subs for the same on player
        const subs = buildSubs(sub1, sub2, { ...sub2, nextId: sub3.nextId });
        setupSubState(subs);

        const dispatchMock = sinon.stub();
        const getStateMock = mockGetState(currentState);

        await pendingSubsAppliedCreator(gameId)(dispatchMock, getStateMock, undefined);

        expect(dispatchMock).to.have.callCount(1);

        expect(dispatchMock.lastCall).to.have.been.calledWith(
          invalidPendingSubs(gameId, [sub3.nextId]),
        );
      });

      it('should dispatch error with invalid subs, when sub and swap into same position and not selectedOnly', async () => {
        // Sub for a player, and also a swap into the same position
        const subs = buildSubs(sub1, sub2, { ...swap1, replacedId: sub1.replacedId });
        setupSubState(subs);

        const dispatchMock = sinon.stub();
        const getStateMock = mockGetState(currentState);

        await pendingSubsAppliedCreator(gameId)(dispatchMock, getStateMock, undefined);

        expect(dispatchMock).to.have.callCount(1);

        // Invalid subs should contain:
        //   - Current position of the swap, since that was left empty.
        //   - Next position of the swap, since there are now two players there.
        const currentGame = getGame(currentState, gameId)!;
        const swapPlayer = getPlayer(currentGame, swap1.nextId)!;
        const positionPlayer = getPlayer(currentGame, sub1.replacedId!)!;
        expect(dispatchMock.lastCall).to.have.been.calledWith(
          invalidPendingSubs(
            gameId,
            [positionPlayer.currentPosition!.id, swapPlayer.currentPosition!.id].sort(),
          ),
        );
      });

      it('should dispatch error with invalid subs, when sub into different position without replacement and not selectedOnly', async () => {
        // Sub for a player, but into a different position, without a sub/swap to fill the
        // open position.
        const game = testlive.getLiveGameWithPlayers();
        const otherPlayer = getPlayer(game, sub2.replacedId!)!;
        const subs = buildSubs({
          ...sub1,
          positionOverride: { ...otherPlayer.currentPosition! },
        });
        setupSubState(subs);

        const dispatchMock = sinon.stub();
        const getStateMock = mockGetState(currentState);

        await pendingSubsAppliedCreator(gameId)(dispatchMock, getStateMock, undefined);

        expect(dispatchMock).to.have.callCount(1);

        // Invalid subs should contain:
        //   - Position of the player that was replaced, since that was left empty.
        //   - Position override for the incoming player, since there are now two players there.
        const currentGame = getGame(currentState, gameId)!;
        const replacedPlayer = getPlayer(currentGame, sub1.replacedId!)!;
        const replacedPositionPlayer = getPlayer(currentGame, sub2.replacedId!)!;
        expect(dispatchMock.lastCall).to.have.been.calledWith(
          invalidPendingSubs(
            gameId,
            [replacedPlayer.currentPosition!.id, replacedPositionPlayer.currentPosition!.id].sort(),
          ),
        );
      });

      it('should dispatch error with invalid subs, when one swap leaves open position and not selectedOnly', async () => {
        // Single swap only, leaving a position open.
        const subs = buildSubs(swap1);
        setupSubState(subs);

        const dispatchMock = sinon.stub();
        const getStateMock = mockGetState(currentState);

        await pendingSubsAppliedCreator(gameId)(dispatchMock, getStateMock, undefined);

        expect(dispatchMock).to.have.callCount(1);

        // Invalid subs should contain:
        //   - Current position of the swap, since that was left empty.
        //   - Next position of the swap, since there are now two players there.
        const currentGame = getGame(currentState, gameId)!;
        const swapPlayer = getPlayer(currentGame, swap1.nextId)!;
        const replacedPositionPlayer = getPlayer(currentGame, swap1.replacedId!)!;
        expect(dispatchMock.lastCall).to.have.been.calledWith(
          invalidPendingSubs(gameId, [
            replacedPositionPlayer.currentPosition!.id,
            swapPlayer.currentPosition!.id,
          ]),
        );
      });

      it('should dispatch error with invalid subs, when multiple swaps leave open position and not selectedOnly', async () => {
        // Swap A into B, then B into C, but leave A's position open.
        const subs = buildSubs({ ...swap1, replacedId: swap2.nextId }, swap2);
        setupSubState(subs);

        const dispatchMock = sinon.stub();
        const getStateMock = mockGetState(currentState);

        await pendingSubsAppliedCreator(gameId)(dispatchMock, getStateMock, undefined);

        expect(dispatchMock).to.have.callCount(1);

        // Invalid subs should contain:
        //   - Current position of A, since that was left empty.
        //   - Next position of B (current of C), since there are now two players there.
        const currentGame = getGame(currentState, gameId)!;
        const swapPlayer = getPlayer(currentGame, swap1.nextId)!;
        const replacedPositionPlayer = getPlayer(currentGame, swap2.replacedId!)!;
        expect(dispatchMock.lastCall).to.have.been.calledWith(
          invalidPendingSubs(
            gameId,
            [swapPlayer.currentPosition!.id, replacedPositionPlayer.currentPosition!.id].sort(),
          ),
        );
      });
    }); // describe('apply action creator')

    describe('live/discardPendingSubs', () => {
      it('should reset all next players to off, when not selectedOnly', () => {
        const subs = buildSubs(sub1, sub2, sub3);
        const nowOffIds = getNextIds(subs);
        const stillOnIds = getReplacedIds(subs);

        setupSubState(subs);

        const newState = live(currentState, discardPendingSubs(gameId));
        const newGame = getGame(newState, gameId)!;
        const newIds = getIdsByStatus(newGame);

        expect(newIds[PlayerStatus.On]).to.contain.members(
          stillOnIds,
          'All to be replaced players should still be on',
        );
        expect(newIds[PlayerStatus.Off]).to.contain.members(
          nowOffIds,
          'All next players should now be off',
        );
        expect(newIds[PlayerStatus.Next], 'No next players should remain').to.be.empty;
      });

      it('should reset only selected next players to off', () => {
        // Discard 2 of the 3 pending subs (> 1 to test it will actually handle multiple, not just first)
        const selectedSubs = [sub1, sub3];
        const remainingSubs = [sub2];
        const subs = buildSubs(...selectedSubs, ...remainingSubs);

        const nowOffIds = getNextIds(selectedSubs);
        const stillNextIds = getNextIds(remainingSubs);
        const stillOnIds = getReplacedIds(subs);

        setupSubState(subs);

        selectPlayers(getGame(currentState, gameId)!, nowOffIds, true);

        const newState = live(currentState, discardPendingSubs(gameId, /* selectedOnly */ true));
        const newGame = getGame(newState, gameId)!;
        const newIds = getIdsByStatus(newGame);

        expect(newIds[PlayerStatus.On]).to.contain.members(
          stillOnIds,
          'All to be replaced players should still be on',
        );
        expect(newIds[PlayerStatus.Off]).to.contain.members(
          nowOffIds,
          'Specified next players should now be off',
        );
        expect(newIds[PlayerStatus.Next]).to.have.members(
          stillNextIds,
          'Next players not specified should remain',
        );

        for (const nextId of stillNextIds) {
          const player = getPlayer(newGame, nextId)!;

          expect(player.replaces).to.equal(
            'P5',
            `Still next [${player.id}], the replaces property should still be set`,
          );
          expect(
            player.currentPosition,
            `Still next [${player.id}], the currentPosition property should still be set`,
          ).to.be.ok;
        }

        for (const offId of nowOffIds) {
          const player = getPlayer(newGame, offId)!;

          expect(player.replaces, `Now off [${player.id}], the replaces property should be cleared`)
            .to.not.be.ok;
          expect(
            player.currentPosition,
            `Now off [${player.id}], the currentPosition property should be cleared`,
          ).to.not.be.ok;
          expect(player.selected, `Now off [${player.id}], the selected property should be false`)
            .to.not.be.ok;
        }
      });

      it('should remove all next swaps, when not selectedOnly', () => {
        const subs = buildSubs(swap1, swap2, swap3);
        setupSubState(subs);

        const newState = live(currentState, discardPendingSubs(gameId));
        const newGame = getGame(newState, gameId)!;

        expectPositionSwapsApplied(newGame, subs, /* notSwappedIds */ getNextIds(subs));

        const newIds = getIdsByStatus(newGame);

        expect(newIds[PlayerStatus.Next], 'No next swaps should remain').to.be.empty;
      });

      it('should remove only selected next swaps', () => {
        const selectedSwaps = [swap1, swap3];
        const remainingSwaps = [swap2];
        const subs = buildSubs(...selectedSwaps, ...remainingSwaps);
        setupSubState(subs);

        // Discard 2 of the 3 pending swaps (> 1 to test it will actually handle multiple, not just first)
        const discardedNextIds = getSwapNextIds(selectedSwaps);
        const stillNextIds = getSwapNextIds(remainingSwaps);

        selectPlayers(getGame(currentState, gameId)!, discardedNextIds, true);

        const newState = live(currentState, discardPendingSubs(gameId, /* selectedOnly */ true));
        const newGame = getGame(newState, gameId)!;
        const newIds = getIdsByStatus(newGame);

        expect(newIds[PlayerStatus.Next]).to.have.members(
          stillNextIds,
          'Next players not specified should remain',
        );
      });

      it('should clear any invalid subs, when not selected only', () => {
        // Two subs for the same on player
        const subs = buildSubs(sub1, sub2, { ...sub2, nextId: sub3.nextId });
        setupSubState(subs);
        currentState.invalidSubs = [sub3.nextId];

        const newState = live(currentState, discardPendingSubs(gameId));

        expect(newState.invalidSubs, 'Invalid subs should be cleared').not.to.be.ok;
      });

      it('should clear any invalid subs, when selected only', () => {
        // Two subs for the same on player
        const subs = buildSubs(sub1, sub2, { ...sub2, nextId: sub3.nextId });
        setupSubState(subs);
        currentState.invalidSubs = [sub3.nextId];

        selectPlayers(getGame(currentState, gameId)!, [sub1.nextId], true);

        const newState = live(currentState, discardPendingSubs(gameId, /* selectedOnly */ true));

        expect(newState.invalidSubs, 'Invalid subs should be cleared').not.to.be.ok;
      });
    }); // describe('live/discardPendingSubs')
  }); // describe('Pending Subs')
});
