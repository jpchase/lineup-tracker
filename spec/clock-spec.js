import {Timer} from '../app/scripts/clock.js';

describe('Timer', () => {
   it('should have 0 elapsed for new instance', () => {
       let timer = new Timer();
       let elapsed = timer.getElapsed();
       expect(elapsed).toEqual([0,0]);
   });

   it('should not be running for new instance', () => {
       let timer = new Timer();
       expect(timer.isRunning).toBe(false);
   });

   it('should be running after start', () => {
       let timer = new Timer();
       timer.start();
       expect(timer.isRunning).toBe(true);
   });

   it('should not be running after stop', () => {
       let timer = new Timer();
       timer.start();
       timer.stop();
       expect(timer.isRunning).toBe(false);
   });

});