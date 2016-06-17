var LineupTracker = LineupTracker || {};

(function() {
  'use strict';

  // In-memory storage of games
  var allGames = null;

  /*****************************************************************************
   *
   * Game class
   *
   ****************************************************************************/

  LineupTracker.Game = function(data) {
    this.id = data.id;
    this.date = new Date(data.date);
    this.opponent = data.opponent;
    this.duration = data.duration;
     // Other statuses: LIVE, DONE
    this.status = data.status || 'NEW';
    this.clockRunning = data.clockRunning || false;
    this.startTime = data.startTime || null;
    this.lastClockTime = data.lastClockTime || null;
    this.elapsed = data.elapsed || null;
    this.roster = data.roster || null;
    this.starters = data.starters || [];
  };

  LineupTracker.Game.prototype.toDebugJSON = function() {
    return {
      Name: this.name(),
      status: this.status,
      clockRunning: this.clockRunning,
      startTime: this.startTime,
      lastClockTime: this.lastClockTime,
      elapsed: this.elapsed,
    };
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
      throw new Error('Invalid status to toggle clock');
    }
    var time = performance.now();
    if (this.status === 'NEW') {
      // Starting the clock for the first time
      console.log('Changing to live.');
      this.status = 'LIVE';
      this.startTime = time;
      this.elapsed = 0;
    }

    if (this.clockRunning) {
      console.log('Stop the clock');
      var diff = time - this.lastClockTime;
      this.elapsed += diff;
    } else {
      console.log('Start the clock');
      this.lastClockTime = time;
    }
    this.clockRunning = !this.clockRunning;
    return this.clockRunning;
  };

  LineupTracker.Game.prototype.resetClock = function(options) {
    let force = options && options.force;
    if (this.status === 'DONE') {
        return;
    }
    this.status = 'NEW';
    this.clockRunning = false;
    this.startTime = null;
    this.lastClockTime = null;
    this.elapsed = null;
  };

  LineupTracker.Game.prototype.completeGame = function() {
    if (this.status !== 'LIVE') {
      throw new Error('Invalid status to complete game');
    }
    console.log('Changing to done.');
    this.status = 'DONE';
  };

  LineupTracker.Game.prototype.resetGame = function(passedOptions) {
    let options = passedOptions || {};
    options.status = options.status || 'NEW';

    switch(options.status) {
    case 'NEW':
      this.resetClock();
      this.resetPlayersToOff();
      return;
    }

    console.log('Passed options: ', passedOptions);
    throw new Error('Invalid options to reset game: ' + passedOptions);
  };

  LineupTracker.Game.prototype.addStarter = function(player) {
    if (this.starters.find(id => player === id)) {
      return;
    }
    this.starters.push(player);
  };

  LineupTracker.Game.prototype.removeStarter = function(player) {
    this.starters = this.starters.filter(id => player !== id);
  };

  LineupTracker.Game.prototype.getPlayer = function(id) {
    return this.roster.find(player => player.name === id);
  };

  LineupTracker.Game.prototype.getPlayersByStatus = function(status) {
    return this.roster.filter(player => player.status === status);
  };

  LineupTracker.Game.prototype.resetPlayersToOff = function() {
    this.roster.forEach(player => {
      player.status = 'OFF';
    });
    this.starters = [];
  };

  /*****************************************************************************
   *
   * Formation class
   *
   ****************************************************************************/

  LineupTracker.Formation = function() {
    this.complete = false;
    this.forward = {
      positions: []
    };
    this.mid1 = {
      positions: []
    };
    this.mid2 = {
      positions: []
    };
    this.back = {
      positions: []
    };
    this.gk = {
      positions: []
    };
  };

  LineupTracker.Formation.prototype.uniquePositions = function() {
    return this.forward.positions.concat(
      this.mid1.positions,
      this.mid2.positions,
      this.back.positions,
      this.gk.positions).reduce((prevArray, currentValue) => {
        if (prevArray.indexOf(currentValue) < 0) {
          prevArray.push(currentValue);
        }
        return prevArray;
      }, []);
  };

  LineupTracker.Formation.prototype.getLineForPosition = function(position) {
    var lines = ['forward','mid1','mid2','back','gk'];
    const arrayLength = lines.length;
    for (var i = 0; i < arrayLength; i++) {
      var lineName = lines[i];
      if (this[lineName].positions.includes(position)) {
        return lineName;
      }
    }
    throw new Error('No line found for position: ' + position);
  };

  LineupTracker.Formation.prototype.setDefault = function() {
    this.forward.positions = ['S'];
    this.mid1.positions = ['OM', 'AM', 'AM', 'OM'];
    this.mid2.positions = ['HM'];
    this.back.positions = ['FB', 'CB', 'CB', 'FB'];
    this.gk.positions = ['GK'];
    this.complete = true;
  };

  /*****************************************************************************
   *
   * Data retrieval methods
   *
   ****************************************************************************/
  LineupTracker.retrieveGames = function() {
    if (!allGames) {
      allGames = [];
      var foundData = false;
      var gameData = localStorage.savedGames;
      console.log('Saved games: ', gameData);
      if (gameData) {
        foundData = true;
        gameData = JSON.parse(gameData);
        console.log('Parsed data: ', gameData);
      } else {
        gameData = [
          {id: 'KOC651', date: new Date(2016, 4, 21, 14, 0).toString(), opponent: 'London Youth Whitecaps 03G', duration: 50},
          {id: 'KOC656', date: new Date(2016, 4, 21, 16, 30).toString(), opponent: 'Kitchener Spirit 03G', duration: 50},
          {id: 'KOC657', date: new Date(2016, 4, 22, 11, 30).toString(), opponent: 'Cambridge United 03G', duration: 50},
          {id: 'KOC660', date: new Date(2016, 4, 22, 14, 0).toString(), opponent: 'Semi-Final TBD', duration: 50}
        ];
      }

      gameData.forEach(data => {
        allGames.push(new LineupTracker.Game(data));
      });

      if (!foundData) {
        this.saveGames();
      }
    }

    return allGames;
  };

  LineupTracker.saveGames = function() {
    if (!allGames) {
      return;
    }
    var saved = JSON.stringify(allGames);
    localStorage.savedGames = saved;
  };

  LineupTracker.retrieveGame = function(gameId) {
    var games = this.retrieveGames();

    return games.find(game => game.id === gameId);
  };

  LineupTracker.saveGame = function(modifiedGame) {
    allGames = allGames.filter(game => game.id !== modifiedGame.id);
    allGames.push(modifiedGame);
    this.saveGames();
  };

  LineupTracker.retrieveRoster = function() {
    var roster = [
      {name: 'Abby', positions: ['AM', 'OM', 'S'], status: 'OFF'},
      {name: 'Anne', positions: ['CB', 'FB', 'HM'], status: 'OFF'},
      {name: 'Brianna', positions: ['CB', 'HM'], status: 'OFF'},
      {name: 'Brooke', positions: ['AM', 'OM', 'S'], status: 'OFF'},
      {name: 'Cassidy', positions: ['OM'], status: 'OFF'},
      {name: 'Ella', positions: ['AM', 'HM', 'S'], status: 'OFF'},
      {name: 'Emma', positions: ['FB', 'CB'], status: 'OFF'},
      {name: 'Grace', positions: ['GK'], status: 'OFF'},
      {name: 'Jordan', positions: ['OM', 'S'], status: 'OFF'},
      {name: 'Lauren', positions: ['S'], status: 'OFF'},
      {name: 'Lucy', positions: ['FB'], status: 'OFF'},
      {name: 'Michaela', positions: ['FB'], status: 'OFF'},
      {name: 'Milla', positions: ['AM', 'HM'], status: 'OFF'},
      {name: 'Natasha', positions: ['HM'], status: 'OFF'},
      {name: 'Naomi', positions: ['CB'], status: 'OFF'},
      {name: 'Payton', positions: ['HM', 'AM', 'OM'], status: 'OFF'},
      {name: 'Sisi', positions: ['OM', 'AM'], status: 'OFF'},
      {name: 'Taty', positions: ['AM', 'OM', 'S'], status: 'OFF'}
    ];
    return roster;
  };

  console.log('Setup LineupTracker in game.js');
})();

function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError('Cannot call a class as a function');
  }
}

var Stopwatch = function() {
  function Stopwatch(display, results) {
    _classCallCheck(this, Stopwatch);

    this.running = false;
    this.display = display;
    this.results = results;
    this.laps = [];
    this.reset();
    this.print(this.times);
  }

  Stopwatch.prototype.reset = function reset() {
    this.times = [0, 0, 0];
  };

  Stopwatch.prototype.start = function start() {
    if (!this.time) {
      this.time = performance.now();
    }
    if (!this.running) {
      this.running = true;
      requestAnimationFrame(this.step.bind(this));
    }
  };

  Stopwatch.prototype.lap = function lap() {
    var times = this.times;
    if (this.running) {
      this.reset();
    }
    var li = document.createElement('li');
    li.innerText = this.format(times);
    this.results.appendChild(li);
  };

  Stopwatch.prototype.stop = function stop() {
    this.running = false;
    this.time = null;
  };

  Stopwatch.prototype.restore = function restore(originalTime, elapsed, running) {
    let restoreTime = null;
    if (elapsed && elapsed > 0) {
      restoreTime = performance.now() - elapsed;
      console.log('Restore elapsed to: ', restoreTime);
    } else if (originalTime) {
      restoreTime = originalTime;
      console.log('Restore original to: ', restoreTime);
    }

    if (restoreTime) {
      this.time = restoreTime;
      if (running) {
        console.log('Now start the clock');
        this.running = false;
        this.start();
      }
      return;
    }

    throw new Error('Unable to restore without time data');
  };

  Stopwatch.prototype.pause = function pause() {
    this.running = false;
  };

  Stopwatch.prototype.restart = function restart() {
    if (!this.time) {
      this.time = performance.now();
    }
    if (!this.running) {
      this.running = true;
      requestAnimationFrame(this.step.bind(this));
    }
    this.reset();
  };

  Stopwatch.prototype.clear = function clear() {
    clearChildren(this.results);
  };

  Stopwatch.prototype.step = function step(timestamp) {
    if (!this.running) return;
    this.calculate(timestamp);
    this.time = timestamp;
    this.print();
    requestAnimationFrame(this.step.bind(this));
  };

  Stopwatch.prototype.calculate = function calculate(timestamp) {
    var diff = timestamp - this.time;
    // Hundredths of a second are 100 ms
    this.times[2] += diff / 10;
    // Seconds are 100 hundredths of a second
    if (this.times[2] >= 100) {
      this.times[1] += 1;
      this.times[2] -= 100;
    }
    // Minutes are 60 seconds
    if (this.times[1] >= 60) {
      this.times[0] += 1;
      this.times[1] -= 60;
    }
  };

  Stopwatch.prototype.print = function print() {
    this.display.innerText = this.format(this.times);
  };

  Stopwatch.prototype.format = function format(times) {
    return pad0(times[0], 2) + ':' + pad0(times[1], 2);// + ':' + pad0(Math.floor(times[2]), 2);
  };

  return Stopwatch;
}();

function pad0(value, count) {
  var result = value.toString();
  for (; result.length < count; --count) {
    result = '0' + result;
  }
  return result;
}

function clearChildren(node) {
  while (node.lastChild) {
    node.removeChild(node.lastChild);
  }
}
