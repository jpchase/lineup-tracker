import {Duration} from '../app/scripts/clock.js';

describe('Duration', () => {
   it('should have 0 elapsed for new instance', () => {
       let duration = new Duration();
       let elapsed = duration.getElapsed();
       expect(elapsed).toEqual([0,0]);
   });
});