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
     const startTime = new Date(2016, 0, 1, 14, 0, 0);
     const time1 = new Date(2016, 0, 1, 14, 0, 5);
     const time2 = new Date(2016, 0, 1, 14, 0, 10);

     function mockTimeProvider(t0, t1, t2, t3) {
       let provider = new CurrentTimeProvider();
       spyOn(provider, 'getCurrentTime').and.returnValues(t0, t1, t2, t3);
       return provider;
     }

     it('should have 0 elapsed for new instance', () => {
         let timer = new Timer();
         let elapsed = timer.getElapsed();
         expect(elapsed).toEqual([0,0]);
     });

     it('should have correct elapsed when running', () => {
       const provider = mockTimeProvider(startTime, time1);
       let timer = new Timer(provider);
       timer.start();
       let elapsed = timer.getElapsed();
       expect(elapsed).toEqual([0,5]);
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