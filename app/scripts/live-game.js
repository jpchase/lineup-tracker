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
    shiftIntervalId: null,
    visiblePlayerCards: [],
    playerTemplate: document.querySelector('.playerTemplate'),
    buttons: {
      toggleClock: document.getElementById('buttonToggleClock'),
      startGame: document.getElementById('buttonStartGame'),
      nextPeriod: document.getElementById('buttonNextPeriod'),
      completeGame: document.getElementById('buttonComplete'),
      save: document.getElementById('buttonSave'),
      addStarter: document.getElementById('buttonStarter'),
      removeStarter: document.getElementById('buttonRemoveStarter'),
      addNext: document.getElementById('buttonNext'),
      addSwap: document.getElementById('buttonSwap'),
      cancelNext: document.getElementById('buttonCancelNext'),
      sub: document.getElementById('buttonSub'),
    },
    menus: {
      captains: document.getElementById('menuCaptains'),
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
    },
    captains: {
      container: document.getElementById('captainsContainer'),
      dialog: document.getElementById('dialogCaptains')
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

  liveGame.buttons.nextPeriod.addEventListener('click', function() {
    liveGame.nextPeriod();
  });

  liveGame.buttons.completeGame.addEventListener('click', function() {
    liveGame.completeGame();
  });

  liveGame.buttons.save.addEventListener('click', function() {
    liveGame.saveGame();
  });

  liveGame.menus.captains.addEventListener('click', function() {
    liveGame.updateCaptains();
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
    liveGame.cancelNextCards();
  });

  liveGame.buttons.addSwap.addEventListener('click', function() {
    liveGame.setupPlayerChooser('swap');
  });

  liveGame.buttons.addNext.addEventListener('click', function() {
    liveGame.setupPlayerChooser('sub');
  });

  liveGame.buttons.addStarter.addEventListener('click', function() {
    liveGame.setupPlayerChooser('starter');
  });

  document.getElementById('buttonSaveSubs').addEventListener('click', () => {
    liveGame.saveSubs();
  });

  document.getElementById('buttonCloseSubs').addEventListener('click', () => {
    liveGame.closeSubs();
  });

  document.getElementById('buttonSaveCaptains').addEventListener('click',
  function() {
    liveGame.saveCaptains();
  });

  document.getElementById('buttonCloseCaptains').addEventListener('click',
  function() {
    liveGame.closeCaptains();
  });

  /*****************************************************************************
   *
   * Methods to update/refresh the UI
   *
   ****************************************************************************/

  liveGame.getSelectedPlayerCards = function(container, useFormation) {
    var selector = useFormation ?
      ':scope .live-formation-line > .player > .playerSelect' :
      ':scope .player > .playerSelect';
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
          isSwap: (item.parentNode.dataset.isSwap === 'true'),
          select: item
        });
      }
    }
    return {ids: selectedIds, tuples: tuples};
  };

  liveGame.visitPlayerCards = function(cardCallback) {
    this.game.roster.forEach(player => {
      var card = this.visiblePlayerCards[player.name];
      if (!card) {
        throw new Error('No card found for: ' + player.name);
      }
      cardCallback(player, card);
    });
  };

  liveGame.movePlayerCards = function(playerCallback, from, to, useFormation) {
    var selected = this.getSelectedPlayerCards(from);

    selected.tuples.forEach(tuple => {
      var player = tuple.player;
      var card = tuple.card;
      card.parentNode.removeChild(card);
      if (playerCallback) {
        playerCallback(player, tuple.isSwap);
      }
      if (tuple.isSwap) {
        return;
      }
      this.placePlayerCard(card, player, to, useFormation);
      tuple.select.checked = false;
      this.updatePlayerCard(player);
    });
  };

  liveGame.addSwapCards = function(from, to) {
    var selected = this.getSelectedPlayerCards(from);

    selected.tuples.forEach(tuple => {
      var player = tuple.player;
      var card = tuple.card;
      var swapCard = card.cloneNode(true);
      swapCard.dataset.isSwap = 'true';
      this.placePlayerCard(swapCard, player, to);
      tuple.select.checked = false;
      this.updateSwapCard(player, swapCard);
    });
  };

  liveGame.setupPlayerChooser = function(mode) {
    var container = (mode === 'swap') ? liveGame.containers.on :
                                      liveGame.containers.off;
    var selected = this.getSelectedPlayerCards(container);

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
      listItem.querySelector('.currentPosition').textContent =
        player.currentPosition;

      // Populate the positions
      //  - First, the common positions for the player
      //  - Second, the remaining positions from the formation
      var selectPosition = listItem.querySelector('.selectPosition');
      var orderedPositions = player.positions.concat(
        this.formation.uniquePositions().filter(
          position => !player.positions.includes(position))
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
          optionReplace.textContent = player.name + ' - ' +
            player.currentPosition;
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

      if (tuple.isSwap) {
        // Find the actual card for the player
        let swapContainer = this.getFormationContainer(
          playerIn.currentPosition);
        let actualCard = this.getOnPlayerCard(swapContainer, playerIn);

        // Move the player card to the new position
        swapContainer.removeChild(actualCard);
        this.getFormationContainer(playerIn.nextPosition).appendChild(
          actualCard);

        // Remove the swap card
        cardIn.parentNode.removeChild(cardIn);

        tuple.select.checked = false;
        this.swapPosition(playerIn);
        return;
      }

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
        this.getFormationContainer(playerIn.currentPosition).appendChild(
          cardIn);
      }
      this.containers.off.appendChild(cardOut);
      tuple.select.checked = false;
      this.substitutePlayer(playerIn, playerOut);
    });
  };

  liveGame.removeStarterCards = function() {
    this.movePlayerCards(this.removeStarter.bind(this),
      this.containers.on,
      this.containers.off);
  };

  liveGame.cancelNextCards = function() {
    this.movePlayerCards(this.cancelNextSubOrSwap,
      this.containers.next,
      this.containers.off);
  };

  liveGame.getFormationContainer = function(position) {
    return this.containers.formation[this.formation.getLineForPosition(
      position)];
  };

  liveGame.getOnPlayerCard = function(container, player) {
    var playerSelects = container.querySelectorAll(
      ':scope .player > .playerSelect');
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
    var isOn = (player.status === 'ON');
    var card = this.visiblePlayerCards[player.name];
    if (!card) {
      card = this.playerTemplate.cloneNode(true);
      card.classList.remove('playerTemplate');
      card.querySelector('.playerName').textContent = player.name;
      card.querySelector('.playerSelect').value = player.name;
      card.removeAttribute('hidden');

      // Place the card correctly, depending on the player status
      this.placePlayerCard(card, player, null, isOn);

      this.visiblePlayerCards[player.name] = card;
    }
    card.querySelector('.currentPosition').textContent = player.currentPosition;
    card.querySelector('.subFor').textContent = player.replaces;
    card.querySelector('.playerPositions').textContent =
      player.positions.join(' ');
    if (this.game.captains.find(captain => player.name === captain)) {
      this.addCaptainBadge(card);
    }

    this.updateShiftTime(player, card);
  };

  liveGame.updateSwapCard = function(player, swapCard) {
    swapCard.querySelector('.currentPosition').textContent =
      player.currentPosition;
    swapCard.querySelector('.subFor').textContent = player.nextPosition;
  };

  liveGame.updateShiftTime = function(player, card) {
    var isOn = (player.status === 'ON');
    var shiftStartTime = (isOn ? player.lastOnTime : player.lastOffTime);
    var formattedShiftTime = '';
    if (shiftStartTime && !isNaN(shiftStartTime)) {
      var elapsed = calculateElapsed(shiftStartTime, Date.now());
      formattedShiftTime = pad0(elapsed[0], 2) + ':' + pad0(elapsed[1], 2);
    }
    card.querySelector('.shiftTime').textContent = formattedShiftTime;
  };

  liveGame.setupGame = function() {
    this.containers.title.textContent = 'Live: ' + this.game.name();

    // Restore/resume the game clock if needed
    if (this.game.status === 'LIVE') {
      this.resumeClock(true);
    }

    this.game.roster.forEach(player => {
      this.updatePlayerCard(player);
    });

    this.updateButtonStates();
  };

  liveGame.saveSubs = function() {
    let setupPlayer = null;
    let useReplaces = false;
    let useNextPosition = false;
    var toContainer = this.containers.next;
    var useFormation = false;

    switch (this.playerChooserMode) {
      case 'sub':
        setupPlayer = this.setupNextSub;
        useReplaces = true;
        break;
      case 'starter':
        setupPlayer = this.setupStarter;
        toContainer = this.containers.on;
        useFormation = true;
        break;
      case 'swap':
        useNextPosition = true;
        break;
      default:
    }
    if (setupPlayer) {
      setupPlayer = setupPlayer.bind(this);
    }

    // Extract updated position/replacement from dialog
    var items = this.subs.container.querySelectorAll('.sub');
    for (var i = 0; i < items.length; ++i) {
      var listItem = items[i];
      var id = listItem.querySelector('.playerName').textContent;
      var player = this.getPlayer(id);

      // Get the position
      var selectPosition = listItem.querySelector('.selectPosition');
      var newPosition =
        selectPosition.options[selectPosition.selectedIndex].value;
      if (useNextPosition) {
        player.nextPosition = newPosition;
      } else {
        player.currentPosition = newPosition;
      }

      if (!useReplaces) {
        continue;
      }

      // Get the player to be replaced
      var selectPlayer = listItem.querySelector('.selectPlayer');
      player.replaces = selectPlayer.options[selectPlayer.selectedIndex].value;
    }

    if (useNextPosition) {
      // Record any position changes for players remaining on the field
      this.addSwapCards(this.containers.on, toContainer);
    } else {
      // Move the subs and update the UI
      this.movePlayerCards(setupPlayer,
        this.containers.off,
        toContainer,
        useFormation);
    }

    this.closeSubs();
  };

  liveGame.closeSubs = function() {
    this.playerChooserMode = null;
    this.subs.dialog.close();
  };

  liveGame.nextPeriod = function() {
    /* var clockRunning = */this.game.nextPeriod();
    this.updateButtonStates();
  };

  liveGame.updateButtonStates = function() {
    let isNew = (this.game.status === 'NEW');
    let isStart = (this.game.status === 'START');
    let isLive = (this.game.status === 'LIVE');
    let isBreak = (this.game.status === 'BREAK');

    this.buttons.startGame.disabled = !isNew;
    this.buttons.addStarter.disabled = !isNew;
    this.buttons.removeStarter.disabled = !isNew;
    this.menus.captains.disabled = !isNew;

    this.buttons.toggleClock.disabled = !(isLive || isStart || isBreak);
    this.buttons.nextPeriod.disabled = !isLive;
    this.buttons.completeGame.disabled = !isLive;
  };

  liveGame.refreshShiftTimes = function() {
    this.visitPlayerCards(this.updateShiftTime);
  };

  liveGame.startShiftTimeUpdater = function() {
    // Make sure the updater is not currently running
    this.stopShiftTimeUpdater();
    // Refresh the display of shift times every 10 seconds
    this.shiftIntervalId = setInterval(this.refreshShiftTimes.bind(this), 10000);
  };

  liveGame.stopShiftTimeUpdater = function() {
    if (!this.shiftIntervalId) {
      return;
    }
    clearInterval(this.shiftIntervalId);
    this.shiftIntervalId = null;
  };

  liveGame.updateCaptains = function() {
    var currentCaptains = null;
    var setCurrent = false;
    if (this.game.captains.length) {
      currentCaptains = this.game.captains.slice(0);
      setCurrent = true;
    }

    var items = this.captains.container.querySelectorAll('.selectCaptain');
    for (let i = 0; i < items.length; ++i) {
      let selectCaptain = items[i];

      // Clear previous players, in case roster changed
      while (selectCaptain.options.length > 0) {
        selectCaptain.remove(0);
      }

      // Populate players
      this.game.roster.forEach(player => {
        let optionCaptain = document.createElement('option');
        optionCaptain.value = player.name;
        optionCaptain.textContent = player.name;
        selectCaptain.appendChild(optionCaptain);
      });

      if (setCurrent) {
        selectCaptain.value = currentCaptains[i];
      }
    }

    // Show the dialog, now that it's populated with players
    this.captains.dialog.showModal();
  };

  liveGame.saveCaptains = function() {
    // Extract updated captains from dialog
    var items = this.captains.container.querySelectorAll('.selectCaptain');
    var captains = [];
    for (var i = 0; i < items.length; ++i) {
      var selectCaptain = items[i];
      captains.push(selectCaptain.options[selectCaptain.selectedIndex].value);
    }

    const replaced = this.game.updateCaptains(captains);

    replaced.forEach(oldCaptain => {
      let card = this.visiblePlayerCards[oldCaptain];
      let playerName = card.querySelector('.playerName');
      playerName.dataset.badge = null;
      playerName.classList.remove('mdl-badge');
    });

    captains.forEach(newCaptain => {
      let card = this.visiblePlayerCards[newCaptain];
      this.addCaptainBadge(card);
    });

    this.closeCaptains();
  };

  liveGame.closeCaptains = function() {
    this.captains.dialog.close();
  };

  liveGame.addCaptainBadge = function(card) {
    let playerName = card.querySelector('.playerName');
    playerName.dataset.badge = 'C';
    playerName.classList.add('mdl-badge');
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
      this.startShiftTimeUpdater();
    } else {
      this.clock.pause();
      this.stopShiftTimeUpdater();
    }
    this.saveGame();
    this.updateButtonStates();
    this.refreshShiftTimes();
  };

  liveGame.startGame = function() {
    if (this.game.startGame()) {
      this.updateButtonStates();
    }
  };

  liveGame.completeGame = function() {
    /* var clockRunning = */this.game.completeGame();
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

  liveGame.cancelNextSubOrSwap = function(player, isSwap) {
    if (isSwap) {
      player.nextPosition = null;
      return;
    }
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
    console.log('do sub, in:out', playerIn, playerOut);
    this.game.substitutePlayer(playerIn, playerOut);
  };

  liveGame.swapPosition = function(player) {
    console.log('swap position', player);
    this.game.swapPosition(player);
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
    var pos = window.location.hash.indexOf('game=');
    if (pos > -1) {
      var gameId = window.location.hash.substr(pos + 'game='.length);
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
