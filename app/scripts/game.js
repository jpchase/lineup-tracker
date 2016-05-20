
(function() {
  'use strict';

  var LineupTracker = LineupTracker || {};

  LineupTracker.retrieveGames = function() {
    var games = [
      {id: 'KOC651', date: new Date(2016, 4, 21, 14, 0), opponent: 'London Youth Whitecaps 03G', length: 50},
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
