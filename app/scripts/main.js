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

  // Check to make sure service workers are supported in the current browser,
  // and that the current page is accessed from a secure origin. Using a
  // service worker from an insecure origin will trigger JS console errors. See
  // http://www.chromium.org/Home/chromium-security/prefer-secure-origins-for-powerful-new-features
  var isLocalhost = Boolean(window.location.hostname === 'localhost' ||
      // [::1] is the IPv6 localhost address.
      window.location.hostname === '[::1]' ||
      // 127.0.0.1/8 is considered localhost for IPv4.
      window.location.hostname.match(
        /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/
      )
    );

  if ('serviceWorker' in navigator &&
      (window.location.protocol === 'https:' || isLocalhost)) {
    navigator.serviceWorker.register('service-worker.js')
    .then(function(registration) {
      // Check to see if there's an updated version of service-worker.js with
      // new files to cache:
      // https://slightlyoff.github.io/ServiceWorker/spec/service_worker/index.html#service-worker-registration-update-method
      if (typeof registration.update === 'function') {
        registration.update();
      }

      // updatefound is fired if service-worker.js changes.
      registration.onupdatefound = function() {
        // updatefound is also fired the very first time the SW is installed,
        // and there's no need to prompt for a reload at that point.
        // So check here to see if the page is already controlled,
        // i.e. whether there's an existing service worker.
        if (navigator.serviceWorker.controller) {
          // The updatefound event implies that registration.installing is set:
          // https://slightlyoff.github.io/ServiceWorker/spec/service_worker/index.html#service-worker-container-updatefound-event
          var installingWorker = registration.installing;

          installingWorker.onstatechange = function() {
            switch (installingWorker.state) {
              case 'installed':
                // At this point, the old content will have been purged and the
                // fresh content will have been added to the cache.
                // It's the perfect time to display a "New content is
                // available; please refresh." message in the page's interface.
                break;

              case 'redundant':
                throw new Error('The installing ' +
                                'service worker became redundant.');

              default:
                // Ignore
            }
          };
        }
      };
    }).catch(function(e) {
      console.error('Error during service worker registration:', e);
    });
  }

  // Your custom JavaScript goes here
  var LineupTracker = window.LineupTracker || {};

  var app = {
    isLoading: true,
    hasRequestPending: false,
    visibleGameCards: {},
    currentGames: [],
    visiblePlayerCards: {},
    spinner: document.querySelector('.loader'),
    gameCardTemplate: document.querySelector('.gameCardTemplate'),
    playerCardTemplate: document.querySelector('.playerCardTemplate'),
    container: document.querySelector('.game-container'),
    rosterContainer: document.querySelector('.rosterList'),
    addDialog: document.querySelector('.dialog-container')
  };

  /*****************************************************************************
   *
   * Event listeners for UI elements
   *
   ****************************************************************************/
  document.getElementById('tabRoster').addEventListener('click', function() {
    app.showRoster();
  });

  /*****************************************************************************
   *
   * Methods to update/refresh the UI
   *
   ****************************************************************************/

  // Updates a game card with the data. If the card
  // doesn't already exist, it's cloned from the template.
  app.updateGameCard = function(game) {
    var card = app.visibleGameCards[game.id];
    if (!card) {
      card = app.gameCardTemplate.cloneNode(true);
      card.classList.remove('gameCardTemplate');
      card.querySelector('.gameId').textContent = game.id;
      card.removeAttribute('hidden');
      app.container.appendChild(card);
      app.visibleGameCards[game.id] = card;
    }
    card.querySelector('.opponent').textContent = game.opponent;
    card.querySelector('.gameDate').textContent = game.date;
    card.querySelector('.liveLink').href = 'live-game.html#game=' + game.id;
    if (app.isLoading) {
      // app.spinner.setAttribute('hidden', true);
      app.container.removeAttribute('hidden');
      app.isLoading = false;
    }
  };

  app.showRoster = function() {
    var roster = LineupTracker.retrieveRoster();

    roster.forEach(player => {
      this.updatePlayerCard(player);
    });
  };

  // Updates a player card with the data. If the card
  // doesn't already exist, it's cloned from the template.
  app.updatePlayerCard = function(player) {
    var card = app.visiblePlayerCards[player.name];
    if (!card) {
      card = app.playerCardTemplate.cloneNode(true);
      card.classList.remove('playerCardTemplate');
      card.querySelector('.playerName').textContent = player.name;
      card.removeAttribute('hidden');
      app.rosterContainer.appendChild(card);
      app.visiblePlayerCards[player.name] = card;
    }
    card.querySelector('.playerPositions').textContent =
      player.positions.join(' ');

    card.querySelector('.playerGameCount').textContent =
      player.name.length + ' games';
  };

 /*****************************************************************************
  *
  * Code required to start the app
  *
  ****************************************************************************/

  app.currentGames = localStorage.currentGames;
  if (app.currentGames) {
    app.currentGames = JSON.parse(app.currentGames);
  } else {
    app.currentGames = LineupTracker.retrieveGames();
//    app.saveSelectedCities();
  }
  app.currentGames.forEach(function(game) {
    app.updateGameCard(game);
  });
})();
