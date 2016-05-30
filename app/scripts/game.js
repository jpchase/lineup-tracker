
(function() {
  'use strict';

  var LineupTracker = window.LineupTracker || {};

  LineupTracker.Game = function(id, date, opponent, duration) {
    this.id = id;
    this.date = date;
    this.opponent = opponent;
    this.duration = duration;
    this.status = 'NEW'; // LIVE, DONE
    this.clockRunning = false;
    this.elapsed = null;
  };

  LineupTracker.Game.prototype.name = function() {
    var monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug',
      'Sep', 'Oct', 'Nov', 'Dec'
    ];
    return this.opponent + ' ' + monthNames[this.date.getMonth()] + ' ' +
           this.date.getDate();
  };

  LineupTracker.Game.prototype.toggleClock = function() {
    if (this.status === 'DONE' ||
        (this.status === 'NEW' && this.clockRunning)) {
      throw 'Invalid status to toggle clock';
    }
    if (this.status === 'NEW') {
      // Starting the clock for the first time
      console.log('Changing to live.');
      this.status = 'LIVE';
    }

    if (this.clockRunning) {
      console.log('Stop the clock');
      // TODO: Close current timer
    }
    else {
      console.log('Start the clock');
      // TODO: Start new timer
      // if (!this.gameStartTime) { this.gameStartTime = Date.now(); }
    }
    this.clockRunning = !this.clockRunning;
    return this.clockRunning;
  };

  LineupTracker.Game.prototype.completeGame = function() {
    if (this.status !== 'LIVE') {
      throw 'Invalid status to complete game';
    }
    console.log('Changing to done.');
    this.status = 'DONE';
  };

  LineupTracker.retrieveGames = function() {
    var games = [
      new LineupTracker.Game('KOC651', new Date(2016, 4, 21, 14, 0), 'London Youth Whitecaps 03G', 50),
      new LineupTracker.Game('KOC656', new Date(2016, 4, 21, 16, 30), 'Kitchener Spirit 03G', 50),
      new LineupTracker.Game('KOC657', new Date(2016, 4, 22, 11, 30), 'Cambridge United 03G', 50),
      new LineupTracker.Game('KOC660', new Date(2016, 4, 22, 14, 0), 'Semi-Final TBD', 50),
      new LineupTracker.Game('KOC662', new Date(2016, 4, 22, 16, 30), 'Final TBD', 70)
    ];

    return games;
  };

  window.LineupTracker = LineupTracker;
  console.log('Setup LineupTracker in game.js');
})();
