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
    clock: null,
    visiblePlayerCards: [],
    playerTemplate: document.querySelector('.playerTemplate'),
    buttons: {
      toggleClock: document.getElementById('buttonToggleClock'),
      startGame: document.getElementById('buttonStartGame'),
      completeGame: document.getElementById('buttonComplete'),
      save: document.getElementById('buttonSave'),
      addStarter: document.getElementById('buttonStarter'),
      removeStarter: document.getElementById('buttonRemoveStarter'),
      addNext: document.getElementById('buttonNext'),
      cancelNext: document.getElementById('buttonCancelSub'),
      sub: document.getElementById('buttonSub'),
    },
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
  liveGame.buttons.toggleClock.addEventListener('click', function() {
    liveGame.toggleClock();
  });

  liveGame.buttons.startGame.addEventListener('click', function() {
    liveGame.startGame();
  });

  liveGame.buttons.completeGame.addEventListener('click', function() {
    liveGame.completeGame();
  });

  liveGame.buttons.save.addEventListener('click', function() {
    liveGame.saveGame();
  });

  document.getElementById('menuReset').addEventListener('click', function() {
    liveGame.resetGame();
  });

  document.getElementById('menuDebug').addEventListener('click', function() {
    liveGame.dumpDebugInfo();
  });

  liveGame.buttons.sub.addEventListener('click', function() {
    liveGame.substitutePlayerCards();
  });

  liveGame.buttons.removeStarter.addEventListener('click', function() {
    liveGame.removeStarterCards();
  });

  liveGame.buttons.cancelNext.addEventListener('click', function() {
    liveGame.cancelNextSubCards();
  });

  liveGame.buttons.addNext.addEventListener('click', function() {
    liveGame.setupPlayerChooser('sub');
  });

  liveGame.buttons.addStarter.addEventListener('click', function() {
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

  liveGame.getSelectedPlayerCards = function(container, useFormation) {
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
          card: item.parentNode
        });
      }
    }
    return {ids: selectedIds, tuples: tuples};
  };

  liveGame.movePlayerCards = function(playerCallback, from, to, useFormation) {
    var selected = this.getSelectedPlayerCards(from);

    selected.tuples.forEach(tuple => {
      var player = tuple.player;
      var card = tuple.card;
      card.parentNode.removeChild(card);
      this.placePlayerCard(card, player, to, useFormation);
      if (playerCallback) {
        playerCallback(player);
      }
      // TODO: Need to deselect the node after moving
      this.updatePlayerCard(player);
    });
  };

  liveGame.setupPlayerChooser = function(mode) {
    var selected = this.getSelectedPlayerCards(liveGame.containers.off);

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
        this.getPlayersByStatus('ON').forEach(player => {
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

  liveGame.substitutePlayerCards = function() {
    var subs = this.getSelectedPlayerCards(liveGame.containers.next);

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
      this.substitutePlayer(playerIn, playerOut);
    });
  };

  liveGame.removeStarterCards = function() {
    this.movePlayerCards(this.removeStarter.bind(this),
      this.containers.on,
      this.containers.off,
      true);
  };

  liveGame.cancelNextSubCards = function() {
    this.movePlayerCards(this.cancelNextSub,
      this.containers.next,
      this.containers.off);
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

  liveGame.placePlayerCard = function(card, player, to, useFormation) {
    if (useFormation) {
      this.getFormationContainer(player.currentPosition).appendChild(card);
    } else {
      if (!to) {
        to = this.containers[player.status.toLowerCase()];
      }
      to.appendChild(card);
    }
  };

  liveGame.updatePlayerCard = function(player) {
    var card = this.visiblePlayerCards[player.name];
    if (!card) {
      card = this.playerTemplate.cloneNode(true);
      card.classList.remove('playerTemplate');
      card.querySelector('.playerName').textContent = player.name;
      card.querySelector('.playerSelect').value = player.name;
      card.removeAttribute('hidden');

      // Place the card correctly, depending on the player status
      this.placePlayerCard(card, player, null, (player.status === 'ON'));

      this.visiblePlayerCards[player.name] = card;
    }
    card.querySelector('.currentPosition').textContent = player.currentPosition;
    card.querySelector('.subFor').textContent = player.replaces;
    card.querySelector('.playerPositions').textContent =
      player.positions.join(' ');
  };

  liveGame.setupGame = function() {
    this.containers.title.textContent = 'Live: ' + this.game.name();

    // Restore/resume the game clock if needed
    if (this.game.status === 'LIVE') {
      this.resumeClock(true);
    }

    this.game.roster.forEach(function(player) {
      liveGame.updatePlayerCard(player);
    });

    this.updateButtonStates();
  };

  liveGame.saveSubs = function() {
    let setupPlayer = null;
    let useReplaces = false;
    var toContainer = null;
    var useFormation = false;
    
    switch (this.playerChooserMode) {
      case 'sub':
        setupPlayer = this.setupNextSub;
        toContainer = this.containers.next;
        useReplaces = true;
        break;
      case 'starter':
        setupPlayer = this.setupStarter;
        toContainer = this.containers.on;
        useFormation = true;
        break;
    }
    setupPlayer = setupPlayer.bind(this);

    // Extract updated position/replacement from dialog
    var items = this.subs.container.querySelectorAll('.sub');
    for (var i = 0; i < items.length; ++i) {
      var listItem = items[i];
      var id = listItem.querySelector('.playerName').textContent;
      var player = this.getPlayer(id);

      // Get the position
      var selectPosition = listItem.querySelector('.selectPosition');
      player.currentPosition = selectPosition.options[selectPosition.selectedIndex].value;

      if (!useReplaces) {
        continue;
      }

      // Get the player to be replaced
      var selectPlayer = listItem.querySelector('.selectPlayer');
      player.replaces = selectPlayer.options[selectPlayer.selectedIndex].value;
    }

    // TODO: Figure out/prompt for any position changes for players remaining on the field

    // Move the subs and update the UI
    this.movePlayerCards(setupPlayer,
      this.containers.off,
      toContainer,
      useFormation);

    this.closeSubs();
  };

  liveGame.closeSubs = function() {
    this.playerChooserMode = null;
    this.subs.dialog.close();
  };

  liveGame.updateButtonStates = function() {
    let isNew = this.game.status === 'NEW';
    let isLive = (this.game.status === 'LIVE');

    this.buttons.startGame.disabled = !isNew;
    this.buttons.addStarter.disabled = !isNew;
    this.buttons.removeStarter.disabled = !isNew;

    this.buttons.toggleClock.disabled = !isLive;
    this.buttons.completeGame.disabled = !isLive;
  };

  /*****************************************************************************
   *
   * Methods for dealing with the model
   *
   ****************************************************************************/

  liveGame.resumeClock = function(loading) {
    if (!this.clock) {
      this.clock = new Stopwatch(document.querySelector('#gameClock'), null);
    }
    var game = this.game;
    let elapsed = game.elapsed;
    if (loading && game.clockRunning && elapsed > 0) {
      // When loading the page initially, with a running clock and elapsed time
      // accumulated, need to adjust the time so the clock displays correctly.
      elapsed += (performance.now() - game.lastClockTime);
    }
    this.clock.restore(
      game.lastClockTime,
      elapsed,
      game.clockRunning);
  };

  liveGame.toggleClock = function() {
    var clockRunning = this.game.toggleClock();
    if (clockRunning) {
      this.resumeClock();
    } else {
      this.clock.pause();
    }
    this.saveGame();
  };

  liveGame.startGame = function() {
    if (this.game.startGame())
    {
      this.updateButtonStates();
    }
  };

  liveGame.completeGame = function() {
    var clockRunning = this.game.completeGame();
    this.updateButtonStates();
  };

  liveGame.getPlayer = function(id) {
    return this.game.getPlayer(id);
  };

  liveGame.getPlayersByStatus = function(status) {
    return this.game.getPlayersByStatus(status);
  };

  liveGame.setupNextSub = function(player) {
    player.status = 'NEXT';
  };

  liveGame.cancelNextSub = function(player) {
    player.replaces = null;
    player.status = 'OFF';
  };

  liveGame.setupStarter = function(player) {
    console.log('setup starter', player);
    player.status = 'ON';
    this.game.addStarter(player.name);
  };

  liveGame.removeStarter = function(player) {
    console.log('remove starter', player);
    player.status = 'OFF';
    this.game.removeStarter(player.name);
  };

  liveGame.substitutePlayer = function(playerIn, playerOut) {
    console.log('do sub, in:out', playerIn, playerOut); //positionChanges);
    this.game.substitutePlayer(playerIn, playerOut);
  };

  liveGame.saveGame = function() {
    console.log('saving time');
    LineupTracker.saveGame(this.game);
  };

  liveGame.resetGame = function() {
    console.log('reset now');
    this.game.resetGame();
    if (this.clock) {
      this.clock.stop();
      this.clock.reset();
      this.clock.print();
    }
    this.updateButtonStates();
  };

  liveGame.dumpDebugInfo = function() {
    console.log('DEBUG !!!!!!!');
    console.log('Game:', this.game.toDebugJSON());
    this.game.roster.forEach(player => {
      console.log('Player: ', player);
    });
    console.log('Starters: ', this.game.starters);
    console.log('Events: ', this.game.events);
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

  // Setup formation as needed
  if (!currentGame.formation) {
    currentGame.formation = new LineupTracker.Formation();
  }
  if (!currentGame.formation.complete) {
    // Eventually should support editing formation instead
    currentGame.formation.setDefault();
  }

  // Setup roster as needed
  if (!currentGame.roster) {
    currentGame.roster = LineupTracker.retrieveRoster();
  }

  console.log('Setting game: ', currentGame);
  liveGame.game = currentGame;
  liveGame.formation = currentGame.formation;

  liveGame.setupGame();
})();
