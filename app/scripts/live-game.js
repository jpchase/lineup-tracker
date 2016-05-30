/*!
 *
 *  Web Starter Kit
 *  Copyright 2015 Google Inc. All rights reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License
 *
 */
/* eslint-env browser */
(function() {
  'use strict';

  var LineupTracker = window.LineupTracker || {};

  // Your custom JavaScript goes here
  var liveGame = {
    isLoading: true,
    gameId: null,
    game: null,
    roster: null,
    stopwatch: null,
    visiblePlayerCards: [],
    on: {
      players: [],
      container: document.querySelector('#live-on')
    },
    next: {
      players: [],
      container: document.querySelector('#live-next')
    },
    playerTemplate: document.querySelector('.playerTemplate'),
    container: document.querySelector('.live-container'),
    containers: {
      on: document.querySelector('#live-on'),
      next: document.querySelector('#live-next'),
      off: document.querySelector('#live-off'),
      out: document.querySelector('#live-out')
    },
    titleContainer: document.querySelector('.mdl-layout-title')
  };

  liveGame.gameId = window.localStorage.getItem('liveGameId');

  if (!liveGame.gameId) {
    var pos = window.location.search.indexOf('?game=');
    if (pos > -1) {
      var gameId = window.location.search.substr(pos + '?game='.length);
      liveGame.gameId = gameId;
    }
  }

  if (!liveGame.gameId) {
    // Error
  }

  console.log('Starting game: ', liveGame.gameId);

  var games = LineupTracker.retrieveGames();
  var currentGame = games.find(game => game.id === liveGame.gameId);

  liveGame.game = currentGame;
  liveGame.roster = [
    {name: 'Abby', positions: ['AM', 'OM', 'S']},
    {name: 'Anne', positions: ['CB', 'FB', 'HM']},
    {name: 'Brianna', positions: ['CB']},
    {name: 'Brooke', positions: ['AM', 'OM', 'S']},
    {name: 'Cassidy', positions: ['OM']},
    {name: 'Ella', positions: ['AM', 'HM', 'S']},
    {name: 'Emma', positions: ['FB', 'CB']},
    {name: 'Grace', positions: ['GK']},
    {name: 'Jordan', positions: ['OM', 'S']},
    {name: 'Lauren', positions: ['S']},
    {name: 'Lucy', positions: ['FB']},
    {name: 'Michaela', positions: ['FB', 'OM']},
    {name: 'Milla', positions: ['AM', 'HM']},
    {name: 'Natasha', positions: ['HM']},
    {name: 'Naomi', positions: ['CB']},
    {name: 'Payton', positions: ['AM', 'OM', 'HM']},
    {name: 'Sisi', positions: ['AM', 'OM']},
    {name: 'Taty', positions: ['AM', 'OM', 'S']}
  ];
  // TODO: Set the formation for the game

  /*****************************************************************************
   *
   * Event listeners for UI elements
   *
   ****************************************************************************/
  document.getElementById('buttonToggleClock').addEventListener('click', function() {
    liveGame.toggleClock();
  });

  document.getElementById('buttonComplete').addEventListener('click', function() {
    liveGame.completeGame();
  });

  document.getElementById('buttonSub').addEventListener('click', function() {
    var selected = liveGame.getSelectedPlayers(liveGame.containers.next);
    liveGame.substitute(selected.ids);
    liveGame.movePlayers(selected,
      liveGame.containers.next,
      liveGame.containers.on);
  });

  document.getElementById('buttonCancelSub').addEventListener('click', function() {
    var selected = liveGame.getSelectedPlayers(liveGame.containers.next);
    liveGame.cancelNextSubs(selected.ids);
    liveGame.movePlayers(selected,
      liveGame.containers.next,
      liveGame.containers.off);
  });

  document.getElementById('buttonNext').addEventListener('click', function() {
    var selected = liveGame.getSelectedPlayers(liveGame.containers.off);
    liveGame.setupNextSubs(selected.ids);
    liveGame.movePlayers(selected,
      liveGame.containers.off,
      liveGame.containers.next);
  });

  document.getElementById('buttonStarter').addEventListener('click', function() {
    var playerSelects = liveGame.containers.off.querySelectorAll(':scope .player > .playerSelect');
    var selectedIds = [];
    var selected = [];
    for (var i = 0; i < playerSelects.length; ++i) {
      var item = playerSelects[i];
      if (item.checked) {
        selectedIds.push(item.value);
        selected.push(item.parentNode);
      }
    }
    liveGame.addStarters(selectedIds);
    // Move selected players
    selected.forEach(node => {
      liveGame.containers.off.removeChild(node);
      liveGame.containers.on.appendChild(node);
    });
  });

  liveGame.getSelectedPlayers = function(container) {
    var playerSelects = container.querySelectorAll(':scope .player > .playerSelect');
    var selectedIds = [];
    var selected = [];
    for (var i = 0; i < playerSelects.length; ++i) {
      var item = playerSelects[i];
      if (item.checked) {
        selectedIds.push(item.value);
        selected.push(item.parentNode);
      }
    }
    return {ids: selectedIds, nodes: selected};
  };

  liveGame.toggleClock = function() {
    var game = liveGame.game;
    var clockRunning = game.toggleClock();
    if (clockRunning) {
      if (!liveGame.stopwatch) {
        liveGame.stopwatch = new Stopwatch(document.querySelector('#gameClock'), null);
      }
      liveGame.stopwatch.start();
    } else {
      liveGame.stopwatch.stop();
    }
  };

  liveGame.completeGame = function() {
    var game = liveGame.game;
    var clockRunning = game.completeGame();
  };

  liveGame.movePlayers = function(players, from, to) {
    players.nodes.forEach(node => {
      from.removeChild(node);
      to.appendChild(node);
      // TODO: Need to deselect the node after moving
    });
    players.ids.forEach(id => {
      var player = liveGame.getPlayer(id);
      liveGame.updatePlayerCard(player);
    });
  };

  liveGame.updatePlayerCard = function(player) {
    var card = liveGame.visiblePlayerCards[player.name];
    if (!card) {
      card = liveGame.playerTemplate.cloneNode(true);
      card.classList.remove('playerTemplate');
      card.querySelector('.playerName').textContent = player.name;
      card.querySelector('.playerSelect').value = player.name;
      card.removeAttribute('hidden');
      liveGame.containers.off.appendChild(card);
      liveGame.visiblePlayerCards[player.name] = card;
    }
    card.querySelector('.subFor').textContent = player.replaces;
    card.querySelector('.playerPosition').textContent =
      player.positions.join(' ');
  };

  liveGame.addStarters = function(players) {
    console.log('starters', players);
    players.forEach(id => {
      var player = liveGame.getPlayer(id);
      liveGame.on.players.push(player);
      // TODO: Record starters for game
    });
  };

  liveGame.getPlayer = function(id) {
    return liveGame.roster.find(player => player.name === id);
  };

  liveGame.setupNextSubs = function(players) {
    console.log('next', players);
    players.forEach(id => {
      var player = liveGame.getPlayer(id);
      // Figure out/prompt for the position they will take
      var position = player.positions[0];
      console.log('Find player for position: ' + position, liveGame.on.players);
      // Figure out/prompt for the player to be replaced
      var replaced = liveGame.on.players.find(subFor => subFor.positions[0] === position);
      console.log('to be replaced', replaced);
      player.replaces = replaced.name;
    });
    // Figure out/prompt for any position changes for players remaining on the field
  };

  liveGame.cancelNextSubs = function(players) {
    console.log('next cancel', players);
    players.forEach(id => {
      var player = liveGame.getPlayer(id);
      player.replaces = null;
    });
  };

  liveGame.substitute = function(players, positionChanges) {
    console.log('do subs', players, positionChanges);
    players.forEach(id => {
      var player = liveGame.getPlayer(id);
      player.replaces = null;
    });
  };

  liveGame.updateGame = function() {
    var title = liveGame.titleContainer;
    title.textContent = 'Live: ' + this.game.name();
  };

  // Initialization
  liveGame.updateGame();
  liveGame.roster.forEach(function(player) {
    liveGame.updatePlayerCard(player);
  });
})();
