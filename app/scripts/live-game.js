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
    visiblePlayerCards: [],
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

  /*****************************************************************************
   *
   * Event listeners for UI elements
   *
   ****************************************************************************/

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
    card.querySelector('.playerName').textContent = player.name;
    card.querySelector('.playerPosition').textContent =
      player.positions.join(' ');
  };

  liveGame.addStarters = function(players) {
    console.log('Players', players);
  };

  liveGame.selectPlayer = function(container) {
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
