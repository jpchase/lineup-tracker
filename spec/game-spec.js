describe('Game', () => {
  const playerOnId = 1;
  const playerOffId = 2;
  const playerAltOnId = 3;
  const playerAltOffId = 4;
  const playerOn = {name: playerOnId, status: 'ON', currentPosition: 'CB'};
  const playerOff = {name: playerOffId, status: 'OFF'};
  const playerAltOn = {name: playerAltOnId, status: 'ON'};
  const playerAltOff = {name: playerAltOffId, status: 'OFF'};

  let provider;

  beforeEach(() => {
    //provider = new CurrentTimeProvider();
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
        expect(offPlayer.status).toBe('NEXT');
        expect(offPlayer.replaces).toBe(playerOn.name);
        expect(offPlayer.currentPosition).toBeTruthy();
        expect(offPlayer.currentPosition).toBe(playerOn.currentPosition);
      });

    }); // prepare player changes

    describe('cancel', () => {

      it('should fail if no player provided', () => {
        // No players provided
        expect(game.cancelPlayerChange()).toBe(false);
        expect(game.cancelPlayerChange(null)).toBe(false);
        expect(game.cancelPlayerChange(undefined)).toBe(false);
      });

      it('should fail if player is not next sub', () => {
        expect(game.cancelPlayerChange(playerOn)).toBe(false);
        // Check that player values are unchanged
        expect(playerOn.status).toBe('ON');
        expect(playerOn.currentPosition).toBeTruthy();

        expect(game.cancelPlayerChange(playerOff)).toBe(false);
        const outPlayer = {name: playerAltOnId, status: 'OUT'};
        expect(game.cancelPlayerChange(outPlayer)).toBe(false);
      });

      it('should reset next sub to off', () => {
        const nextPlayer = {
          name: playerAltOffId,
          status: 'NEXT',
          replaces: playerOnId,
          currentPosition: playerOn.currentPosition
        };

        expect(game.cancelPlayerChange(nextPlayer)).toBe(true);
        expect(nextPlayer.status).toBe('OFF');
        expect(nextPlayer.replaces).toBe(undefined);
        expect(nextPlayer.currentPosition).toBe(undefined);
      });

    }); // cancel player changes
  }); // Player Changes

});
