import { FormationType, Position } from '@app/models/formation';
import {
  Game, GameDetail, GameStatus,
  LivePlayer,
  SetupStatus, SetupSteps, SetupTask
} from '@app/models/game';
import { Player, PlayerStatus, Roster } from '@app/models/player';
import {
  APPLY_STARTER,
  CANCEL_STARTER,
  GET_GAME_REQUEST,
  GET_GAME_SUCCESS,
  GET_GAME_FAIL,
  CAPTAINS_DONE,
  ADD_PLAYER,
  ROSTER_DONE,
  STARTERS_DONE,
  START_GAME,
  SET_FORMATION,
  SELECT_PLAYER,
  SELECT_POSITION
} from '@app/actions/game';
import game from '@app/reducers/game';
import { GameState } from '@app/reducers/game';
import { getFakeAction, buildRoster, getNewPlayer, getStoredPlayer, getStoredPlayerData } from '../helpers/test_data';

const GAME_INITIAL_STATE: GameState = {
  gameId: '',
  game: undefined,
  players: undefined,
  selectedPlayer: undefined,
  selectedPosition: undefined,
  proposedStarter: undefined,
  detailLoading: false,
  detailFailure: false,
  error: ''
};

function buildNewGame(): Game {
  return {
    id: 'NG',
    status: GameStatus.New,
    name: 'New Game',
    teamId: 'T1',
    date: new Date(2016, 1, 10),
    opponent: 'Opponent for new'
  };
}

function buildNewGameDetail(roster?: Roster): GameDetail {
  return {
    ...buildNewGame(),
    hasDetail: true,
    roster: roster || {}
  };

}

function buildNewGameDetailAndRoster(): GameDetail {
  return buildNewGameDetail(buildRoster([getStoredPlayer()]));
}

function buildSetupTasks(): SetupTask[] {
  return [
    {
      step: SetupSteps.Formation,
      status: SetupStatus.Active
    },
    {
      step: SetupSteps.Roster,
      status: SetupStatus.Pending
    },
    {
      step: SetupSteps.Captains,
      status: SetupStatus.Pending
    },
    {
      step: SetupSteps.Starters,
      status: SetupStatus.Pending
    }
  ]
}

describe('Games reducer', () => {
  const existingGame: Game = {
    id: 'EX', status: GameStatus.Start, name: 'Existing Game', teamId: 'T1', date: new Date(2016, 1, 10), opponent: 'Existing opponent'
  };
  const newGame = buildNewGame();

  it('should return the initial state', () => {
    expect(
      game(GAME_INITIAL_STATE, getFakeAction())
      ).toEqual(GAME_INITIAL_STATE);
  });

  it('should handle GET_GAME_REQUEST', () => {
    const newState = game(GAME_INITIAL_STATE, {
      type: GET_GAME_REQUEST,
      gameId: newGame.id
    });

    expect(newState).toEqual(expect.objectContaining({
      gameId: newGame.id,
      detailLoading: true,
      detailFailure: false
    }));

    expect(newState).not.toBe(GAME_INITIAL_STATE);
    expect(newState.gameId).not.toBe(GAME_INITIAL_STATE.gameId);
  });

  it('should handle GET_GAME_SUCCESS', () => {
    const inputGame: GameDetail = {
      ...existingGame,
      roster: buildRoster([getStoredPlayer()])
    };
    const newState = game(GAME_INITIAL_STATE, {
      type: GET_GAME_SUCCESS,
      game: inputGame
    });

    const gameDetail: GameDetail = {
      ...existingGame,
      hasDetail: true,
      roster: buildRoster([getStoredPlayer()])
    };

    expect(newState).toEqual(expect.objectContaining({
      game: gameDetail,
      // TODO: Ensure games state has latest game detail
      // games: buildGames([gameDetail]),
      detailLoading: false,
      detailFailure: false
    }));

    expect(newState).not.toBe(GAME_INITIAL_STATE);
    expect(newState.game).not.toBe(GAME_INITIAL_STATE.game);
  });

  it('should handle GET_GAME_SUCCESS ignore team roster when already set', () => {
    const gamePlayer: Player = {
      ...getStoredPlayerData(),
      id: 'gp1'
    };
    const inputGame: GameDetail = {
      ...existingGame,
      roster: buildRoster([gamePlayer])
    };

    const newState = game(GAME_INITIAL_STATE, {
      type: GET_GAME_SUCCESS,
      game: inputGame,
      teamRoster: buildRoster([getStoredPlayer()])
    });

    const gameDetail: GameDetail = {
      ...existingGame,
      hasDetail: true,
      roster: buildRoster([gamePlayer])
    };

    expect(newState).toEqual(expect.objectContaining({
      game: gameDetail,
      // TODO: Ensure games state has latest game detail
      // games: buildGames([gameDetail]),
      detailLoading: false,
      detailFailure: false,
    }));

    expect(newState).not.toBe(GAME_INITIAL_STATE);
    expect(newState.game).not.toBe(GAME_INITIAL_STATE.game);
  });

  it('should handle GET_GAME_SUCCESS and copy team roster', () => {
    const inputGame: GameDetail = {
      ...newGame,
      roster: {}
    };
    const newState = game(GAME_INITIAL_STATE, {
      type: GET_GAME_SUCCESS,
      game: inputGame,
      teamRoster: buildRoster([getStoredPlayer()])
    });

    const gameDetail: GameDetail = {
      ...newGame,
      hasDetail: true,
      roster: buildRoster([getStoredPlayer()]),
      setupTasks: buildSetupTasks()
    };

    expect(newState).toEqual(expect.objectContaining({
      game: gameDetail,
      // TODO: Ensure games state has latest game detail
      // games: buildGames([gameDetail]),
      detailLoading: false,
      detailFailure: false
    }));

    expect(newState).not.toBe(GAME_INITIAL_STATE);
    expect(newState.game).not.toBe(GAME_INITIAL_STATE.game);
  });

  it('should handle GET_GAME_FAIL', () => {
    const newState = game(GAME_INITIAL_STATE, {
      type: GET_GAME_FAIL,
      error: 'What a game failure!'
    });

    expect(newState).toEqual(expect.objectContaining({
      error: 'What a game failure!',
      detailLoading: false,
      detailFailure: true
    }));

    expect(newState).not.toBe(GAME_INITIAL_STATE);
    expect(newState.error).not.toBe(GAME_INITIAL_STATE.error);
  });

  it('should handle SET_FORMATION', () => {
    const state: GameState = {
      ...GAME_INITIAL_STATE,
      game: {
        ...newGame,
        hasDetail: true,
        roster: buildRoster([getStoredPlayer()]),
        setupTasks: buildSetupTasks()
      }
    };

    const newState = game(state, {
      type: SET_FORMATION,
      formationType: FormationType.F4_3_3
    });

    const updatedTasks = buildSetupTasks();
    updatedTasks[SetupSteps.Formation].status = SetupStatus.Complete;
    updatedTasks[SetupSteps.Roster].status = SetupStatus.Active;

    const gameDetail: GameDetail = {
      ...newGame,
      hasDetail: true,
      roster: buildRoster([getStoredPlayer()]),
      setupTasks: updatedTasks,
      formation: { type: FormationType.F4_3_3 }
    };

    expect(newState).toEqual(expect.objectContaining({
      game: gameDetail,
    }));

    expect(newState).not.toBe(state);
    expect(newState.game).not.toBe(state.game);
  });

  describe('CAPTAINS_DONE', () => {

    it('should handle CAPTAINS_DONE', () => {
      const state: GameState = {
        ...GAME_INITIAL_STATE,
        game: {
          ...newGame,
          hasDetail: true,
          roster: buildRoster([getStoredPlayer()]),
          setupTasks: buildSetupTasks()
        }
      };

      const newState = game(state, {
        type: CAPTAINS_DONE
      });

      const updatedTasks = buildSetupTasks();
      updatedTasks[SetupSteps.Captains].status = SetupStatus.Complete;
      updatedTasks[SetupSteps.Starters].status = SetupStatus.Active;

      const gameDetail: GameDetail = {
        ...newGame,
        hasDetail: true,
        roster: buildRoster([getStoredPlayer()]),
        setupTasks: updatedTasks
      };

      expect(newState).toEqual(expect.objectContaining({
        game: gameDetail,
      }));

      expect(newState).not.toBe(state);
      expect(newState.game).not.toBe(state.game);
    });

  }); // describe('CAPTAINS_DONE')

  describe('ADD_PLAYER', () => {
    let newPlayer: Player;
    let existingPlayer: Player;
    let currentState: GameState = GAME_INITIAL_STATE;

    beforeEach(() => {
      newPlayer = getNewPlayer();
      existingPlayer = getStoredPlayer();

      currentState = {
        ...GAME_INITIAL_STATE,
        game: {
          ...newGame,
          hasDetail: true,
          roster: {},
          setupTasks: buildSetupTasks()
        }
      };
    });

    it('should add new player to empty roster', () => {
      const newState = game(currentState, {
        type: ADD_PLAYER,
        player: newPlayer
      });

      expect(newState.game).toEqual(expect.objectContaining({
        roster: buildRoster([newPlayer]),
      }));

      expect(newState).not.toBe(currentState);
      expect(newState.game!.roster).not.toBe(currentState.game!.roster);
    });

    it('should add new player to roster with existing players', () => {
      currentState.game!.roster = buildRoster([existingPlayer]);

      const newState = game(currentState, {
        type: ADD_PLAYER,
        player: newPlayer
      });

      expect(newState.game).toEqual(expect.objectContaining({
        roster: buildRoster([existingPlayer, newPlayer]),
      }));

      expect(newState).not.toBe(currentState);
      expect(newState.game!.roster).not.toBe(currentState.game!.roster);
    });

  }); // describe('ADD_PLAYER')

  describe('ROSTER_DONE', () => {

    it('should update setup tasks and init live players from roster', () => {
      const rosterPlayers = [getStoredPlayer()];

      const state: GameState = {
        ...GAME_INITIAL_STATE,
        game: {
          ...newGame,
          hasDetail: true,
          roster: buildRoster(rosterPlayers),
          setupTasks: buildSetupTasks()
        }
      };
      expect(state.players).toBeUndefined();

      const newState = game(state, {
        type: ROSTER_DONE
      });

      const updatedTasks = buildSetupTasks();
      updatedTasks[SetupSteps.Roster].status = SetupStatus.Complete;
      updatedTasks[SetupSteps.Captains].status = SetupStatus.Active;

      const gameDetail: GameDetail = {
        ...newGame,
        hasDetail: true,
        roster: buildRoster(rosterPlayers),
        setupTasks: updatedTasks
      };

      const livePlayers = rosterPlayers.map(player => {
        return { ...player } as LivePlayer;
      });

      expect(newState).toEqual(expect.objectContaining({
        game: gameDetail,
        players: livePlayers
      }));

      expect(newState).not.toBe(state);
      expect(newState.game).not.toBe(state.game);
    });

  }); // describe('ROSTER_DONE')

  describe('STARTERS_DONE', () => {

    it('should handle STARTERS_DONE', () => {
      const state: GameState = {
        ...GAME_INITIAL_STATE,
        game: {
          ...newGame,
          hasDetail: true,
          roster: buildRoster([getStoredPlayer()]),
          setupTasks: buildSetupTasks()
        }
      };

      const newState = game(state, {
        type: STARTERS_DONE
      });

      const updatedTasks = buildSetupTasks();
      updatedTasks[SetupSteps.Starters].status = SetupStatus.Complete;

      const gameDetail: GameDetail = {
        ...newGame,
        hasDetail: true,
        roster: buildRoster([getStoredPlayer()]),
        setupTasks: updatedTasks
      };

      expect(newState).toEqual(expect.objectContaining({
        game: gameDetail,
      }));

      expect(newState).not.toBe(state);
      expect(newState.game).not.toBe(state.game);
    });

  }); // describe('STARTERS_DONE')

  describe('START_GAME', () => {

    it('should handle START_GAME', () => {
      const completedTasks = buildSetupTasks();
      completedTasks.forEach(task => {task.status = SetupStatus.Complete;})

      const state: GameState = {
        ...GAME_INITIAL_STATE,
        game: {
          ...newGame,
          hasDetail: true,
          roster: buildRoster([getStoredPlayer()]),
          setupTasks: completedTasks
        }
      };

      const newState = game(state, {
        type: START_GAME
      });

      const gameDetail: GameDetail = {
        ...newGame,
        hasDetail: true,
        roster: buildRoster([getStoredPlayer()]),
        setupTasks: undefined
      };
      gameDetail.status = GameStatus.Start;

      expect(newState).toEqual(expect.objectContaining({
        game: gameDetail,
      }));

      expect(newState).not.toBe(state);
      expect(newState.game).not.toBe(state.game);
    });

  }); // describe('START_GAME')

  describe('SELECT_PLAYER', () => {

    it('should only set selectedPlayer with nothing selected', () => {
      const state: GameState = {
        ...GAME_INITIAL_STATE,
        game: buildNewGameDetail()
      };
      expect(state.selectedPlayer).toBeUndefined();

      const selectedPlayer = getStoredPlayer();

      const newState = game(state, {
        type: SELECT_PLAYER,
        playerId: selectedPlayer.id
      });

      expect(newState).toEqual(expect.objectContaining({
        game: buildNewGameDetail(),
        selectedPlayer: selectedPlayer.id
      }));
      // Separate check as it causes a TS error inside objectContaining
      expect(newState.proposedStarter).toBeUndefined();

      expect(newState).not.toBe(state);
    });

    it('should set selectedPlayer and propose starter with position selected', () => {
      const selectedPosition: Position = { id: 'AM1', type: 'AM'};

      const state: GameState = {
        ...GAME_INITIAL_STATE,
        game: buildNewGameDetailAndRoster(),
        selectedPosition: { ...selectedPosition }
      };
      expect(state.selectedPlayer).toBeUndefined();

      const selectedPlayer = getStoredPlayer();

      const newState = game(state, {
        type: SELECT_PLAYER,
        playerId: selectedPlayer.id
      });

      const starter: LivePlayer = {
        ...selectedPlayer,
        currentPosition: { ...selectedPosition }
      }

      expect(newState).toEqual(expect.objectContaining({
        game: buildNewGameDetailAndRoster(),
        selectedPosition: { ...selectedPosition },
        selectedPlayer: selectedPlayer.id,
        proposedStarter: expect.objectContaining(starter)
      }));

      expect(newState).not.toBe(state);
    });

  }); // describe('SELECT_PLAYER')

  describe('SELECT_POSITION', () => {

    it('should only set selectedPosition with nothing selected', () => {
      const state: GameState = {
        ...GAME_INITIAL_STATE,
        game: buildNewGameDetail()
      };
      expect(state.selectedPosition).toBeUndefined();

      const selectedPosition: Position = { id: 'AM1', type: 'AM'};
      const newState = game(state, {
        type: SELECT_POSITION,
        position: selectedPosition
      });

      expect(newState).toEqual(expect.objectContaining({
        game: buildNewGameDetail(),
        selectedPosition: { ...selectedPosition }
      }));
      // Separate check as it causes a TS error inside objectContaining
      expect(newState.proposedStarter).toBeUndefined();

      expect(newState).not.toBe(state);
    });

    it('should set selectedPosition and propose starter with player selected', () => {
      const selectedPlayer = getStoredPlayer();

      const state: GameState = {
        ...GAME_INITIAL_STATE,
        game: buildNewGameDetailAndRoster(),
        selectedPlayer: selectedPlayer.id,
      };
      expect(state.selectedPosition).toBeUndefined();

      const selectedPosition: Position = { id: 'AM1', type: 'AM'};
      const newState = game(state, {
        type: SELECT_POSITION,
        position: selectedPosition
      });

      const starter: LivePlayer = {
        ...selectedPlayer,
        currentPosition: { ...selectedPosition }
      }

      expect(newState).toEqual(expect.objectContaining({
        game: buildNewGameDetailAndRoster(),
        selectedPlayer: selectedPlayer.id,
        selectedPosition: { ...selectedPosition },
        proposedStarter: expect.objectContaining(starter)
      }));

      expect(newState).not.toBe(state);
    });

  }); // describe('SELECT_POSITION')

  describe('APPLY_STARTER', () => {
    let currentState: GameState;
    let selectedPlayer: LivePlayer;
    let selectedPosition: Position;

    beforeEach(() => {
      selectedPlayer = getStoredPlayer();
      selectedPosition = { id: 'AM1', type: 'AM'};
      const starter: LivePlayer = {
        ...selectedPlayer,
        currentPosition: { ...selectedPosition }
      }

      currentState = {
        ...GAME_INITIAL_STATE,
        game: buildNewGameDetailAndRoster(),
        players: [getStoredPlayer()],
        selectedPlayer: selectedPlayer.id,
        selectedPosition: { ...selectedPosition },
        proposedStarter: starter
      };
    });

    it('should set live player to ON with currentPosition', () => {
      const newState: GameState = game(currentState, {
        type: APPLY_STARTER
      });

      expect(newState.players).toBeDefined();

      const newPlayer = newState.players!.find(player => (player.id === selectedPlayer.id));
      expect(newPlayer).toBeDefined();
      expect(newPlayer).toEqual(expect.objectContaining({
        id: selectedPlayer.id,
        status: PlayerStatus.On,
        currentPosition: { ...selectedPosition }
      }));

      expect(newState).not.toBe(currentState);
      expect(newState.players).not.toBe(currentState.players);
    });

    it('should clear selected player/position and proposed starter', () => {
      const newState = game(currentState, {
        type: APPLY_STARTER
      });

      expect(newState.selectedPlayer).toBeUndefined();
      expect(newState.selectedPosition).toBeUndefined();
      expect(newState.proposedStarter).toBeUndefined();

      expect(newState).not.toBe(currentState);
    });

    it('should replace player already in the position', () => {
      const existingStarter: LivePlayer = {
        ...getNewPlayer(),
        status: PlayerStatus.On,
        currentPosition: { ...selectedPosition }
      }
      currentState.players!.push(existingStarter);

      const newState: GameState = game(currentState, {
        type: APPLY_STARTER
      });

      expect(newState.players).toBeDefined();

      const newPlayer = newState.players!.find(player => (player.id === selectedPlayer.id));
      expect(newPlayer).toBeDefined();
      expect(newPlayer).toEqual(expect.objectContaining({
        id: selectedPlayer.id,
        status: PlayerStatus.On,
        currentPosition: { ...selectedPosition }
      }));

      const replacedPlayer = newState.players!.find(player => (player.id === existingStarter.id));
      expect(replacedPlayer).toBeDefined();
      expect(replacedPlayer).toEqual(expect.objectContaining({
        id: existingStarter.id,
        status: PlayerStatus.Off,
      }));
      expect(replacedPlayer!.currentPosition).not.toBeDefined();

      expect(newState).not.toBe(currentState);
      expect(newState.players).not.toBe(currentState.players);
    });

  }); // describe('APPLY_STARTER')

  describe('CANCEL_STARTER', () => {
    let currentState: GameState;
    let selectedPlayer: LivePlayer;
    let selectedPosition: Position;

    beforeEach(() => {
      selectedPlayer = getStoredPlayer();
      selectedPosition = { id: 'AM1', type: 'AM'};
      const starter: LivePlayer = {
        ...selectedPlayer,
        currentPosition: { ...selectedPosition }
      }

      currentState = {
        ...GAME_INITIAL_STATE,
        game: buildNewGameDetailAndRoster(),
        players: [getStoredPlayer()],
        selectedPlayer: selectedPlayer.id,
        selectedPosition: { ...selectedPosition },
        proposedStarter: starter
      };
    });

    it('should clear selected player/position and proposed starter', () => {
      const newState = game(currentState, {
        type: CANCEL_STARTER
      });

      expect(newState.selectedPlayer).toBeUndefined();
      expect(newState.selectedPosition).toBeUndefined();
      expect(newState.proposedStarter).toBeUndefined();

      expect(newState).not.toBe(currentState);
    });

  }); // describe('CANCEL_STARTER')

});
