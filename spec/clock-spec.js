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
     const time3 = new Date(2016, 0, 1, 14, 1, 55);

     function mockTimeProvider(t0, t1, t2, t3) {
       let provider = new CurrentTimeProvider();
       spyOn(provider, 'getCurrentTime').and.returnValues(t0, t1, t2, t3);
       return provider;
     }

     it('should have 0 elapsed for new instance', () => {
       let timer = new Timer();
       let elapsed = timer.getElapsed();
       expect(elapsed).toEqual([0, 0]);
     });

     it('should have correct elapsed when running', () => {
       const provider = mockTimeProvider(startTime, time1);
       let timer = new Timer(provider);
       timer.start();
       let elapsed = timer.getElapsed();
       expect(elapsed).toEqual([0, 5]);
     });

     it('should have correct elapsed after stopped', () => {
       const provider = mockTimeProvider(startTime, time2);
       let timer = new Timer(provider);
       timer.start();
       timer.stop();
       let elapsed = timer.getElapsed();
       expect(elapsed).toEqual([0, 10]);
     });

     it('should have correct elapsed after restarting', () => {
       const provider = mockTimeProvider(startTime, time1, startTime, time2);
       let timer = new Timer(provider);
       timer.start();
       timer.stop();
       timer.start();
       let elapsed = timer.getElapsed();
       expect(elapsed).toEqual([0, 15]);
     });

     it('should have correct elapsed after restarted and stopped', () => {
       const provider = mockTimeProvider(startTime, time2, startTime, time2);
       let timer = new Timer(provider);
       timer.start();
       timer.stop();
       timer.start();
       timer.stop();
       let elapsed = timer.getElapsed();
       expect(elapsed).toEqual([0, 20]);
     });

     it('should have correct elapsed when added seconds equal exactly 1 minute', () => {
       const provider = mockTimeProvider(startTime, time3, startTime, time1);
       let timer = new Timer(provider);
       timer.start();
       timer.stop();
       timer.start();
       timer.stop();
       let elapsed = timer.getElapsed();
       expect(elapsed).toEqual([2, 0]);
     });

     it('should have correct elapsed when added seconds total more than 1 minute', () => {
       const provider = mockTimeProvider(startTime, time3, startTime, time2);
       let timer = new Timer(provider);
       timer.start();
       timer.stop();
       timer.start();
       timer.stop();
       let elapsed = timer.getElapsed();
       expect(elapsed).toEqual([2, 5]);
     });

   });
});