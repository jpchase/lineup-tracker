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
    game: null
//    spinner: document.querySelector('.loader'),
//    cardTemplate: document.querySelector('.cardTemplate'),
//    container: document.querySelector('.main'),
//    addDialog: document.querySelector('.dialog-container'),
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
  var currentGame = games[0];

  liveGame.game = currentGame;
  /*****************************************************************************
   *
   * Event listeners for UI elements
   *
   ****************************************************************************/

  document.getElementById('start').addEventListener('click', function() {
    // Refresh all of the forecasts
    liveGame.updateForecasts();
  });

  document.getElementById('butAdd').addEventListener('click', function() {
    // Open/show the add new city dialog
    liveGame.toggleAddDialog(true);
  });
})();
