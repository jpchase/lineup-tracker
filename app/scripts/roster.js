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

  var app = {
    gameId: null,
    game: null,
    roster: null,
    visiblePlayerCards: [],
    playerTemplate: document.querySelector('.playerCardTemplate'),
    buttons: {
      addPlayer: document.getElementById('buttonAddPlayer'),
    },
    container: document.querySelector('.rosterList'),
  };

  /*****************************************************************************
   *
   * Event listeners for UI elements
   *
   ****************************************************************************/
  app.buttons.addPlayer.addEventListener('click', () => {
  });

  document.getElementById('menuReset').addEventListener('click', () => {
    // app.resetRoster();
  });

  document.getElementById('menuDebug').addEventListener('click', () => {
    // app.dumpDebugInfo();
  });

  /*****************************************************************************
   *
   * Methods to update/refresh the UI
   *
   ****************************************************************************/

  app.updatePlayerCard = function(player) {
    var card = this.visiblePlayerCards[player.name];
    if (!card) {
      card = this.playerTemplate.cloneNode(true);
      card.classList.remove('playerTemplate');
      card.querySelector('.playerName').textContent = player.name;
      // card.querySelector('.playerSelect').value = player.name;
      card.removeAttribute('hidden');

      this.container.appendChild(card);
      this.visiblePlayerCards[player.name] = card;
    }
    card.querySelector('.playerPositions').textContent =
      player.positions.join(' ');
  };

  app.setupRoster = function() {
    this.roster.forEach(player => {
      this.updatePlayerCard(player);
    });
  };

  /*****************************************************************************
   *
   * Methods for dealing with the model
   *
   ****************************************************************************/

  app.getPlayer = function(id) {
    return this.roster.getPlayer(id);
  };

 /*****************************************************************************
  *
  * Code required to start the app
  *
  ****************************************************************************/
  // app.gameId = window.localStorage.getItem('liveGameId');

  if (!app.gameId) {
    var pos = window.location.hash.indexOf('game=');
    if (pos > -1) {
      var gameId = window.location.hash.substr(pos + 'game='.length);
      app.gameId = gameId;
    }
  }

  if (!app.gameId) {
    // Just edit team roster?
  }

  var currentGame = LineupTracker.retrieveGame(app.gameId);

  console.log('Retrieved game: ', currentGame);

  // Setup roster as needed
  if (currentGame.roster) {
    app.roster = currentGame.roster;
  } else {
    app.roster = LineupTracker.retrieveRoster();
  }

  app.setupRoster();
})();
