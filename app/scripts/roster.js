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
    player: {
      dialog: document.getElementById('dialogPlayer')
    }

  };

  /*****************************************************************************
   *
   * Event listeners for UI elements
   *
   ****************************************************************************/
  app.buttons.addPlayer.addEventListener('click', () => {
    app.addPlayer();
  });

  document.getElementById('buttonSavePlayer').addEventListener('click', () => {
    app.savePlayer();
  });

  document.getElementById('buttonClosePlayer').addEventListener('click', () => {
    app.closePlayer();
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

  app.addPlayer = function() {
    let container = document.getElementById('positionContainer');
    clearChildren(container);

    let positionTemplate = document.querySelector('.positionTemplate');
    this.formation.uniquePositions().forEach(position => {
      let positionLabel = positionTemplate.cloneNode(true);
      let positionCheck = positionLabel.querySelector('.positionCheck');
      let positionName = positionLabel.querySelector('.positionName');

      positionLabel.classList.remove('positionTemplate');
      positionLabel.htmlFor = positionCheck.id = 'checkPosition' + position;
      positionCheck.value = position;
      positionName.textContent = position + ' 1';

      positionLabel.removeAttribute('hidden');
      container.appendChild(positionLabel);
    });

    this.player.dialog.showModal();
  };

  app.savePlayer = function() {
    let container = document.getElementById('positionContainer');

    // var selector = useFormation ?
    //   ':scope .live-formation-line > .player > .playerSelect' :
    //   ':scope .player > .playerSelect';
    let positions = [];
    let positionChecks =
      container.querySelectorAll(':scope label > .positionCheck');
    for (let i = 0; i < positionChecks.length; ++i) {
      let item = positionChecks[i];
      if (item.checked) {
        positions.push(item.value);
      }
    }

    if (positions.length < 1) {
      console.log('No positions selected');
      return;
    }

    let player = {
      name: document.getElementById('textName').value,
      positions: positions,
      status: 'OFF',
      isCallup: true,
    };

    app.roster.push(player);

    if (app.gameId) {
      let game = LineupTracker.retrieveGame(app.gameId);
      game.roster = app.roster;
      LineupTracker.saveGame(game);
    }

    // Display the new player
    this.updatePlayerCard(player);

    this.closePlayer();
  };

  app.closePlayer = function() {
    this.player.dialog.close();
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

  // Setup formation as needed
  if (!currentGame.formation) {
    currentGame.formation = new LineupTracker.Formation();
  }
  if (!currentGame.formation.complete) {
    // Eventually should support editing formation instead
    currentGame.formation.setDefault();
  }
  app.formation = currentGame.formation;

  app.setupRoster();
})();
