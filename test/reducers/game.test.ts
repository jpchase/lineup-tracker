import { FormationType, Position } from '@app/models/formation';
import {
  GameDetail, Games, GameStatus,
  LivePlayer,
  SetupStatus, SetupSteps, SetupTask
} from '@app/models/game';
import { Player, PlayerStatus } from '@app/models/player';
import {
  GAME_HYDRATE,
  APPLY_STARTER,
  CANCEL_STARTER,
  GET_GAME_REQUEST,
  GET_GAME_SUCCESS,
  GET_GAME_FAIL,
  CAPTAINS_DONE,
  COPY_ROSTER_REQUEST,
  COPY_ROSTER_SUCCESS,
  COPY_ROSTER_FAIL,
  ADD_PLAYER,
  ROSTER_DONE,
  STARTERS_DONE,
  START_GAME,
  SET_FORMATION,
  SELECT_PLAYER,
  SELECT_POSITION
} from '@app/actions/game-types';
import { game } from '@app/reducers/game';
import { GameState } from '@app/reducers/game';
import { expect } from '@open-wc/testing';
import {
  getFakeAction,
  getNewGame, getNewGameDetail, getNewGameWithLiveDetail,
  buildRoster, getNewPlayer, getStoredPlayer, getStoredGame
} from '../helpers/test_data';

const GAME_INITIAL_STATE: GameState = {
  hydrated: false,
  gameId: '',
  game: undefined,
  selectedPlayer: undefined,
  selectedPosition: undefined,
  proposedStarter: undefined,
  detailLoading: false,
  detailFailure: false,
  rosterLoading: false,
  rosterFailure: false,
  error: ''
};

function buildNewGameDetailAndRoster(tasks?: SetupTask[]): GameDetail {
  return getNewGameWithLiveDetail(buildRoster([getStoredPlayer()]), tasks);
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

  it('should return the initial state', () => {
    expect(
      game(GAME_INITIAL_STATE, getFakeAction())
      ).to.equal(GAME_INITIAL_STATE);
  });

  describe('GAME_HYDRATE', () => {
    let currentState: GameState = GAME_INITIAL_STATE;

    beforeEach(() => {
      currentState = {
        ...GAME_INITIAL_STATE,
      };
    });

    it('should set game to given cached game', () => {
      const inputGame = buildNewGameDetailAndRoster(buildSetupTasks());
      const inputGames: Games = {};
      inputGames[inputGame.id] = inputGame;

      const newState = game(currentState, {
        type: GAME_HYDRATE,
        gameId: inputGame.id,
        games: inputGames
      });

      const gameDetail: GameDetail = {
        ...inputGame,
      };

      expect(newState).to.deep.include({
        hydrated: true,
        gameId: inputGame.id,
        game: gameDetail,
      });

      expect(newState).not.to.equal(currentState);
      expect(newState.game).not.to.equal(currentState.game);
    });

    it('should set hydrated flag when cached values are missing', () => {
      const newState = game(currentState, {
        type: GAME_HYDRATE,
        games: {}
      });

      expect(newState).to.include({
        hydrated: true,
      });
      expect(newState.gameId, 'gameId should not be set').to.not.be.ok;
      expect(newState.game).to.be.undefined;

      expect(newState).not.to.equal(currentState);
    });

    it('should ignored cached values when hydrated flag already set', () => {
      const currentGame = buildNewGameDetailAndRoster(buildSetupTasks());
      currentState.gameId = currentGame.id;
      currentState.game = currentGame;
      currentState.hydrated = true;

      const inputGame = getStoredGame();
      const inputGames: Games = {};
      inputGames[inputGame.id] = inputGame;

      expect(inputGame.id).not.to.equal(currentGame.id);

      const newState = game(currentState, {
        type: GAME_HYDRATE,
        gameId: inputGame.id,
        games: inputGames
      });

      expect(newState).to.include({
        hydrated: true,
        game: currentGame,
      });

      expect(newState).to.equal(currentState);
      expect(newState.game).to.equal(currentState.game);
    });
  }); // describe('GAME_HYDRATE')

  describe('GET_GAME_REQUEST', () => {
    it('should set game id and loading flag', () => {
      const gameId = 'idfornewgame';
      const newState = game(GAME_INITIAL_STATE, {
        type: GET_GAME_REQUEST,
        gameId: gameId
      });

      expect(newState).to.include({
        gameId: gameId,
        detailLoading: true,
        detailFailure: false
      });

      expect(newState).not.to.equal(GAME_INITIAL_STATE);
      expect(newState.gameId).not.to.equal(GAME_INITIAL_STATE.gameId);
    });
  }); // describe('GET_GAME_REQUEST')

  describe('GET_GAME_SUCCESS', () => {
    let currentState: GameState = GAME_INITIAL_STATE;

    beforeEach(() => {
      currentState = {
        ...GAME_INITIAL_STATE,
        detailLoading: true,
      };
    });

    it('should set game to given game with full detail', () => {
      const existingGame = getStoredGame();
      const inputGame: GameDetail = {
        ...existingGame,
        roster: buildRoster([getStoredPlayer()])
      };

      currentState.gameId = inputGame.id;
      const newState = game(currentState, {
        type: GET_GAME_SUCCESS,
        game: inputGame
      });

      const gameDetail: GameDetail = {
        ...existingGame,
        hasDetail: true,
        roster: buildRoster([getStoredPlayer()])
      };

      expect(newState).to.deep.include({
        game: gameDetail,
        // TODO: Ensure games state has latest game detail
        // games: buildGames([gameDetail]),
        detailLoading: false,
        detailFailure: false
      });

      expect(newState).not.to.equal(currentState);
      expect(newState.game).not.to.equal(currentState.game);
    });

    it('should initialize detail when game roster is empty', () => {
      const currentGame = getNewGame();
      const inputGame: GameDetail = {
        ...currentGame,
        roster: {}
      };

      currentState.gameId = inputGame.id;
      const newState = game(currentState, {
        type: GET_GAME_SUCCESS,
        game: inputGame
      });

      const gameDetail: GameDetail = {
        ...currentGame,
        hasDetail: true,
        roster: {},
        liveDetail: {
          id: currentGame.id,
          setupTasks: buildSetupTasks()
        }
      };

      expect(newState).to.deep.include({
        game: gameDetail,
        // TODO: Ensure games state has latest game detail
        // games: buildGames([gameDetail]),
        detailLoading: false,
        detailFailure: false
      });

      expect(newState).not.to.equal(currentState);
      expect(newState.game).not.to.equal(currentState.game);
    });

    it('should initialize live detail for new game', () => {
      const currentGame = getNewGame();
      const inputGame: GameDetail = {
        ...currentGame,
        roster: buildRoster([getStoredPlayer()])
      };

      currentState.gameId = inputGame.id;
      const newState = game(currentState, {
        type: GET_GAME_SUCCESS,
        game: inputGame
      });

      const gameDetail: GameDetail = {
        ...currentGame,
        hasDetail: true,
        roster: buildRoster([getStoredPlayer()]),
        liveDetail: {
          id: currentGame.id,
          setupTasks: buildSetupTasks()
        }
      };

      expect(newState).to.deep.include({
        game: gameDetail,
        // TODO: Ensure games state has latest game detail
        // games: buildGames([gameDetail]),
        detailLoading: false,
        detailFailure: false
      });

      expect(newState).not.to.equal(currentState);
      expect(newState.game).not.to.equal(currentState.game);
    });

    it('should only update loading flag when game set to current game', () => {
      const currentGame = buildNewGameDetailAndRoster(buildSetupTasks());
      currentState.gameId = currentGame.id;
      currentState.game = currentGame;

      const newState = game(currentState, {
        type: GET_GAME_SUCCESS,
        game: currentGame
      });

      const gameDetail: GameDetail = {
        ...currentGame,
        liveDetail: {
          id: currentGame.id,
          setupTasks: buildSetupTasks()
        }
      };

      expect(newState).to.deep.include({
        game: gameDetail,
        // TODO: Ensure games state has latest game detail
        // games: buildGames([gameDetail]),
        detailLoading: false,
        detailFailure: false
      });

      expect(newState).not.to.equal(currentState);
      expect(newState.game).to.equal(currentState.game);
      expect(newState.game!.liveDetail).to.equal(currentState.game!.liveDetail);
      expect(newState.game!.roster).to.equal(currentState.game!.roster);
    });
  }); // describe('GET_GAME_SUCCESS')

  describe('GET_GAME_FAIL', () => {
    it('should set failure flag and error message', () => {

      const newState = game(GAME_INITIAL_STATE, {
        type: GET_GAME_FAIL,
        error: 'What a game failure!'
      });

      expect(newState).to.include({
        error: 'What a game failure!',
        detailLoading: false,
        detailFailure: true
      });

      expect(newState).not.to.equal(GAME_INITIAL_STATE);
      expect(newState.error).not.to.equal(GAME_INITIAL_STATE.error);
    });
  }); // describe('GET_GAME_FAIL')

  describe('SET_FORMATION', () => {

    it('should set formation type and update setup tasks to mark formation complete', () => {
      const currentGame = getNewGameWithLiveDetail(undefined, buildSetupTasks());
      const state: GameState = {
        ...GAME_INITIAL_STATE,
        game: {
          ...currentGame
        }
      };

      const newState = game(state, {
        type: SET_FORMATION,
        formationType: FormationType.F4_3_3
      });

      const updatedTasks = buildSetupTasks();
      updatedTasks[SetupSteps.Formation].status = SetupStatus.Complete;
      updatedTasks[SetupSteps.Roster].status = SetupStatus.Active;

      const gameDetail = getNewGameWithLiveDetail(undefined, updatedTasks);
      gameDetail.formation = { type: FormationType.F4_3_3 };

      expect(newState).to.deep.include({
        game: gameDetail,
      });

      expect(newState).not.to.equal(state);
      expect(newState.game).not.to.equal(state.game);
      expect(newState.game!.liveDetail).not.to.equal(state.game!.liveDetail);
    });
  }); // describe('SET_FORMATION')

  describe('CAPTAINS_DONE', () => {

    it('should update setup tasks to mark captains complete and next active', () => {
      const currentGame = getNewGameWithLiveDetail(undefined, buildSetupTasks());
      const state: GameState = {
        ...GAME_INITIAL_STATE,
        game: {
          ...currentGame
        }
      };

      const newState = game(state, {
        type: CAPTAINS_DONE
      });

      const updatedTasks = buildSetupTasks();
      updatedTasks[SetupSteps.Captains].status = SetupStatus.Complete;
      updatedTasks[SetupSteps.Starters].status = SetupStatus.Active;

      const gameDetail = getNewGameWithLiveDetail(undefined, updatedTasks);

      expect(newState).to.deep.include({
        game: gameDetail,
      });

      expect(newState).not.to.equal(state);
      expect(newState.game).not.to.equal(state.game);
      expect(newState.game!.liveDetail).not.to.equal(state.game!.liveDetail);
    });
  }); // describe('CAPTAINS_DONE')

  describe('COPY_ROSTER_REQUEST', () => {
    it('should set copying flag', () => {
      const gameId = 'agameid';
      const newState = game(GAME_INITIAL_STATE, {
        type: COPY_ROSTER_REQUEST,
        gameId: gameId
      });

      expect(newState).to.include({
        gameId: gameId,
        rosterLoading: true,
        rosterFailure: false
      });

      expect(newState).not.to.equal(GAME_INITIAL_STATE);
      expect(newState.gameId).not.to.equal(GAME_INITIAL_STATE.gameId);
    });
  }); // describe('COPY_ROSTER_REQUEST')

  describe('COPY_ROSTER_SUCCESS', () => {
    let currentState: GameState = GAME_INITIAL_STATE;
    let currentGame = getNewGame();

    beforeEach(() => {
      currentState = {
        ...GAME_INITIAL_STATE,
        rosterLoading: true,
        game: {
          ...currentGame,
          hasDetail: true,
          roster: {}
        }
      };
    });

    it('should only update flags when roster already set', () => {
      currentState.game!.roster = buildRoster([getStoredPlayer()]);

      const newState = game(currentState, {
        type: COPY_ROSTER_SUCCESS,
        gameId: currentState.game!.id
      });

      const gameDetail: GameDetail = {
        ...currentState.game as GameDetail
      };

      expect(newState).to.deep.include({
        game: gameDetail,
        rosterLoading: false,
        rosterFailure: false
      });

      expect(newState).not.to.equal(currentState);
      expect(newState.game).to.equal(currentState.game);
      expect(newState.game!.roster).to.equal(currentState.game!.roster);
    });

    it('should set roster and update flags', () => {
      const rosterPlayers = [getStoredPlayer()];

      expect(currentState.game!.roster).to.deep.equal({});

      const newState = game(currentState, {
        type: COPY_ROSTER_SUCCESS,
        gameId: currentState.game!.id,
        gameRoster: buildRoster(rosterPlayers)
      });

      const gameDetail: GameDetail = {
        ...currentGame,
        hasDetail: true,
        roster: buildRoster(rosterPlayers)
      };

      expect(newState).to.deep.include({
        game: gameDetail,
        rosterLoading: false,
        rosterFailure: false
      });

      expect(newState).not.to.equal(currentState);
      expect(newState.game).not.to.equal(currentState.game);
      expect(newState.game!.roster).not.to.equal(currentState.game!.roster);
    });
  }); // describe('COPY_ROSTER_SUCCESS')

  describe('COPY_ROSTER_FAIL', () => {
    it('should set failure flag and error message', () => {

      const newState = game(GAME_INITIAL_STATE, {
        type: COPY_ROSTER_FAIL,
        error: 'What a roster failure!'
      });

      expect(newState).to.include({
        error: 'What a roster failure!',
        rosterLoading: false,
        rosterFailure: true
      });

      expect(newState).not.to.equal(GAME_INITIAL_STATE);
      expect(newState.error).not.to.equal(GAME_INITIAL_STATE.error);
    });
  }); // describe('COPY_ROSTER_FAIL')

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
          ...getNewGameWithLiveDetail(undefined, buildSetupTasks())
        }
      };
    });

    it('should add new player to empty roster', () => {
      const newState = game(currentState, {
        type: ADD_PLAYER,
        player: newPlayer
      });

      expect(newState.game).to.deep.include({
        roster: buildRoster([newPlayer]),
      });

      expect(newState).not.to.equal(currentState);
      expect(newState.game!.roster).not.to.equal(currentState.game!.roster);
    });

    it('should add new player to roster with existing players', () => {
      currentState.game!.roster = buildRoster([existingPlayer]);

      const newState = game(currentState, {
        type: ADD_PLAYER,
        player: newPlayer
      });

      expect(newState.game).to.deep.include({
        roster: buildRoster([existingPlayer, newPlayer]),
      });

      expect(newState).not.to.equal(currentState);
      expect(newState.game!.roster).not.to.equal(currentState.game!.roster);
    });
  }); // describe('ADD_PLAYER')

  describe('ROSTER_DONE', () => {

    it('should update setup tasks and init live players from roster', () => {
      const rosterPlayers = [getStoredPlayer()];

      const currentGame = getNewGameWithLiveDetail(buildRoster(rosterPlayers), buildSetupTasks());
      const state: GameState = {
        ...GAME_INITIAL_STATE,
        game: {
          ...currentGame,
        }
      };
      expect(state.game!.liveDetail).to.not.be.undefined;
      expect(state.game!.liveDetail!.players).to.be.undefined;

      const newState = game(state, {
        type: ROSTER_DONE
      });

      const updatedTasks = buildSetupTasks();
      updatedTasks[SetupSteps.Roster].status = SetupStatus.Complete;
      updatedTasks[SetupSteps.Captains].status = SetupStatus.Active;

      const gameDetail = getNewGameWithLiveDetail(buildRoster(rosterPlayers), updatedTasks);
      gameDetail.liveDetail!.players = rosterPlayers.map(player => {
        return { ...player } as LivePlayer;
      });

      expect(newState).to.deep.include({
        game: gameDetail
      });

      expect(newState).not.to.equal(state);
      expect(newState.game).not.to.equal(state.game);
      expect(newState.game!.liveDetail).not.to.equal(state.game!.liveDetail);
    });
  }); // describe('ROSTER_DONE')

  describe('STARTERS_DONE', () => {

    it('should update setup tasks to mark starters complete', () => {
      const currentGame = getNewGameWithLiveDetail();
      const state: GameState = {
        ...GAME_INITIAL_STATE,
        game: {
          ...currentGame
        }
      };

      const newState = game(state, {
        type: STARTERS_DONE
      });

      const updatedTasks = buildSetupTasks();
      updatedTasks[SetupSteps.Starters].status = SetupStatus.Complete;

      const gameDetail = getNewGameWithLiveDetail(undefined, updatedTasks);

      expect(newState).to.deep.include({
        game: gameDetail,
      });

      expect(newState).not.to.equal(state);
      expect(newState.game).not.to.equal(state.game);
      expect(newState.game!.liveDetail).not.to.equal(state.game!.liveDetail);
    });
  }); // describe('STARTERS_DONE')

  describe('START_GAME', () => {

    it('should set status to Start and clear setup tasks', () => {
      const completedTasks = buildSetupTasks();
      completedTasks.forEach(task => {task.status = SetupStatus.Complete;})

      const currentGame = getNewGameWithLiveDetail(buildRoster([getStoredPlayer()]), completedTasks);
      const state: GameState = {
        ...GAME_INITIAL_STATE,
        game: {
          ...currentGame
        }
      };

      const newState = game(state, {
        type: START_GAME
      });

      const gameDetail = getNewGameWithLiveDetail(buildRoster([getStoredPlayer()]), undefined);
      gameDetail.status = GameStatus.Start;

      expect(newState).to.deep.include({
        game: gameDetail,
      });

      expect(newState).not.to.equal(state);
      expect(newState.game).not.to.equal(state.game);
      expect(newState.game!.liveDetail).not.to.equal(state.game!.liveDetail);
    });
  }); // describe('START_GAME')

  describe('SELECT_PLAYER', () => {

    it('should only set selectedPlayer with nothing selected', () => {
      const state: GameState = {
        ...GAME_INITIAL_STATE,
        game: getNewGameDetail()
      };
      expect(state.selectedPlayer).to.be.undefined;

      const selectedPlayer = getStoredPlayer();

      const newState = game(state, {
        type: SELECT_PLAYER,
        playerId: selectedPlayer.id
      });

      expect(newState).to.deep.include({
        game: getNewGameDetail(),
        selectedPlayer: selectedPlayer.id,
        proposedStarter: undefined
      });

      expect(newState).not.to.equal(state);
    });

    it('should set selectedPlayer and propose starter with position selected', () => {
      const selectedPosition: Position = { id: 'AM1', type: 'AM'};

      const state: GameState = {
        ...GAME_INITIAL_STATE,
        game: buildNewGameDetailAndRoster(),
        selectedPosition: { ...selectedPosition }
      };
      expect(state.selectedPlayer).to.be.undefined;

      const selectedPlayer = getStoredPlayer();

      const newState = game(state, {
        type: SELECT_PLAYER,
        playerId: selectedPlayer.id
      });

      const starter: LivePlayer = {
        ...selectedPlayer,
        currentPosition: { ...selectedPosition }
      }

      expect(newState).to.deep.include({
        game: buildNewGameDetailAndRoster(),
        selectedPosition: { ...selectedPosition },
        selectedPlayer: selectedPlayer.id,
        proposedStarter: starter
      });

      expect(newState).not.to.equal(state);
    });
  }); // describe('SELECT_PLAYER')

  describe('SELECT_POSITION', () => {

    it('should only set selectedPosition with nothing selected', () => {
      const state: GameState = {
        ...GAME_INITIAL_STATE,
        game: getNewGameDetail()
      };
      expect(state.selectedPosition).to.be.undefined;

      const selectedPosition: Position = { id: 'AM1', type: 'AM'};
      const newState = game(state, {
        type: SELECT_POSITION,
        position: selectedPosition
      });

      expect(newState).to.deep.include({
        game: getNewGameDetail(),
        selectedPosition: { ...selectedPosition },
        proposedStarter: undefined
      });

      expect(newState).not.to.equal(state);
    });

    it('should set selectedPosition and propose starter with player selected', () => {
      const selectedPlayer = getStoredPlayer();

      const state: GameState = {
        ...GAME_INITIAL_STATE,
        game: buildNewGameDetailAndRoster(),
        selectedPlayer: selectedPlayer.id,
      };
      expect(state.selectedPosition).to.be.undefined;

      const selectedPosition: Position = { id: 'AM1', type: 'AM'};
      const newState = game(state, {
        type: SELECT_POSITION,
        position: selectedPosition
      });

      const starter: LivePlayer = {
        ...selectedPlayer,
        currentPosition: { ...selectedPosition }
      }

      expect(newState).to.deep.include({
        game: buildNewGameDetailAndRoster(),
        selectedPlayer: selectedPlayer.id,
        selectedPosition: { ...selectedPosition },
        proposedStarter: starter
      });

      expect(newState).not.to.equal(state);
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
        selectedPlayer: selectedPlayer.id,
        selectedPosition: { ...selectedPosition },
        proposedStarter: starter
      };
      currentState.game!.liveDetail!.players = [getStoredPlayer()];
    });

    it('should set live player to ON with currentPosition', () => {
      const newState: GameState = game(currentState, {
        type: APPLY_STARTER
      });

      expect(newState.game!.liveDetail!.players).to.not.be.undefined;
      const newPlayers = newState.game!.liveDetail!.players!;

      const newPlayer = newPlayers.find(player => (player.id === selectedPlayer.id));
      expect(newPlayer).to.not.be.undefined;
      expect(newPlayer).to.deep.include({
        id: selectedPlayer.id,
        status: PlayerStatus.On,
        currentPosition: { ...selectedPosition }
      });

      expect(newState).not.to.equal(currentState);
      expect(newState.game).not.to.equal(currentState.game);
      expect(newState.game!.liveDetail).not.to.equal(currentState.game!.liveDetail);
      expect(newPlayers).not.to.equal(currentState.game!.liveDetail!.players);
    });

    it('should clear selected player/position and proposed starter', () => {
      const newState = game(currentState, {
        type: APPLY_STARTER
      });

      expect(newState.selectedPlayer).to.be.undefined;
      expect(newState.selectedPosition).to.be.undefined;
      expect(newState.proposedStarter).to.be.undefined;

      expect(newState).not.to.equal(currentState);
    });

    it('should replace player already in the position', () => {
      const existingStarter: LivePlayer = {
        ...getNewPlayer(),
        status: PlayerStatus.On,
        currentPosition: { ...selectedPosition }
      }
      currentState.game!.liveDetail!.players!.push(existingStarter);

      const newState: GameState = game(currentState, {
        type: APPLY_STARTER
      });

      expect(newState.game!.liveDetail!.players).to.not.be.undefined;
      const newPlayers = newState.game!.liveDetail!.players!;

      const newPlayer = newPlayers.find(player => (player.id === selectedPlayer.id));
      expect(newPlayer).to.not.be.undefined;
      expect(newPlayer).to.deep.include({
        id: selectedPlayer.id,
        status: PlayerStatus.On,
        currentPosition: { ...selectedPosition }
      });

      const replacedPlayer = newPlayers.find(player => (player.id === existingStarter.id));
      expect(replacedPlayer).to.not.be.undefined;
      expect(replacedPlayer).to.include({
        id: existingStarter.id,
        status: PlayerStatus.Off,
      });
      expect(replacedPlayer!.currentPosition).to.be.undefined;

      expect(newState).not.to.equal(currentState);
      expect(newState.game).not.to.equal(currentState.game);
      expect(newState.game!.liveDetail).not.to.equal(currentState.game!.liveDetail);
      expect(newPlayers).not.to.equal(currentState.game!.liveDetail!.players);
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
        selectedPlayer: selectedPlayer.id,
        selectedPosition: { ...selectedPosition },
        proposedStarter: starter
      };
      currentState.game!.liveDetail!.players = [getStoredPlayer()];
    });

    it('should clear selected player/position and proposed starter', () => {
      const newState = game(currentState, {
        type: CANCEL_STARTER
      });

      expect(newState.selectedPlayer).to.be.undefined;
      expect(newState.selectedPosition).to.be.undefined;
      expect(newState.proposedStarter).to.be.undefined;

      expect(newState).not.to.equal(currentState);
    });
  }); // describe('CANCEL_STARTER')

});
