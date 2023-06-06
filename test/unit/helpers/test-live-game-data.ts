/** @format */

import { Position } from '@app/models/formation.js';
import { GameStatus } from '@app/models/game.js';
import { LiveGame, LiveGames, LivePlayer } from '@app/models/live.js';
import { Player, PlayerStatus } from '@app/models/player.js';
import { STORED_GAME_ID } from './test_data.js';

export function buildLiveGames(games: LiveGame[]): LiveGames {
  return games.reduce((obj, game) => {
    obj[game.id] = game;
    return obj;
  }, {} as LiveGames);
}

export function getLiveGame(players?: Player[], status?: GameStatus): LiveGame {
  return {
    id: STORED_GAME_ID,
    status: status ?? GameStatus.New,
    players: buildLivePlayers(players),
  };
}

export function getLiveGameWithPlayers(): LiveGame {
  return getLiveGame(getLivePlayers(18));
}

export function buildLivePlayers(players?: Player[]): LivePlayer[] {
  if (!players) {
    return [];
  }
  return players.reduce((obj, player) => {
    obj.push(player);
    return obj;
  }, [] as LivePlayer[]);
}

export function getLivePlayer(): LivePlayer {
  return getLivePlayers(1)[0];
}

export function getLivePlayers(numPlayers: number, status?: PlayerStatus): LivePlayer[] {
  if (!numPlayers) {
    throw new Error(`Valid number of players must be specified: ${numPlayers}`);
  }

  const players: LivePlayer[] = [];
  for (let i = 0; i < numPlayers; i++) {
    const player: LivePlayer = {
      id: `P${i}`,
      name: `Player ${i}`,
      uniformNumber: i + (i % 3) * 10,
      status: status || PlayerStatus.Off,
      positions: [],
    };
    setPositions(player, i);
    players.push(player);
  }
  return players;
}

export function setupSub(
  nextPlayer: LivePlayer,
  onPlayer: LivePlayer,
  positionOverride?: Position
) {
  nextPlayer.status = PlayerStatus.Next;
  nextPlayer.replaces = onPlayer.id;
  const position = positionOverride ?? onPlayer.currentPosition!;
  nextPlayer.currentPosition = { ...position };
}

export function setupSwap(onPlayer: LivePlayer, positionPlayer: LivePlayer, nextId: string) {
  const nextPlayer: LivePlayer = {
    ...onPlayer,
    id: nextId,
    status: PlayerStatus.Next,
    nextPosition: { ...positionPlayer.currentPosition! },
    isSwap: true,
  };
  return nextPlayer;
}

function setPositions(player: LivePlayer, playerIndex: number) {
  let currentPosition;
  let pos: string[] = [];

  switch (playerIndex % 11) {
    case 0:
      currentPosition = { id: 'LCB', type: 'CB' };
      pos = ['CB', 'FB', 'HM'];
      break;

    case 1:
      currentPosition = { id: 'S', type: 'S' };
      pos = ['S', 'W'];
      break;

    case 2:
      currentPosition = { id: 'AM1', type: 'AM' };
      pos = ['AM', 'HM'];
      break;

    case 3:
      currentPosition = { id: 'HM', type: 'HM' };
      pos = ['HM', 'CB'];
      break;

    case 4:
      currentPosition = { id: 'RW', type: 'W' };
      pos = ['W'];
      break;

    case 5:
      currentPosition = { id: 'RFB', type: 'FB' };
      pos = ['FB'];
      break;

    case 6:
      currentPosition = { id: 'LW', type: 'W' };
      pos = ['W'];
      break;

    case 7:
      currentPosition = { id: 'RCB', type: 'CB' };
      pos = ['CB'];
      break;

    case 8:
      currentPosition = { id: 'LFB', type: 'FB' };
      pos = ['FB'];
      break;

    case 9:
      currentPosition = { id: 'AM2', type: 'AM' };
      pos = ['AM'];
      break;

    case 10:
      currentPosition = { id: 'GK', type: 'GK' };
      pos = ['GK'];
      break;

    default:
      break;
  }

  player.currentPosition = currentPosition;
  player.positions = pos;
}
