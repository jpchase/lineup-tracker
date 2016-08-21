import {CurrentTimeProvider,Timer} from '../app/scripts/clock.js';

describe('CurrentTimeProvider', () => {
   it('should return the current time', () => {
       let provider = new CurrentTimeProvider();
       const expectedTime = Date.now();
       const actualTime = provider.getCurrentTime();
       expect(actualTime).toEqual(expectedTime);
   });
});

describe('Timer', () => {

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

   describe('Elapsed time', () => {
     it('should have 0 elapsed for new instance', () => {
         let timer = new Timer();
         let elapsed = timer.getElapsed();
         expect(elapsed).toEqual([0,0]);
     });

     it('should have correct elapsed when running', () => {
         let timer = new Timer();
         timer.start();
         let elapsed = timer.getElapsed();
         expect(elapsed).toEqual([0,1]);
     });

     it('should have correct elapsed after stopped', () => {
         let timer = new Timer();
         timer.start();
         timer.stop();
         let elapsed = timer.getElapsed();
         expect(elapsed).toEqual([0,5]);
     });

   });
});