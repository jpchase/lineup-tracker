describe('Game', () => {
  const playerOnId = 1;
  const playerOffId = 2;
  const playerAltOnId = 3;
  const playerAltOffId = 4;
  let playerOn;
  let playerOff;
  let playerAltOn;
  let playerAltOff;

  let provider;

  beforeEach(() => {

    playerOn = {name: playerOnId, status: 'ON', currentPosition: 'CB'};
    playerOff = {name: playerOffId, status: 'OFF'};
    playerAltOn = {name: playerAltOnId, status: 'ON'};
    playerAltOff = {name: playerAltOffId, status: 'OFF'};

    jasmine.addMatchers({
      toBeOff: function () {
        return {
          compare: function (actual, expected) {
            let player = actual;

            return {
              pass: player && player.status === 'OFF' && !player.replaces &&
                    !player.currentPosition
            };
          }
        };
      },
      toBeOn: function () {
        return {
          compare: function (actual, expected) {
            let player = actual;
            let position = expected;

            return {
              pass: player && player.status === 'ON' &&
                    (!position || player.currentPosition === position)
            };
          }
        };
      },
      toBeOut: function () {
        return {
          compare: function (actual, expected) {
            let player = actual;

            return {
              pass: player && player.status === 'OUT' && !player.replaces &&
                    !player.currentPosition
            };
          }
        };
      },
      toBeNext: function () {
        return {
          compare: function (actual, expected) {
            let player = actual;
            let replacedPlayer = expected;

            return {
              pass: player && player.status === 'NEXT' &&
                    player.replaces === replacedPlayer.name &&
                    player.currentPosition &&
                    player.currentPosition === replacedPlayer.currentPosition
            };
          }
        };
      },
    });

  });

  it('should be empty for new instance', () => {
    let game = new LineupTracker.Game({});
    expect(game).not.toBe(null);
    expect(game.id).toBe(undefined);
  });

  describe('Player Changes', () => {
    let game;

    beforeEach(() => {
      game = new LineupTracker.Game({});
    });

    describe('prepare', () => {
      it('should fail if not exactly two players', () => {
        // No players provided
        expect(game.preparePlayerChange()).toBe(false);
        expect(game.preparePlayerChange(null)).toBe(false);
        expect(game.preparePlayerChange([])).toBe(false);

        // One player provided
        expect(game.preparePlayerChange([playerOn])).toBe(false);

        // Three players provided
        expect(game.preparePlayerChange([playerOn, playerOff, playerAltOn])).toBe(false);
      });

      it('should fail if both players are on', () => {
        expect(game.preparePlayerChange([playerOn, playerAltOn])).toBe(false);
        expect(game.preparePlayerChange([playerAltOn, playerOn])).toBe(false);
        expect(game.preparePlayerChange([playerOn, playerOn])).toBe(false);
      });

      it('should fail if both players are off', () => {
        expect(game.preparePlayerChange([playerOff, playerAltOff])).toBe(false);
        expect(game.preparePlayerChange([playerAltOff, playerOff])).toBe(false);
        expect(game.preparePlayerChange([playerOff, playerOff])).toBe(false);
      });

      it('should fail without 1 on and 1 off player', () => {
        const outPlayer = {name: playerAltOnId, status: 'OUT'};
        const nextPlayer = {name: playerAltOffId, status: 'NEXT'};
        [outPlayer, nextPlayer].forEach(player => {
          expect(game.preparePlayerChange([playerOn, player])).toBe(false);
          expect(game.preparePlayerChange([player, playerOn])).toBe(false);
          expect(game.preparePlayerChange([playerOff, player])).toBe(false);
          expect(game.preparePlayerChange([player, playerOff])).toBe(false);
        });
      });

      it('should set the off player to next sub', () => {
        const offPlayer = {name: playerOffId, status: 'OFF'};

        expect(game.preparePlayerChange([playerOn, offPlayer])).toBe(true);
        expect(offPlayer).toBeNext(playerOn);
      });

    }); // prepare player changes

    describe('apply', () => {

      beforeEach(() => {
        game.status = 'LIVE';
        game.roster = [playerOn, playerOff, playerAltOn, playerAltOff];
        game.timeTracker.initialize(game.roster);

      });

      it('should fail if no pending changes', () => {
        expect(game.applyPlayerChanges()).toBe(false);
      });

      it('should fail if on player subbed more than once', () => {
        const onPosition = playerOn.currentPosition;
        const firstSub = playerOff;
        firstSub.status = 'NEXT';
        firstSub.replaces = playerOnId;
        firstSub.currentPosition = onPosition;

        const secondSub = playerAltOff;
        secondSub.status = 'NEXT';
        secondSub.replaces = playerOnId;
        secondSub.currentPosition = onPosition;

        expect(game.applyPlayerChanges()).toBe(false);
      });

      it('should fail if off player replaces more than one', () => {
        const onPosition = playerOn.currentPosition;
        const firstSub = playerOff;
        firstSub.status = 'NEXT';
        firstSub.replaces = playerOnId;
        firstSub.currentPosition = onPosition;

        const secondSub = playerAltOff;
        secondSub.status = 'NEXT';
        secondSub.replaces = playerOnId;
        secondSub.currentPosition = onPosition;

        expect(game.applyPlayerChanges()).toBe(false);
      });

      it('should sub the next player for the on player', () => {
        const onPosition = playerOn.currentPosition;
        const nextPlayer = playerAltOff;
        nextPlayer.status = 'NEXT';
        nextPlayer.replaces = playerOnId;
        nextPlayer.currentPosition = onPosition;

        expect(game.applyPlayerChanges()).toBe(true);
        expect(playerOn).toBeOff();
        expect(nextPlayer).toBeOn(onPosition);
      });

    }); // apply player changes

    describe('cancel', () => {

      it('should fail if no player provided', () => {
        // No players provided
        expect(game.cancelPlayerChange()).toBe(false);
        expect(game.cancelPlayerChange(null)).toBe(false);
        expect(game.cancelPlayerChange(undefined)).toBe(false);
      });

      it('should fail if player is not next sub', () => {
        const onPosition = playerOn.currentPosition;
        expect(game.cancelPlayerChange(playerOn)).toBe(false);
        expect(playerOn).toBeOn(onPosition);

        expect(game.cancelPlayerChange(playerOff)).toBe(false);
        expect(playerOff).toBeOff();

        const outPlayer = {name: playerAltOnId, status: 'OUT'};
        expect(game.cancelPlayerChange(outPlayer)).toBe(false);
        expect(outPlayer).toBeOut();
      });

      it('should reset next sub to off', () => {
        const nextPlayer = {
          name: playerAltOffId,
          status: 'NEXT',
          replaces: playerOnId,
          currentPosition: playerOn.currentPosition
        };

        expect(game.cancelPlayerChange(nextPlayer)).toBe(true);

        expect(nextPlayer).toBeOff();
      });

    }); // cancel player changes
  }); // Player Changes

});
