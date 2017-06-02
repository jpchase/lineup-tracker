import {Rotation} from '../app/scripts/rotation.js';

describe('Rotation', () => {

  let rotation;

  beforeEach(() => {
    rotation = new Rotation();

    jasmine.addMatchers({
      toBeInitialized: function () {
        return {
          compare: function (actual, expected) {
            let rotation = actual;

            return {
              pass: rotation && (!rotation.events || !rotation.events.length)
            };
          }
        };
      },
    });
  });

  describe('uninitialized', () => {

    it('should be empty', () => {
      expect(rotation).toBeInitialized();
    });
  });

});

