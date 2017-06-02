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

    it('should throw when no roster to initialize', () => {
      expect(() => {
        rotation.initialize();
      }).toThrowError('Players must be provided to initialize');
      expect(() => {
        rotation.initialize([]);
      }).toThrowError('Players must be provided to initialize');
    });

    it('should throw for operations', () => {
    });

  });

});

