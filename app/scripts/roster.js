/* eslint-env browser */
(function() {
  'use strict';

  var LineupTracker = window.LineupTracker || {};

  var app = {
    gameId: null,
    game: null,
    roster: null,
    widget: document.querySelector('lineup-roster'),
  };

  /*****************************************************************************
   *
   * Methods to update/refresh the UI
   *
   ****************************************************************************/

  app.setupRoster = function() {
    this.widget.roster = this.roster;
    this.widget.isGame = true;
    this.widget.rosterName = this.game.name();
    this.widget.availablePositions = this.formation.uniquePositions();
    this.widget.addEventListener('playerAdded', app.playerAdded);
  };

  app.playerAdded = function(event) {
    console.log('playerAdded fired', event);

    if (app.gameId) {
      let game = LineupTracker.retrieveGame(app.gameId);
      game.roster = app.roster;
      LineupTracker.saveGame(game);
    }
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
  app.game = currentGame;

  app.setupRoster();
})();
