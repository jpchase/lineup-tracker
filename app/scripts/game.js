import {CurrentTimeProvider, Duration, Timer} from './clock.js';
import {PlayerTimeTrackerMap} from './shift.js';

/* eslint-disable */
var theGlobal;
if (typeof window !== 'undefined') {
  // Running in browser
  theGlobal = window;
} else if (typeof global !== 'undefined') {
  // Running in node
  theGlobal = global;
} else {
  theGlobal = {};
}
if (!theGlobal.LineupTracker) {
  theGlobal.LineupTracker = {};
}
var LineupTracker = theGlobal.LineupTracker;
/* eslint-enable */

(function() {
  'use strict';

  const TEAM_U16A = 'U16A';
  const TEAM_NMSC2003 = 'NMSC2003';
  const DEFAULT_TEAM_ID = TEAM_U16A;
  let currentTeamId = null;

  // In-memory storage of games
  var allGames = null;

  LineupTracker.Duration = Duration;
  /*****************************************************************************
   *
   * Game class
   *
   ****************************************************************************/

  LineupTracker.Game = function(data) {
    this.id = data.id;
    this.teamId = data.teamId;
    this.date = new Date(data.date);
    this.opponent = data.opponent;
    this.duration = data.duration;
     // Other statuses: START, LIVE, BREAK, DONE
    this.status = data.status || 'NEW';
    this.period = data.period || 0;
    this.timeProvider = new CurrentTimeProvider();
    this.timer = new Timer(data.timer, this.timeProvider);
    this.periodTimer = new Timer(data.periodTimer, this.timeProvider);
    this.timeTracker = new PlayerTimeTrackerMap(data.timeTracker,
                                                this.timeProvider);
    this.roster = data.roster || null;
    this.captains = data.captains || [];
    this.starters = data.starters || [];
    this.events = data.events || [];
  };

  LineupTracker.Game.prototype.toDebugJSON = function() {
    return {
      Name: this.name(),
      status: this.status,
      timer: this.timer,
      periodTimer: this.periodTimer,
    };
  };

  LineupTracker.Game.prototype.name = function() {
    var monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug',
      'Sep', 'Oct', 'Nov', 'Dec'
    ];
    return this.opponent + ' ' + monthNames[this.date.getMonth()] + ' ' +
           this.date.getDate();
  };

  // Time tracking functions
  LineupTracker.Game.prototype.getCurrentTime = function() {
    return this.timeProvider.getCurrentTime();
  };

  LineupTracker.Game.prototype.isClockRunning = function() {
    return this.timer && this.timer.isRunning;
  };

  LineupTracker.Game.prototype.toggleClock = function() {
    if (this.status === 'DONE' ||
        this.status === 'NEW') {
      throw new Error('Invalid status to toggle clock: ' + this.status);
    }
    if (this.status !== 'LIVE') {
      // Starting the clock for the first time
      this.startLivePeriod();
    }

    if (this.timer.isRunning) {
      console.log('Stopping the timer');
      this.timer.stop();
      this.periodTimer.stop();
      this.timeTracker.stopShiftTimers();
    } else {
      console.log('Starting the timer');
      this.timer.start();
      this.periodTimer.start();
      this.timeTracker.startShiftTimers();
    }

    return this.isClockRunning();
  };

  LineupTracker.Game.prototype.resetClock = function(options) {
    // let force = options && options.force;
    if (this.status === 'DONE') {
      return;
    }
    this.status = 'NEW';
    this.timer.reset();
    this.periodTimer.reset();
  };

  LineupTracker.Game.prototype.updateShiftTimes = function() {
    this.timeProvider.freeze();
    try {
      this.roster.forEach(player => {
        let formattedShiftTime = '';
        let tracker = this.timeTracker && this.timeTracker.get(player.name);
        if (tracker) {
          let elapsed = tracker.getShiftTime();
          formattedShiftTime = Duration.format(elapsed);
          player.shiftCount = tracker.shiftCount;
          let totalTime = tracker.getTotalTime();
          player.formattedTotalTime = Duration.format(totalTime);
        }
        player.formattedShiftTime = formattedShiftTime;
      });
    } finally {
      this.timeProvider.unfreeze();
    }
  };

  LineupTracker.Game.prototype.startGame = function() {
    if (this.status !== 'NEW') {
      throw new Error('Invalid status to start game: ' + this.status);
    }
    if (this.getPlayersByStatus('ON').length !== 11) {
      console.log('Not enough starters');
      return false;
    }
    console.log('Starting game.');
    this.status = 'START';
    this.period = 1;
    this.timeTracker.initialize(this.roster);
    this.addEvent({
      type: 'START',
      details: {
        captains: this.captains.slice(0),
        starters: this.starters.slice(0)
      }
    });
    return true;
  };

  LineupTracker.Game.prototype.nextPeriod = function() {
    this.endLivePeriod('BREAK', 'NEXTPERIOD');
    this.period += 1;
    this.periodTimer.reset();
  };

  LineupTracker.Game.prototype.completeGame = function() {
    this.endLivePeriod('DONE', 'COMPLETE');
    this.timeTracker.totalShiftTimers();
  };

  LineupTracker.Game.prototype.startLivePeriod = function() {
    if (this.status !== 'START' &&
        this.status !== 'BREAK') {
      throw new Error('Invalid status to start live period: ' + this.status);
    }
    console.log('Changing to live.');
    this.status = 'LIVE';

    let starters = [];
    this.roster.forEach(player => {
      if (player.status === 'ON') {
        starters.push(player.name);
      }
    });

    this.addEvent({
      type: 'LIVE',
      details: {
        period: this.period,
        players: starters,
      }
    });
  };

  LineupTracker.Game.prototype.endLivePeriod = function(newStatus, eventType) {
    if (this.status !== 'LIVE') {
      throw new Error('Invalid status to end live period: ' + this.status);
    }
    if (this.isClockRunning()) {
      this.toggleClock();
    }
    console.log('Changing status to:', newStatus);
    this.status = newStatus;
    this.addEvent({
      type: eventType,
      details: {
        period: this.period,
        players: this.getPlayersByStatus('ON').map(player => {
          return player.name;
        })
      }
    });
  };

  LineupTracker.Game.prototype.resetGame = function(passedOptions) {
    let options = passedOptions || {};
    options.status = options.status || 'NEW';

    switch (options.status) {
      case 'NEW':
        this.period = 0;
        this.resetClock();
        this.resetPlayersToOff();
        return;
      default:
    }

    console.log('Passed options: ', passedOptions);
    throw new Error('Invalid options to reset game: ' + passedOptions);
  };

  LineupTracker.Game.prototype.preparePlayerChange = function(players) {
    if (!players || players.length !== 2) {
      console.log('Invalid players to prepare change', players);
      return false;
    }

    let onPlayer, otherPlayer;
    players.forEach(player => {
      if (!player) {
        return;
      }
      switch (player.status) {
        case 'ON':
          if (onPlayer) {
            console.log('Can only make a change with one ON player');
            return;
          }
          onPlayer = player;
          break;

        case 'OFF':
          if (otherPlayer) {
            console.log('Can only make a change with one OFF player');
            return;
          }
          otherPlayer = player;
          break;

        default:
          console.log('Unsupported status', player);
          return;
      }
    });

    if (!(onPlayer && otherPlayer)) {
      return false;
    }

    // Prepare a sub
    otherPlayer.status = 'NEXT';
    otherPlayer.currentPosition = onPlayer.currentPosition;
    otherPlayer.replaces = onPlayer.name;

    return true;
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

  LineupTracker.Game.prototype.substitutePlayer = function(playerIn,
    playerOut) {
    if (this.status !== 'LIVE' && this.status !== 'BREAK') {
      throw new Error('Invalid status to substitute: ' + this.status);
    }

    let time = this.getCurrentTime();

    playerIn.replaces = null;
    playerIn.status = 'ON';
    playerOut.status = 'OFF';

    this.timeTracker.substitutePlayer(playerIn.name, playerOut.name);

    this.addEvent({
      type: 'SUBIN',
      date: time,
      player: playerIn.name,
      details: {
        replaced: playerOut.name
      }
    });
    this.addEvent({
      type: 'SUBOUT',
      date: time,
      player: playerOut.name,
    });
  };

  LineupTracker.Game.prototype.swapPosition = function(player) {
    if (this.status !== 'LIVE' && this.status !== 'BREAK') {
      throw new Error('Invalid status to swap position: ' + this.status);
    }

    let oldPosition = player.currentPosition;
    player.currentPosition = player.nextPosition;
    player.nextPosition = null;

    let time = this.getCurrentTime();
    this.addEvent({
      type: 'SWAPPOSITION',
      date: time,
      player: player.name,
      details: {
        position: player.currentPosition,
        oldPosition: oldPosition
      }
    });
  };

  LineupTracker.Game.prototype.updateCaptains = function(newCaptains) {
    if (!newCaptains || newCaptains.length !== 2) {
      throw new Error('Invalid input to update captains: ' + newCaptains);
    }
    if (this.status !== 'NEW') {
      throw new Error('Invalid status to update captains: ' + this.status);
    }

    var replacedCaptains = [];
    this.captains.forEach(captain => {
      if (newCaptains[0] !== captain && newCaptains[1] !== captain) {
        replacedCaptains.push(captain);
      }
    });

    this.captains = newCaptains.slice(0);

    return replacedCaptains;
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
      player.formattedShiftTime = '';
    });
    this.timer.reset();
    this.periodTimer.reset();
    this.timeTracker.reset();
    this.starters = [];
  };

  LineupTracker.Game.prototype.addEvent = function(eventData) {
    if (!eventData.date) {
      eventData.date = this.timeProvider.getCurrentTime();
    }
    let added = new LineupTracker.GameEvent(eventData);
    this.events.push(added);
    console.log('New event', added);
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
    var lines = ['forward', 'mid1', 'mid2', 'back', 'gk'];
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
   * Event class
   *
   ****************************************************************************/

  LineupTracker.GameEvent = function(passedData) {
    let data = passedData || {};

    this.id = data.id || newId();
    this.date = new Date(data.date ||
                         new CurrentTimeProvider().getCurrentTime());
    this.type = data.type || null;
    this.player = data.player || null;
    this.details = data.details || null;
  };

  /*****************************************************************************
   *
   * Data retrieval methods
   *
   ****************************************************************************/

  LineupTracker.getCurrentTeamId = function() {
    if (!currentTeamId) {
      currentTeamId = localStorage.currentTeamId || DEFAULT_TEAM_ID;
    }
    return currentTeamId;
  };

  LineupTracker.saveCurrentTeamId = function(teamId) {
    if (teamId !== TEAM_U16A && teamId !== TEAM_NMSC2003) {
      throw new Error('Invalid teamId: ' + teamId);
    }
    if (currentTeamId === teamId) {
      console.log('Not saving team id, same as current:', teamId);
      return false;
    }
    console.log('Saving team id:', teamId);
    localStorage.currentTeamId = currentTeamId = teamId;
    return true;
  };

  LineupTracker.retrieveAllGames = function() {
    if (!allGames) {
      allGames = [];
      var foundData = false;
      var gameData = localStorage.savedGames;
      // console.log('Saved games: ', gameData);
      if (gameData) {
        foundData = true;
        gameData = JSON.parse(gameData);
        console.log('Parsed data: ', gameData);
      } else {
        gameData = [
          {id: 'KOC651', date: new Date(2016, 4, 21, 14, 0).toString(),
           opponent: 'London Youth Whitecaps 03G', duration: 50},
          {id: 'KOC656', date: new Date(2016, 4, 21, 16, 30).toString(),
           opponent: 'Kitchener Spirit 03G', duration: 50},
          {id: 'KOC657', date: new Date(2016, 4, 22, 11, 30).toString(),
           opponent: 'Cambridge United 03G', duration: 50},
          {id: 'KOC660', date: new Date(2016, 4, 22, 14, 0).toString(),
           opponent: 'Semi-Final TBD', duration: 50},
          {id: '129', date: new Date(2016, 6, 26, 13, 0).toString(),
           opponent: 'Eastside Kickers 03G', duration: 80}
        ];
      }

      gameData.forEach(data => {
        if (!data.teamId) {
          data.teamId = DEFAULT_TEAM_ID;
        }
        allGames.push(new LineupTracker.Game(data));
      });

      if (!foundData) {
        this.saveGames();
      }
    }

    return allGames;
  };

  LineupTracker.retrieveGames = function() {
    let games = this.retrieveAllGames();
    const teamId = this.getCurrentTeamId();

    return games.filter(game => game.teamId === teamId);
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
    /*
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
    */
    const teamId = this.getCurrentTeamId();
    let roster;
    if (teamId === TEAM_NMSC2003) {
      roster = [
        {name: 'Ashley', uniformNumber: 19, positions: ['FB'],
         status: 'OFF'},
        {name: 'Brianna', uniformNumber: 36, positions: ['AM', 'HM'],
         status: 'OFF'},
        {name: 'Camila', uniformNumber: 8, positions: ['FB', 'HM'],
         status: 'OFF'},
        {name: 'Darci', uniformNumber: 20, positions: ['AM', 'HM'],
         status: 'OFF'},
        {name: 'Ella', uniformNumber: 16, positions: ['OM', 'S', 'W'],
         status: 'OFF'},
        {name: 'Emma', uniformNumber: 7, positions: ['CB', 'FB'],
         status: 'OFF'},
        {name: 'Bella', uniformNumber: 4, positions: ['W', 'OM'],
         status: 'OFF'},
        {name: 'Iyana', uniformNumber: 13, positions: ['FB', 'CB'],
         status: 'OFF'},
        {name: 'Jada', uniformNumber: 0, positions: ['GK'],
         status: 'OFF'},
        {name: 'Jasmine', uniformNumber: 9, positions: ['S', 'AM'],
         status: 'OFF'},
        {name: 'Jeneefa', uniformNumber: 2, positions: ['FB', 'CB'],
         status: 'OFF'},
        {name: 'Leah', uniformNumber: 33, positions: ['S', 'AM'],
         status: 'OFF'},
        {name: 'Mary', uniformNumber: 12, positions: ['CB', 'FB'],
         status: 'OFF'},
        {name: 'Navleen', uniformNumber: 5, positions: ['FB', 'CB'],
         status: 'OFF'},
        {name: 'Nia', uniformNumber: 6, positions: ['W', 'AM'],
         status: 'OFF'},
        {name: 'Nicole', uniformNumber: 10, positions: ['HM', 'FB'],
         status: 'OFF'},
        {name: 'Sarah', uniformNumber: 1, positions: ['GK'],
         status: 'OFF'},
      ];
    } else if (!teamId || teamId === TEAM_U16A) { // U16A, by default
      roster = [
        {name: 'Allie', uniformNumber: 16, positions: ['CB'],
         status: 'OFF'},
        {name: 'Amanda', uniformNumber: 2, positions: ['CB', 'FB', 'HM'],
         status: 'OFF'},
        {name: 'Emma F', uniformNumber: 42, positions: ['AM', 'HM', 'OM'],
         status: 'OFF'},
        {name: 'Emma H', uniformNumber: 4, positions: ['AM', 'HM'],
         status: 'OFF'},
        {name: 'Emmalene', uniformNumber: 22, positions: ['FB', 'OM'],
         status: 'OFF'},
        {name: 'Jill', uniformNumber: 28, positions: ['AM', 'OM', 'S'],
         status: 'OFF'},
        {name: 'Kiana', uniformNumber: 13, positions: ['S', 'OM'],
         status: 'OFF'},
        {name: 'Lauren', uniformNumber: 8, positions: ['AM', 'OM', 'S'],
         status: 'OFF'},
        {name: 'Leah', uniformNumber: 44, positions: ['OM', 'S'],
         status: 'OFF'},
        {name: 'Ryley', uniformNumber: 19, positions: ['GK'],
         status: 'OFF'},
        {name: 'Sophia', uniformNumber: 18, positions: ['FB', 'CB'],
         status: 'OFF'},
        {name: 'Syd', uniformNumber: 5, positions: ['HM', 'AM'],
         status: 'OFF'},
        {name: 'Val', uniformNumber: 27, positions: ['CB', 'HM'],
         status: 'OFF'},
        {name: 'Thalia', uniformNumber: 9, positions: ['FB', 'OM'],
         status: 'OFF'},
        {name: 'Teanna', uniformNumber: 77, positions: ['OM', 'FB'],
         status: 'OFF'},
      ];
    }
    return roster;
  };

  console.log('Setup LineupTracker in game.js');
})();

function newId(
  a                  // placeholder
) {
/* eslint-disable */
  return a           // if the placeholder was passed, return
    ? (              // a random number from 0 to 15
      a ^            // unless b is 8,
      crypto.getRandomValues(new Uint8Array(1))[0]  // in which case
      % 16           // a random number from
      >> a/4         // 8 to 11
      ).toString(16) // in hexadecimal
    : (              // or otherwise a concatenated string:
      [1e7] +        // 10000000 +
      -1e3 +         // -1000 +
      -4e3 +         // -4000 +
      -8e3 +         // -80000000 +
      -1e11          // -100000000000,
      ).replace(     // replacing
        /[018]/g,    // zeroes, ones, and eights with
        newId        // random hex digits
      );
/* eslint-enable */
}
