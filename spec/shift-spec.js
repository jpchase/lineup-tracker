import {PlayerTimeTrackerMap} from '../app/scripts/shift.js';

describe('PlayerTimeTrackerMap', () => {

   it('should be empty for new instance', () => {
     let map = new PlayerTimeTrackerMap();
     expect(map.trackers).toEqual({});
   });

   it('should have shift timers running after start', () => {
     let players = [
       {name: 1, status: 'ON'},
       {name: 2, status: 'OFF'}
     ];

     let map = new PlayerTimeTrackerMap();
     map.startShiftTimers(players);

     let onTracker = map.trackers[players[0].name];
     let offTracker = map.trackers[players[1].name];

     expect(onTracker).not.toBe(null);
     expect(onTracker.playerId).toBe(players[0].name);
     expect(onTracker.onTimer).not.toBe(null);
     expect(onTracker.onTimer.isRunning).toBe(true);
     expect(onTracker.offTimer).toBe(null);

     expect(offTracker).not.toBe(null);
     expect(offTracker.playerId).toBe(players[1].name);
     expect(offTracker.onTimer).toBe(null);
     expect(offTracker.offTimer).not.toBe(null);
     expect(offTracker.offTimer.isRunning).toBe(true);
   });

   it('should have shift timers stopped after stop', () => {
     let players = [
       {name: 1, status: 'ON'},
       {name: 2, status: 'OFF'}
     ];

     let map = new PlayerTimeTrackerMap();
     map.startShiftTimers(players);
     map.stopShiftTimers(players);

     let onTracker = map.trackers[players[0].name];
     let offTracker = map.trackers[players[1].name];

     expect(onTracker).not.toBe(null);
     expect(onTracker.playerId).toBe(players[0].name);
     expect(onTracker.onTimer).not.toBe(null);
     expect(onTracker.onTimer.isRunning).toBe(false);
     expect(onTracker.offTimer).toBe(null);

     expect(offTracker).not.toBe(null);
     expect(offTracker.playerId).toBe(players[1].name);
     expect(offTracker.onTimer).toBe(null);
     expect(offTracker.offTimer).not.toBe(null);
     expect(offTracker.offTimer.isRunning).toBe(false);
   });

 });
 