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
    players: {
      on: [],
      next: []
    },
    playerTemplate: document.querySelector('.playerTemplate'),
    containers: {
      title: document.querySelector('.mdl-layout-title'),
      on: document.getElementById('live-on'),
      next: document.getElementById('live-next'),
      off: document.getElementById('live-off'),
      out: document.getElementById('live-out'),
      formation: {
        forward: document.getElementById('players-forward'),
        mid1: document.getElementById('players-mid1'),
        mid2: document.getElementById('players-mid2'),
        back: document.getElementById('players-back'),
        gk: document.getElementById('players-gk')
      }
    },
    subs: {
      template: document.querySelector('.subTemplate'),
      container: document.getElementById('subsList'),
      dialog: document.getElementById('dialogSubs')
    }
  };

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

  document.getElementById('menuSave').addEventListener('click', function() {
    liveGame.saveGame();
  });

  document.getElementById('buttonSub').addEventListener('click', function() {
    liveGame.substitutePlayers();
  });

  document.getElementById('buttonRemoveStarter').addEventListener('click', function() {
    liveGame.removeStarterCards();
  });

  document.getElementById('buttonCancelSub').addEventListener('click', function() {
    var selected = liveGame.getSelectedPlayers(liveGame.containers.next);
    liveGame.cancelNextSubs(selected.ids);
    liveGame.movePlayers(selected,
      liveGame.containers.next,
      liveGame.containers.off);
  });

  document.getElementById('buttonNext').addEventListener('click', function() {
    liveGame.setupPlayerChooser('sub');
  });

  document.getElementById('buttonStarter').addEventListener('click', function() {
    liveGame.setupPlayerChooser('starter');
  });

  document.getElementById('buttonSaveSubs').addEventListener('click', function() {
    liveGame.saveSubs();
  });

  document.getElementById('buttonCloseSubs').addEventListener('click', function() {
    liveGame.closeSubs();
  });

  /*****************************************************************************
   *
   * Methods to update/refresh the UI
   *
   ****************************************************************************/

  liveGame.getSelectedPlayers = function(container, useFormation) {
    var selector = useFormation ? ':scope .live-formation-line > .player > .playerSelect'
                                : ':scope .player > .playerSelect';
    var playerSelects = container.querySelectorAll(selector);
    var selectedIds = [];
    var tuples = [];
    for (var i = 0; i < playerSelects.length; ++i) {
      var item = playerSelects[i];
      if (item.checked) {
        selectedIds.push(item.value);
        tuples.push({
          id: item.value,
          player: this.getPlayer(item.value),
          card: item.parentNode,
          node: item.parentNode
        });
      }
    }
    return {ids: selectedIds, pairs: tuples, tuples: tuples};
  };

  liveGame.movePlayers = function(players, from, to, useFormation) {
    if (useFormation) {
    }
    players.tuples.forEach(tuple => {
      var player = tuple.player;
      var card = tuple.card;
      card.parentNode.removeChild(card);
      if (useFormation) {
        this.getFormationContainer(player.currentPosition).appendChild(card);
      } else {
        to.appendChild(card);
      }
      // TODO: Need to deselect the node after moving
      this.updatePlayerCard(player);
    });
  };

  liveGame.setupPlayerChooser = function(mode) {
    var selected = this.getSelectedPlayers(liveGame.containers.off);

    clearChildren(this.subs.container);

    selected.tuples.forEach(tuple => {
      var player = tuple.player;

      if (!player.currentPosition) {
        player.currentPosition = player.positions[0];
      }

      // Create new list item to add to list
      var listItem = this.subs.template.cloneNode(true);
      listItem.classList.remove('subTemplate');
      listItem.querySelector('.playerName').textContent = player.name;
      listItem.querySelector('.currentPosition').textContent = player.currentPosition;

      // Populate the positions
      //  - First, the common positions for the player
      //  - Second, the remaining positions from the formation
      var selectPosition = listItem.querySelector('.selectPosition');
      var orderedPositions = player.positions.concat(
        this.formation.uniquePositions().filter(position => !player.positions.includes(position))
        );

      orderedPositions.forEach(position => {
        var optionPosition = document.createElement('option');
        optionPosition.value = position;
        optionPosition.textContent = position;
        selectPosition.appendChild(optionPosition);
      });

      if (mode === 'sub') {
        // Populate players to be replaced
        var selectPlayer = listItem.querySelector('.selectPlayer');
        this.players.on.forEach(player => {
          var optionReplace = document.createElement('option');
          optionReplace.value = player.name;
          optionReplace.textContent = player.name + ' - ' + player.currentPosition;
          selectPlayer.appendChild(optionReplace);
        });
        selectPlayer.removeAttribute('hidden');
      }

      // Add fully initialized item to list
      listItem.removeAttribute('hidden');
      this.subs.container.appendChild(listItem);
    });

    // Show the dialog, now that it's populated with the selected players
    this.playerChooserMode = mode;
    this.subs.dialog.showModal();
  };

  liveGame.substitutePlayers = function() {
    var subs = this.getSelectedPlayers(liveGame.containers.next);

    subs.tuples.forEach(tuple => {
      var playerIn = tuple.player;
      var cardIn = tuple.card;
      var playerOut = this.getPlayer(playerIn.replaces);

      // Find the card for the player to be substituted
      var subContainer = this.getFormationContainer(playerOut.currentPosition);
      var cardOut = this.getOnPlayerCard(subContainer, playerOut);

      // Swap the player cards for the in/out players
      //  - If same position, can replace directly in same container
      //  - Otherwise, need to find container for player going on
      if (playerIn.currentPosition === playerOut.currentPosition) {
        // This will also remove the in card from its current container
        subContainer.replaceChild(cardIn, cardOut);
      } else {
        subContainer.removeChild(cardOut);
        this.getFormationContainer(playerIn.currentPosition).appendChild(cardIn);
      }
      this.containers.off.appendChild(cardOut);
      // TODO: Need to deselect the node after moving
      //this.updatePlayerCard(player);
    });

    this.substitute(subs.ids);
  };

  liveGame.removeStarterCards = function() {
    var selected = liveGame.getSelectedPlayers(liveGame.containers.on, true);
    liveGame.removeStarters(selected.ids);
    liveGame.movePlayers(selected,
      liveGame.containers.on,
      liveGame.containers.off);
  };

  liveGame.getFormationContainer = function(position) {
    return this.containers.formation[this.formation.getLineForPosition(position)];
  };

  liveGame.getOnPlayerCard = function(container, player) {
    var playerSelects = container.querySelectorAll(':scope .player > .playerSelect');
    for (var i = 0; i < playerSelects.length; ++i) {
      var select = playerSelects[i];
      if (select.value === player.name) {
        return select.parentNode;
      }
    }
    throw new Error('No card found for player: ' + player.name);
  };

  liveGame.movePlayerCard = function(player, card, from, to) {
    from.removeChild(card);
    to.appendChild(card);
    // TODO: Need to deselect the node after moving
    //this.updatePlayerCard(player);
  };

  liveGame.updatePlayerCard = function(player) {
    var card = this.visiblePlayerCards[player.name];
    if (!card) {
      card = this.playerTemplate.cloneNode(true);
      card.classList.remove('playerTemplate');
      card.querySelector('.playerName').textContent = player.name;
      card.querySelector('.playerSelect').value = player.name;
      card.removeAttribute('hidden');
      this.containers.off.appendChild(card);
      this.visiblePlayerCards[player.name] = card;
    }
    card.querySelector('.currentPosition').textContent = player.currentPosition;
    card.querySelector('.subFor').textContent = player.replaces;
    card.querySelector('.playerPositions').textContent =
      player.positions.join(' ');
  };

  liveGame.updateGame = function() {
    this.containers.title.textContent = 'Live: ' + this.game.name();
  };

  liveGame.saveSubs = function() {
    var mode = this.playerChooserMode;

    // Extract updated position/replacement from dialog
    var items = this.subs.container.querySelectorAll('.sub');
    for (var i = 0; i < items.length; ++i) {
      var listItem = items[i];
      var id = listItem.querySelector('.playerName').textContent;
      var player = this.getPlayer(id);

      // Get the position
      var selectPosition = listItem.querySelector('.selectPosition');
      player.currentPosition = selectPosition.options[selectPosition.selectedIndex].value;

      if (mode === 'starter') {
        this.players.on.push(player);
        // TODO: Record starters for game
        continue;
      }

      // Get the player to be replaced
      var selectPlayer = listItem.querySelector('.selectPlayer');
      player.replaces = selectPlayer.options[selectPlayer.selectedIndex].value;
    }

    // TODO: Figure out/prompt for any position changes for players remaining on the field

    // Get the selected players (again), to move them and update the UI
    var selected = this.getSelectedPlayers(this.containers.off);
    var toContainer = null;
    var useFormation = false;
    switch (mode) {
      case 'sub':
        toContainer = this.containers.next;
        break;
      case 'starter':
        toContainer = this.containers.on;
        useFormation = true;
        break;
    }
    this.movePlayers(selected,
      this.containers.off,
      toContainer,
      useFormation);

    this.closeSubs();
  };

  liveGame.closeSubs = function() {
    this.playerChooserMode = null;
    this.subs.dialog.close();
  };

  /*****************************************************************************
   *
   * Methods for dealing with the model
   *
   ****************************************************************************/

  liveGame.toggleClock = function() {
    var game = this.game;
    var clockRunning = game.toggleClock();
    if (clockRunning) {
      if (!this.stopwatch) {
        this.stopwatch = new Stopwatch(document.querySelector('#gameClock'), null);
      }
      this.stopwatch.start();
    } else {
      this.stopwatch.stop();
    }
  };

  liveGame.completeGame = function() {
    var clockRunning = this.game.completeGame();
  };

  liveGame.getPlayer = function(id) {
    return this.roster.find(player => player.name === id);
  };

  liveGame.cancelNextSubs = function(players) {
    console.log('next cancel', players);
    players.forEach(id => {
      var player = this.getPlayer(id);
      player.replaces = null;
    });
  };

  liveGame.removeStarters = function(players) {
    console.log('remove starters', players);
    players.forEach(id => {
      var player = this.getPlayer(id);
    });
  };

  liveGame.substitute = function(players, positionChanges) {
    console.log('do subs', players, positionChanges);
    players.forEach(id => {
      var playerIn = this.getPlayer(id);
      playerIn.replaces = null;
    });
  };

  liveGame.saveGame = function() {
    console.log('saving time');
    LineupTracker.saveGames();
  };


 /*****************************************************************************
  *
  * Code required to start the app
  *
  ****************************************************************************/
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

  var currentGame = LineupTracker.retrieveGame(liveGame.gameId);

  console.log('Retrieved game: ', currentGame);

  if (!currentGame.formation) {
    currentGame.formation = new LineupTracker.Formation();
  }
  if (!currentGame.formation.complete) {
    // Eventually should support editing formation instead
    currentGame.formation.setDefault();
  }

  console.log('Setting game: ', currentGame);
  liveGame.game = currentGame;
  liveGame.formation = currentGame.formation;
  liveGame.roster = LineupTracker.retrieveRoster();

  liveGame.updateGame();
  liveGame.roster.forEach(function(player) {
    liveGame.updatePlayerCard(player);
  });
})();
