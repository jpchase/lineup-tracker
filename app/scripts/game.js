
(function() {
  'use strict';

  var LineupTracker = window.LineupTracker || {};

  LineupTracker.Game = function(id, date, opponent, duration) {
    this.id = id;
    this.date = date;
    this.opponent = opponent;
    this.duration = duration;
  };
  
  LineupTracker.Game.prototype.name = function() {
	  var monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
      'Oct', 'Nov', 'Dec'
	  ];
	  return this.opponent + ' ' + monthNames[this.date.getMonth()] + ' ' + this.date.getDate();
  };
  
  LineupTracker.retrieveGames = function() {
    var games = [
      new LineupTracker.Game('KOC651', new Date(2016, 4, 21, 14, 0), 'London Youth Whitecaps 03G', 50),
      {id: 'KOC656', date: new Date(2016, 4, 21, 16, 30), opponent: 'Kitchener Spirit 03G', length: 50},
      {id: 'KOC657', date: new Date(2016, 4, 22, 11, 30), opponent: 'Cambridge United 03G', length: 50},
      {id: 'KOC660', date: new Date(2016, 4, 22, 14, 0), opponent: 'Semi-Final TBD', length: 50},
      {id: 'KOC662', date: new Date(2016, 4, 22, 16, 30), opponent: 'Final TBD', length: 70},
    ];

    return games;
  };

  window.LineupTracker = LineupTracker;
  console.log('Setup LineupTracker in game.js');
})();
