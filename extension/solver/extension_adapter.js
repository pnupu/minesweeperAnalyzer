// Extension Adapter for JSMinesweeper Solver
// This file bridges between the Chrome extension and the original JSMinesweeper solver

"use strict";

class ExtensionSolverAdapter {
  constructor() {
    this.solverFunction = null;
    this.board = null;
  }

  async initialize() {
    // Check if the solver function is available
    if (typeof solver !== 'undefined') {
      this.solverFunction = solver;
      console.log('JSMinesweeper solver function initialized');
      return true;
    } else {
      console.error('JSMinesweeper solver function not available');
      console.log('Available globals:', {
        solver: typeof solver,
        Board: typeof Board,
        Tile: typeof Tile,
        SolverGlobal: typeof SolverGlobal
      });
      return false;
    }
  }

  // Convert our board data to JSMinesweeper format
  createBoardFromExtensionData(boardData) {
    try {
      // Create a new Board instance
      const board = new Board(null, boardData.width, boardData.height, boardData.mines, null, null);
      
      // Set up the tiles based on our extracted data
      for (let cellData of boardData.cells) {
        const tile = board.getTileXY(cellData.x, cellData.y);
        if (!tile) continue;

        // Set tile state
        if (cellData.state === 'revealed') {
          tile.setValue(cellData.value);
          // If this is a revealed mine (from failed game), mark it
          if (cellData.isMine) {
            tile.setBomb(true);
            tile.setFoundBomb();
          }
        } else if (cellData.state === 'flagged') {
          tile.setFlag(true);
        }
        // Hidden tiles remain covered by default

        // If we know it's a mine (from replay data or failed game)
        if (cellData.isMine && cellData.state !== 'revealed') {
          tile.setBomb(true);
        }
      }

      board.setStarted();
      return board;
      
    } catch (error) {
      console.error('Error creating board from extension data:', error);
      return null;
    }
  }

  // Main solve method that the extension will call
  async solve(boardData, options = {}) {
    try {
      if (!this.solverFunction) {
        const initialized = await this.initialize();
        if (!initialized) {
          throw new Error('Failed to initialize solver');
        }
      }

      // Convert board data
      this.board = this.createBoardFromExtensionData(boardData);
      if (!this.board) {
        throw new Error('Failed to create board');
      }

      // Set solver options
      const solverOptions = {
        verbose: options.verbose !== undefined ? options.verbose : true,
        playStyle: options.playStyle !== undefined ? options.playStyle : PLAY_STYLE_FLAGS,
        advancedGuessing: options.advancedGuessing !== undefined ? options.advancedGuessing : true,
        fullProbability: true,
        guessPruning: options.guessPruning !== undefined ? options.guessPruning : true,
        noGuessingMode: options.noGuessingMode !== undefined ? options.noGuessingMode : false,
        fullBFDA: options.fullBFDA !== undefined ? options.fullBFDA : false,
        analysisMode: false
      };

      console.log('Running solver with board:', this.board);
      console.log('Solver options:', solverOptions);

      // Run the solver function
      const result = await this.solverFunction(this.board, solverOptions);
      
      console.log('Raw solver result:', result);
      
      // Convert result to extension format
      return this.convertSolverResult(result);
      
    } catch (error) {
      console.error('Solver error:', error);
      return {
        success: false,
        error: error.message,
        actions: [],
        safeMoves: [],
        mineProbabilities: {},
        bestGuess: null,
        winProbability: null
      };
    }
  }

  convertSolverResult(solverResult) {
    const result = {
      success: true,
      actions: [],
      safeMoves: [],
      mineProbabilities: {},
      bestGuess: null,
      winProbability: null,
      analysis: {}
    };

    try {
      // The solver result should contain actions array
      if (solverResult && solverResult.actions) {
        result.actions = solverResult.actions;
        
        // Extract safe moves from actions
        for (let action of solverResult.actions) {
          if (action.action === 1) { // ACTION_CLEAR
            result.safeMoves.push({
              x: action.x,
              y: action.y,
              probability: action.prob || 1.0
            });
          }
        }
      }

      // Extract probabilities from board tiles
      if (this.board) {
        for (let tile of this.board.tiles) {
          if (tile.isCovered() && !tile.isFlagged()) {
            // Get mine probability from tile
            const mineProb = tile.probability !== undefined ? (1 - tile.probability) : 0.5;
            result.mineProbabilities[`${tile.x},${tile.y}`] = mineProb;
          }
        }
      }

      // Extract best guess from solver result
      if (solverResult && solverResult.bestGuess) {
        result.bestGuess = {
          x: solverResult.bestGuess.x,
          y: solverResult.bestGuess.y,
          probability: solverResult.bestGuess.prob || 0.5
        };
      } else if (solverResult && solverResult.actions && solverResult.actions.length > 0) {
        // Use the first action as best guess if no specific best guess
        const firstAction = solverResult.actions[0];
        result.bestGuess = {
          x: firstAction.x,
          y: firstAction.y,
          probability: firstAction.prob || 0.5
        };
      }

      // Extract win probability if available
      if (solverResult && solverResult.winProbability !== undefined) {
        result.winProbability = solverResult.winProbability;
      }

      // Add analysis metadata
      result.analysis = {
        solverUsed: 'JSMinesweeper',
        boardSize: this.board ? `${this.board.width}x${this.board.height}` : 'unknown',
        totalMines: this.board ? this.board.num_bombs : 0,
        coveredTiles: this.board ? this.board.tiles.filter(t => t.isCovered()).length : 0,
        actionsFound: result.actions.length,
        safeMoves: result.safeMoves.length,
        ...solverResult?.analysis
      };

      console.log('Converted solver result:', result);

    } catch (error) {
      console.error('Error converting solver result:', error);
    }

    return result;
  }
}

// Make sure all classes are available as globals
if (typeof window !== 'undefined') {
  window.ExtensionSolverAdapter = ExtensionSolverAdapter;
  
  // Also ensure other classes are available if they aren't already
  if (typeof window.Tile === 'undefined' && typeof Tile !== 'undefined') {
    window.Tile = Tile;
  }
  if (typeof window.Board === 'undefined' && typeof Board !== 'undefined') {
    window.Board = Board;
  }
  if (typeof window.solver === 'undefined' && typeof solver !== 'undefined') {
    window.solver = solver;
  }
  if (typeof window.SolverGlobal === 'undefined' && typeof SolverGlobal !== 'undefined') {
    window.SolverGlobal = SolverGlobal;
  }
}

// Export for use in extension
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ExtensionSolverAdapter };
}