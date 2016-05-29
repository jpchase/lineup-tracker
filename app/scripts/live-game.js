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
    subsContainer: document.querySelector('#live-off'),
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

  liveGame.updatePlayerCard = function(player) {
    var card = liveGame.visiblePlayerCards[player.name];
    if (!card) {
      card = liveGame.playerTemplate.cloneNode(true);
      card.classList.remove('playerTemplate');
      card.querySelector('.playerName').textContent = player.name;
      card.removeAttribute('hidden');
      liveGame.subsContainer.appendChild(card);
      liveGame.visiblePlayerCards[player.name] = card;
    }
    card.querySelector('.playerName').textContent = player.name;
    card.querySelector('.playerPosition').textContent =
      player.positions.join(' ');
  };

  liveGame.updateGame = function() {
    var title = liveGame.titleContainer;
    title.textContent = 'Live: ' + this.game.name();
  };

  liveGame.updateGame();
  liveGame.roster.forEach(function(player) {
    liveGame.updatePlayerCard(player);
  });
})();
