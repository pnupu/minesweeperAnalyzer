// Content script for Minesweeper Replay Analyzer
// This script runs on minesweeper.online pages

console.log('Minesweeper Replay Analyzer: Content script loaded');

// Solver scripts are now loaded automatically via manifest.json with world: "MAIN"
// The solver_bridge.js script will handle readiness checking and communication

// Track if solver is ready
let solverIsReady = false;

// Listen for solver ready event from the bridge
window.addEventListener('solverReady', (event) => {
  console.log('Solver ready event received from bridge:', event.detail);
  solverIsReady = true;
});

// Listen for solver error event from the bridge
window.addEventListener('solverError', (event) => {
  console.error('Solver error event received from bridge:', event.detail);
  solverIsReady = false;
});

class MinesweeperAnalyzer {
  constructor() {
    this.isReplayMode = false;
    this.boardData = null;
    this.solver = null;
    this.analysisResult = null;
    this.init();
  }

  init() {
    // Wait for page to be fully loaded and game elements to be ready
    if (document.readyState === 'loading') {
      window.addEventListener('load', () => this.waitForGameReady());
    } else {
      this.waitForGameReady();
    }
  }

  waitForGameReady(maxAttempts = 20, interval = 500) {
    let attempts = 0;
    const check = () => {
      const gameArea = document.querySelector('#AreaBlock') || 
                       document.querySelector('#game') || 
                       document.querySelector('.game-board');
      if (gameArea && gameArea.offsetParent !== null) {
        console.log('Minesweeper Analyzer: Game area ready, proceeding with setup.');
        this.setup();
      } else {
        attempts++;
        if (attempts < maxAttempts) {
          console.log(`Minesweeper Analyzer: Game area not ready, attempt ${attempts}/${maxAttempts}. Retrying...`);
          setTimeout(check, interval);
        } else {
          console.error('Minesweeper Analyzer: Timeout waiting for game area to be ready.');
        }
      }
    };
    check();
  }

  async setup() {
    console.log('Setting up Minesweeper Analyzer (after game ready)...');
    
    // Initialize solver first
    await this.initializeSolver();

    // Defer board data extraction and observers until solver is ready and page is loaded
    if (this.solver) {
        console.log('Minesweeper Analyzer: Page fully loaded, proceeding with setup.');
        this.detectReplayMode();
        this.setupObservers(); // Setup observers after page load
        this.extractBoardData(); // Initial board extraction
    } else {
        console.error("Solver not initialized, can't complete setup.")
    }
    
    // Inject our UI elements (can be done earlier)
    this.injectAnalyzerUI();
    
    // Listen for messages from popup/background
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
    });
  }

  async initializeSolver() {
    // Check if solver is already ready via global flag from solver_bridge.js
    if (window.__MRA_SOLVER_READY === true) {
      console.log('Solver is ready (checked via window.__MRA_SOLVER_READY).');
      this.createSolverBridge();
      return;
    }

    // Check if solver is already ready (legacy event listener)
    if (solverIsReady) {
      console.log('Solver is ready (checked via solverIsReady event flag).');
      this.createSolverBridge();
      return;
    }
    
    // Wait for solver ready event from bridge
    const checkSolver = () => {
      return new Promise((resolve) => {
        // Listen for solver ready event from bridge
        const handleSolverReady = (event) => {
          console.log('Solver ready event received in initializeSolver:', event.detail);
          window.removeEventListener('solverReady', handleSolverReady);
          
          // Create solver bridge
          this.createSolverBridge();
          resolve(true);
        };
        
        window.addEventListener('solverReady', handleSolverReady);
        
        // Fallback timeout
        setTimeout(() => {
          window.removeEventListener('solverReady', handleSolverReady);
          console.error('Timeout waiting for solver ready event');
          resolve(false);
        }, 30000); // 30 second timeout
      });
    };
    
    const success = await checkSolver();
    
    if (success && this.solver) {
      console.log('Solver adapter initialization complete');
    }
  }

  createSolverBridge() {
    this.solver = {
      solve: async (boardDataArgument, options) => {
        return new Promise(async (resolve) => {
          const callId = Date.now() + Math.random();
          let boardDataForMessage = boardDataArgument;

          if (!boardDataForMessage) {
            console.warn('Solver bridge (content.js): received null boardDataArgument, attempting to use this.boardData.');
            boardDataForMessage = this.boardData;
          }

          if (!boardDataForMessage) {
            console.error('Solver bridge (content.js): boardDataForMessage is still null. Aborting solver call.');
            resolve({ success: false, error: 'Board data not available for solver call.' });
            return;
          }

          // Sanitize boardData for postMessage: remove DOM elements
          let sanitizedBoardData;
          try {
            // Deep clone to avoid modifying the original this.boardData.cells elements
            const boardDataClone = JSON.parse(JSON.stringify(boardDataForMessage));
            if (boardDataClone.cells && Array.isArray(boardDataClone.cells)) {
              // If original cells had 'element', JSON.stringify would have removed it or errored if complex.
              // More robustly, create new cell objects without the element property.
              sanitizedBoardData = {
                ...boardDataClone, // Spread other properties like width, height, mines
                cells: boardDataForMessage.cells.map(cell => ({
                  x: cell.x,
                  y: cell.y,
                  state: cell.state,
                  value: cell.value,
                  isFlagged: cell.isFlagged,
                  isMine: cell.isMine
                  // Ensure no 'element' property is copied here
                }))
              };
            } else {
              // Fallback or error if cells are not as expected
              console.warn('Board data cells are not in the expected format for sanitization. Sending as is.');
              sanitizedBoardData = boardDataClone; 
            }
          } catch (e) {
            console.error('Error sanitizing boardData for postMessage:', e, 'Falling back to sending original (may fail).');
            // Fallback: try to send original, though it will likely fail if it contains elements
            // A better fallback might be to just send width/height/mines if cells are the issue.
            sanitizedBoardData = {
                width: boardDataForMessage.width,
                height: boardDataForMessage.height,
                mines: boardDataForMessage.mines,
                difficulty: boardDataForMessage.difficulty,
                isReplay: boardDataForMessage.isReplay,
                cells: [] // Send empty cells array on error to prevent cloning issues
            };
          }

          const handleResultMessage = (event) => {
            // We only want messages from our window, and of the correct type
            if (event.source !== window || !event.data || event.data.type !== 'MRA_SOLVER_RESULT' || event.data.callId !== callId) {
              return;
            }
            console.log('Content.js received MRA_SOLVER_RESULT:', event.data);
            window.removeEventListener('message', handleResultMessage);
            resolve(event.data.result);
          };
          
          window.addEventListener('message', handleResultMessage);

          console.log('Content.js: Posting MRA_SOLVER_CALL', { callId, boardData: sanitizedBoardData, options });
          window.postMessage({
            type: 'MRA_SOLVER_CALL',
            callId: callId,
            boardData: sanitizedBoardData, // Send the sanitized version
            options: options
          }, '*'); // Consider using a specific target origin if possible, but for same-page '/' or '*' is common.

          // Timeout fallback
          setTimeout(() => {
            window.removeEventListener('message', handleResultMessage); // Clean up listener
            // Check if already resolved, otherwise resolve with timeout
            // This requires a way to check if promise is settled, or wrap resolve
            console.warn(`Solver call ${callId} timed out in content.js`);
            // To prevent re-resolving if already resolved by message, we might need a flag
            // For now, let it potentially attempt to resolve, Promise behavior handles this.
            resolve({ success: false, error: 'Solver call timeout in content.js' });
          }, 30000); // 30 second timeout
        });
      }
    };
    console.log('Solver bridge (using postMessage) created in content.js');
  }

  detectReplayMode() {
    // Look for replay-specific elements
    const replayTimeline = document.querySelector('#replay_timeline');
    const replaySpecificControls = document.querySelector('#replay_play_btn'); // Or other distinctly replay controls
    const url = window.location.href;

    // More specific replay indicators
    const isLikelyReplay = !!(replayTimeline || replaySpecificControls || url.includes('replay') || url.includes('/game/')); // /game/ often means replay

    // Indicators of a live, new game (these would override replay detection)
    // Example: presence of a "New Game" button if one exists and is specific to pre-game or live game setup.
    // const newGameButton = document.querySelector('#new_game_button_selector'); // Adjust selector as needed
    // For now, we rely on the URL not being a specific non-replay game page if such exists, or absence of replay indicators.

    this.isReplayMode = isLikelyReplay;

    // Further refinement: if it's a game URL like /game/ID, but lacks strong replay indicators, it might be a spectator view of a live game or a completed game page.
    // For now, we'll assume /game/ID implies a replay context suitable for analysis.
    // Consider adding a manual toggle or more refined selectors if live game spectator mode needs different handling.

    console.log('Replay mode detected:', this.isReplayMode);
    
    // Disable analysis UI elements if not in replay mode initially.
    const analyzerPanel = document.getElementById('minesweeper-analyzer-overlay');
    if (analyzerPanel) {
        analyzerPanel.style.display = this.isReplayMode ? 'block' : 'none';
    }

    if (this.isReplayMode) {
      this.setupReplayAnalysis();
    } else {
      console.log("Not in replay mode, analysis features will be limited/disabled.");
      // Potentially clear any existing analysis if switching from replay to live
      this.clearAnalysisOverlays(); 
    }
    
    // Always try to extract board data
    this.extractBoardData();
  }

  setupObservers() {
    // Observer for board changes
    const boardObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' || mutation.type === 'attributes') {
          // Check if the game board is actually visible and ready
          const gameBoardElement = document.querySelector('#AreaBlock') || 
                            document.querySelector('#game') ||
                            document.querySelector('.game-board');
          if (gameBoardElement && gameBoardElement.offsetParent !== null) { // Check if element is visible
             this.onBoardChange();
          }
        }
      });
    });

    this.boardObserver = boardObserver; // Store it on the instance

    const gameBoardElementToObserve = document.querySelector('#AreaBlock') || 
                                   document.querySelector('#game') || 
                                   document.querySelector('.game-board') || 
                                   document.body; // Fallback to body if specific board not found

    if (gameBoardElementToObserve) {
      this.boardObserver.observe(gameBoardElementToObserve, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'style'] // Observe class changes on cells
      });
      console.log('Board observer set up on:', gameBoardElementToObserve);
    } else {
      console.error('Could not find a suitable game board element to observe.');
    }
  }

  setupReplayAnalysis() {
    console.log('Setting up replay analysis...');
    
    // Set up replay controls monitoring
    this.monitorReplayControls();
  }

  extractBoardData() {
    try {
      console.log('Extracting board data...');
      
      // Check if game area is present
      const gameArea = document.querySelector('#AreaBlock') || 
                       document.querySelector('#game') || 
                       document.querySelector('.game-board');
      
      if (!gameArea) {
        console.warn('Game area not found yet. Board data extraction skipped.');
        this.boardData = null; // Ensure boardData is null if extraction fails
        return;
      }
      
      // Get difficulty and board dimensions
      const difficulty = this.detectDifficulty();
      const dimensions = this.getBoardDimensions(difficulty);
      
      if (!dimensions) {
        console.log('Could not determine board dimensions');
        return;
      }
      
      // Extract mine count
      const mineCount = this.extractMineCount();
      
      // Extract cell data
      const cells = this.extractCells(dimensions.width, dimensions.height);
      
      if (cells.length === 0) {
        console.log('No cells found');
        return;
      }
      
      this.boardData = {
        width: dimensions.width,
        height: dimensions.height,
        mines: mineCount,
        difficulty: difficulty,
        cells: cells,
        isReplay: this.isReplayMode
      };
      
      console.log('Board data extracted:', this.boardData);
      
      // Trigger initial analysis if auto-analyze is enabled
      this.checkAutoAnalyze();
      
    } catch (error) {
      console.error('Error extracting board data:', error);
    }
  }

  async checkAutoAnalyze() {
    // Check if auto-analyze is enabled in settings
    try {
      const settings = await chrome.storage.sync.get(['autoAnalyze']);
      const autoAnalyze = settings.autoAnalyze !== false; // Default to true
      
      if (autoAnalyze && this.boardData && this.hasRevealedCells()) {
        console.log('Auto-analyzing board...');
        setTimeout(() => this.updateAnalysis(), 500); // Small delay to ensure DOM is stable
      }
    } catch (error) {
      console.error('Error checking auto-analyze setting:', error);
      // Default to auto-analyze if we can't read settings
      if (this.boardData && this.hasRevealedCells()) {
        setTimeout(() => this.updateAnalysis(), 500);
      }
    }
  }

  hasRevealedCells() {
    return this.boardData && this.boardData.cells.some(cell => cell.state === 'revealed');
  }

  detectDifficulty() {
    // Check for active level selector
    const activeLevel = document.querySelector('.level-select-link.active');
    if (activeLevel) {
      const text = activeLevel.textContent.trim().toLowerCase();
      if (text.includes('beginner')) return 'beginner';
      if (text.includes('intermediate')) return 'intermediate';
      if (text.includes('expert')) return 'expert';
      if (text.includes('custom')) return 'custom';
    }
    
    // Fallback: check URL
    const url = window.location.href;
    if (url.includes('/start/1')) return 'beginner';
    if (url.includes('/start/2')) return 'intermediate';
    if (url.includes('/start/3')) return 'expert';
    if (url.includes('/start/4')) return 'custom';
    
    // Fallback: detect from board size
    const cells = document.querySelectorAll('[id^="cell_"]');
    if (cells.length === 81) return 'beginner';    // 9x9
    if (cells.length === 256) return 'intermediate'; // 16x16
    if (cells.length === 480) return 'expert';      // 30x16
    
    return 'unknown';
  }

  getBoardDimensions(difficulty) {
    const standardDimensions = {
      'beginner': { width: 9, height: 9 },
      'intermediate': { width: 16, height: 16 },
      'expert': { width: 30, height: 16 }
    };
    
    if (standardDimensions[difficulty]) {
      return standardDimensions[difficulty];
    }
    
    // For custom or unknown, try to detect from actual cells
    return this.detectDimensionsFromCells();
  }

  detectDimensionsFromCells() {
    const cells = document.querySelectorAll('[id^="cell_"]');
    let maxX = 0, maxY = 0;
    
    cells.forEach(cell => {
      const x = parseInt(cell.getAttribute('data-x') || '0');
      const y = parseInt(cell.getAttribute('data-y') || '0');
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    });
    
    if (maxX > 0 && maxY > 0) {
      return { width: maxX + 1, height: maxY + 1 };
    }
    
    return null;
  }

  extractMineCount() {
    // Try to extract from mine counter display
    const mineCounter = this.readMineCounter();
    if (mineCounter !== null) {
      return mineCounter;
    }
    
    // Fallback to standard mine counts
    const difficulty = this.detectDifficulty();
    const standardMines = {
      'beginner': 10,
      'intermediate': 40,
      'expert': 99
    };
    
    return standardMines[difficulty] || 0;
  }

  readMineCounter() {
    try {
      // Read the mine counter digits
      const hundreds = document.querySelector('#top_area_mines_100');
      const tens = document.querySelector('#top_area_mines_10');
      const ones = document.querySelector('#top_area_mines_1');
      
      console.log('Mine counter elements:', { hundreds, tens, ones });
      
      if (!hundreds || !tens || !ones) {
        console.log('Mine counter elements not found');
        return null;
      }
      
      const h = this.extractDigitFromClass(hundreds.className);
      const t = this.extractDigitFromClass(tens.className);
      const o = this.extractDigitFromClass(ones.className);
      
      console.log('Mine counter digits:', { h, t, o });
      
      if (h !== null && t !== null && o !== null) {
        const total = h * 100 + t * 10 + o;
        console.log('Total mine count:', total);
        return total;
      }
    } catch (error) {
      console.error('Error reading mine counter:', error);
    }
    
    return null;
  }

  extractDigitFromClass(className) {
    // Extract digit from class like "hd_top-area-num3"
    const match = className.match(/(?:hd_)?top-area-num(\d)/);
    const digit = match ? parseInt(match[1]) : null;
    console.log(`Extracting digit from class "${className}": ${digit}`);
    return digit;
  }

  extractCells(width, height) {
    const cells = [];
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const cellElement = document.querySelector(`#cell_${x}_${y}`);
        if (!cellElement) {
          console.warn(`Cell not found: ${x},${y}`);
          continue;
        }
        
        const cellData = this.parseCellState(cellElement, x, y);
        cells.push(cellData);
      }
    }
    
    return cells;
  }

  parseCellState(cellElement, x, y) {
    const classes = cellElement.className;
    
    // Determine cell state
    let state = 'unknown';
    let value = 0;
    let isFlagged = false;
    let isMine = false;
    
    if (classes.includes('hd_closed')) {
      state = 'hidden';
    } else if (classes.includes('hd_opened')) {
      state = 'revealed';
      
      // Extract number from hd_typeX class (handles single and double digits)
      const typeMatch = classes.match(/hd_type(\d+)/);
      if (typeMatch) {
        const typeValue = parseInt(typeMatch[1]);
        if (typeValue <= 8) {
          // Normal number cells (0-8)
          value = typeValue;
        } else if (typeValue === 10) {
          // Mine in failed game
          isMine = true;
          value = 0; // Treat as empty cell for analysis purposes
        } else if (typeValue === 11) {
          // Exploded mine
          isMine = true;
          value = 0; // Treat as empty cell for analysis purposes
        }
      }
    }
    
    // Check for flag (might be hd_flagged or similar)
    if (classes.includes('hd_flagged') || classes.includes('flagged')) {
      isFlagged = true;
      state = 'flagged';
    }
    
    // Check for mine (in completed games or replays)
    if (classes.includes('hd_mine') || classes.includes('mine')) {
      isMine = true;
    }
    
    return {
      x: x,
      y: y,
      state: state,
      value: value,
      isFlagged: isFlagged,
      isMine: isMine,
      element: cellElement
    };
  }

  onBoardChange() {
    // Debounce rapid changes
    clearTimeout(this.boardChangeTimeout);
    this.boardChangeTimeout = setTimeout(() => {
      console.log('Board changed, re-extracting data...');
      const previousBoardData = this.boardData;
      this.extractBoardData();
      
      // Check if board actually changed
      if (this.hasBoardStateChanged(previousBoardData, this.boardData)) {
        console.log('Board state changed, triggering analysis...');
        this.updateAnalysis();
      }
    }, 100);
  }

  hasBoardStateChanged(oldBoard, newBoard) {
    if (!oldBoard || !newBoard) return true;
    if (oldBoard.width !== newBoard.width || oldBoard.height !== newBoard.height) return true;
    
    // Check if any cell states have changed
    for (let i = 0; i < newBoard.cells.length; i++) {
      const oldCell = oldBoard.cells.find(c => c.x === newBoard.cells[i].x && c.y === newBoard.cells[i].y);
      if (!oldCell) return true;
      
      if (oldCell.state !== newBoard.cells[i].state || 
          oldCell.value !== newBoard.cells[i].value ||
          oldCell.isFlagged !== newBoard.cells[i].isFlagged) {
        return true;
      }
    }
    
    return false;
  }

  async updateAnalysis() {
    if (!this.boardData) {
      console.warn('Cannot analyze: missing boardData. Attempting to extract...');
      this.extractBoardData(); // This updates this.boardData synchronously (or should)
      if (!this.boardData) {
        console.error('Still missing board data after re-extraction. Aborting analysis.');
        return;
      }
    }
    
    if (!this.solver) {
      console.log('Solver not ready, attempting to initialize...');
      await this.initializeSolver();
      
      if (!this.solver) {
        console.error('Failed to initialize solver for updateAnalysis. Aborting.');
        return;
      }
    }
    
    // Ensure we pass a valid boardData object
    const boardDataForSolver = this.boardData;
    if (!boardDataForSolver) {
        console.error("Critical: boardData is null just before calling solver. Aborting analysis.");
        return;
    }

    console.log('Updating analysis for board:', boardDataForSolver);
    // Deep log of cells to check their parsed states
    console.log('Board data cells being sent to solver:', JSON.stringify(boardDataForSolver.cells.map(c => ({x: c.x, y: c.y, state: c.state, value: c.value, isFlagged: c.isFlagged, isMine: c.isMine}))));
    console.log('Solver:', this.solver);
    
    try {
      // Run solver analysis
      const result = await this.solver.solve(boardDataForSolver, {
        verbose: true,
        playStyle: 1, // PLAY_STYLE_FLAGS
        advancedGuessing: true
      });
      
      console.log('Solver result:', result);
      this.analysisResult = result;
      
      if (result.success) {
        this.displayAnalysis(result);
        
        // Also send to background for popup updates
        chrome.runtime.sendMessage({
          action: 'analysisComplete',
          result: result
        });
      } else {
        console.error('Solver failed:', result.error);
      }
      
    } catch (error) {
      console.error('Analysis error:', error);
    }
  }

  async displayAnalysis(analysis) {
    console.log('Displaying analysis:', analysis);
    this.analysisResult = analysis;

    if (this.boardObserver) {
      this.boardObserver.disconnect();
      console.log('Disconnected board observer before displaying analysis.');
    }

    await this.clearAnalysisOverlays(); // Clear previous overlays first

    if (analysis && analysis.success) {
      const settings = await this.getSettings();
      if (settings.showProbabilities && analysis.mineProbabilities) {
        this.displayProbabilityOverlays(analysis.mineProbabilities);
      }
      if (settings.showSafeMoves && analysis.safeMoves) {
        this.highlightSafeMoves(analysis.safeMoves);
      }
      if (settings.showBestGuess && analysis.bestGuess) {
        this.highlightBestGuess(analysis.bestGuess);
      }
      this.updateAnalysisPanel(analysis);
    } else if (!analysis || !analysis.success) { // Simplified condition
      console.error('Solver failed or no analysis data:', analysis ? analysis.error : 'No analysis object');
      this.updateAnalysisPanel({ error: analysis ? analysis.error : 'No analysis data available.' });
    } else {
      // This case should ideally not be reached if the above conditions are comprehensive
      console.warn('No analysis data to display or analysis was not successful (unexpected case).');
      this.updateAnalysisPanel({ error: 'No analysis data available (unexpected case).' });
    }

    if (this.boardObserver) {
      const gameBoardElementToObserve = document.querySelector('#AreaBlock') || 
                                     document.querySelector('#game') || 
                                     document.querySelector('.game-board') || 
                                     document.body;
      if (gameBoardElementToObserve) {
        this.boardObserver.observe(gameBoardElementToObserve, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['class', 'style']
        });
        console.log('Reconnected board observer after displaying analysis.');
      }
    }
  }

  async getSettings() {
    try {
      return await chrome.storage.sync.get([
        'autoAnalyze',
        'showProbabilities', 
        'highlightMoves',
        'enableAnalysis'
      ]);
    } catch (error) {
      console.error('Error getting settings:', error);
      return {
        autoAnalyze: true,
        showProbabilities: true,
        highlightMoves: true,
        enableAnalysis: true
      };
    }
  }

  async clearAnalysisOverlays() {
    console.log('Clearing analysis overlays...');
    if (this.boardObserver) {
        this.boardObserver.disconnect();
        console.log('Disconnected board observer before clearing overlays.');
    }

    // Clear overlays from the dedicated container
    if (this.cellOverlayContainer) {
      while (this.cellOverlayContainer.firstChild) {
        this.cellOverlayContainer.removeChild(this.cellOverlayContainer.firstChild);
      }
    }

    // Clear highlight classes from game cells
    const highlightedCells = document.querySelectorAll('.cell-highlight-safe, .cell-highlight-mine, .cell-highlight-best-guess');
    highlightedCells.forEach(cell => {
      cell.classList.remove('cell-highlight-safe', 'cell-highlight-mine', 'cell-highlight-best-guess');
    });

    if (this.boardObserver) {
        const gameBoardElementToObserve = document.querySelector('#AreaBlock') || 
                                       document.querySelector('#game') || 
                                       document.querySelector('.game-board') || 
                                       document.body;
        if (gameBoardElementToObserve) {
            this.boardObserver.observe(gameBoardElementToObserve, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['class', 'style']
            });
            console.log('Reconnected board observer after clearing overlays.');
        }
    }
  }

  displayProbabilityOverlays(probabilities) {
    // Only show probabilities for hidden cells
    if (!this.cellOverlayContainer) {
        console.error("displayProbabilityOverlays: cellOverlayContainer not found. Was injectAnalyzerUI called?");
        return;
    }
    // Clear existing probability overlays from the dedicated container first
    this.cellOverlayContainer.querySelectorAll('.probability-overlay').forEach(el => el.remove());

    for (let [coords, probability] of Object.entries(probabilities)) {
      const [x, y] = coords.split(',').map(Number);
      const cellElement = document.querySelector(`#cell_${x}_${y}`);
      
      if (cellElement && probability !== undefined) {
        // Check if cell is hidden (only show probabilities for unrevealed cells)
        const isHidden = cellElement.classList.contains('hd_closed');
        if (!isHidden) continue;
        
        const overlay = document.createElement('div');
        overlay.className = 'probability-overlay'; // This class is used by clearAnalysisOverlays
        
        // Color code based on mine probability (note: probability is mine probability, not safety)
        const mineProb = probability;
        if (mineProb <= 0.01) {
          overlay.classList.add('probability-safe');
          overlay.textContent = 'SAFE';
        } else if (mineProb >= 0.99) {
          overlay.classList.add('probability-mine');
          overlay.textContent = 'MINE';
        } else {
          overlay.classList.add('probability-uncertain');
          overlay.textContent = `${(mineProb * 100).toFixed(0)}%`;
        }
        
        // Position overlay relative to the cell
        overlay.style.position = 'absolute'; // Absolute within its parent (the cellOverlayContainer)
        overlay.style.pointerEvents = 'none'; // Already on parent, but good for explicitness
        // overlay.style.zIndex = '10000'; // z-index is relative to stacking context; parent container handles overall z-order
        
        // Position it over the cell
        const rect = cellElement.getBoundingClientRect();
        overlay.style.left = `${rect.left + window.scrollX}px`;
        overlay.style.top = `${rect.top + window.scrollY}px`;
        overlay.style.width = `${rect.width}px`;
        overlay.style.height = `${rect.height}px`;
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.fontSize = '10px';
        overlay.style.fontWeight = 'bold';
        overlay.style.textShadow = '1px 1px 2px rgba(0,0,0,0.8)';
        
        this.cellOverlayContainer.appendChild(overlay); // Append to the dedicated container
      }
    }
  }

  highlightSafeMoves(safeMoves) {
    for (let move of safeMoves) {
      const cellElement = document.querySelector(`#cell_${move.x}_${move.y}`);
      if (cellElement) {
        cellElement.classList.add('cell-highlight-safe');
      }
    }
  }

  highlightBestGuess(bestGuess) {
    if (bestGuess && bestGuess.x !== undefined && bestGuess.y !== undefined) {
      const cellElement = document.querySelector(`#cell_${bestGuess.x}_${bestGuess.y}`);
      if (cellElement) {
        cellElement.classList.add('cell-highlight-best-guess');
      }
    }
  }

  async updateAnalysisPanel(analysis) {
    const statusDiv = document.querySelector('.analyzer-status');
    if (statusDiv) {
      const settings = await this.getSettings();
      const showProbabilities = settings.showProbabilities !== false;
      
      const analysisInfo = document.createElement('div');
      analysisInfo.innerHTML = `
        <div>Safe moves: ${analysis.safeMoves ? analysis.safeMoves.length : 0}</div>
        <div>Best guess: ${analysis.bestGuess ? `(${analysis.bestGuess.x},${analysis.bestGuess.y})` : 'None'}</div>
        <div>Win probability: ${analysis.winProbability ? `${(analysis.winProbability * 100).toFixed(1)}%` : 'Unknown'}</div>
        <div style="color: ${showProbabilities ? '#22c55e' : '#ef4444'};">
          Probabilities: ${showProbabilities ? 'ON' : 'OFF'} (Ctrl+P)
        </div>
      `;
      
      // Remove previous analysis info
      const existing = statusDiv.querySelector('.analysis-info');
      if (existing) existing.remove();
      
      analysisInfo.className = 'analysis-info';
      statusDiv.appendChild(analysisInfo);
    }
  }

  monitorReplayControls() {
    // Monitor replay controls (play, pause, step, etc.)
    const replayFooter = document.querySelector('#replay_footer');
    
    if (replayFooter) {
      replayFooter.addEventListener('click', (e) => {
        console.log('Replay control clicked:', e.target);
        // Delay analysis update to allow DOM to update
        setTimeout(() => this.updateAnalysis(), 200);
      });
    }
    
    // Also monitor keyboard controls
    document.addEventListener('keydown', (e) => {
      // Common replay keys: space, arrow keys
      if (['Space', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        setTimeout(() => this.updateAnalysis(), 200);
      }
      
      // Keyboard shortcuts for analyzer
      if (e.ctrlKey || e.metaKey) {
        switch (e.code) {
          case 'KeyA':
            e.preventDefault();
            this.updateAnalysis();
            break;
          case 'KeyP':
            e.preventDefault();
            this.toggleProbabilities();
            break;
        }
      }
    });
  }

  injectAnalyzerUI() {
    // Create and inject our analyzer UI overlay
    const analyzerOverlayPanel = document.createElement('div');
    analyzerOverlayPanel.id = 'minesweeper-analyzer-overlay';
    analyzerOverlayPanel.innerHTML = `
      <div class="analyzer-panel">
        <button class="minimize-btn" title="Minimize">−</button>
        <h3>Minesweeper Analyzer</h3>
        <div class="analyzer-status">
          <div>Status: ${this.isReplayMode ? 'Replay Mode' : 'Game Mode'}</div>
          <div id="board-info">Board: Detecting...</div>
        </div>
        <div class="analyzer-controls">
          <button id="toggle-analysis">Analyze Position</button>
          <button id="show-probabilities">Show Probabilities</button>
          <button id="refresh-board">Refresh Board</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(analyzerOverlayPanel);

    // Create a dedicated container for cell overlays (probabilities, highlights)
    let cellOverlayContainer = document.getElementById('mra-cell-overlay-container');
    if (!cellOverlayContainer) {
      cellOverlayContainer = document.createElement('div');
      cellOverlayContainer.id = 'mra-cell-overlay-container';
      cellOverlayContainer.style.position = 'absolute'; // Or 'fixed' if preferred, ensure it covers the game area or screen
      cellOverlayContainer.style.top = '0';
      cellOverlayContainer.style.left = '0';
      cellOverlayContainer.style.width = '100%'; // Adjust as needed
      cellOverlayContainer.style.height = '100%'; // Adjust as needed
      cellOverlayContainer.style.pointerEvents = 'none'; // Important: allows clicks to pass through to the game
      cellOverlayContainer.style.zIndex = '9999'; // Below analyzer panel but above game cells
      document.body.appendChild(cellOverlayContainer);
    }
    this.cellOverlayContainer = cellOverlayContainer; // Store reference
    
    // Add event listeners
    document.getElementById('toggle-analysis')?.addEventListener('click', () => {
      this.updateAnalysis();
    });
    
    document.getElementById('show-probabilities')?.addEventListener('click', () => {
      this.toggleProbabilities();
    });
    
    document.getElementById('refresh-board')?.addEventListener('click', () => {
      this.extractBoardData();
      this.updateBoardInfo();
    });
    
    // Minimize functionality
    document.querySelector('.minimize-btn')?.addEventListener('click', () => {
      analyzerOverlayPanel.querySelector('.analyzer-panel').classList.toggle('minimized');
    });
    
    // Update board info
    this.updateBoardInfo();
  }

  updateBoardInfo() {
    const boardInfo = document.getElementById('board-info');
    if (boardInfo && this.boardData) {
      boardInfo.textContent = `Board: ${this.boardData.width}×${this.boardData.height}, ${this.boardData.mines} mines (${this.boardData.difficulty})`;
    }
  }

  toggleAnalysis() {
    console.log('Toggling analysis...');
    this.updateAnalysis();
  }

  async toggleProbabilities() {
    console.log('Toggling probability display...');
    
    try {
      const settings = await this.getSettings();
      const newShowProbabilities = !settings.showProbabilities;
      
      // Save the new setting
      await chrome.storage.sync.set({ showProbabilities: newShowProbabilities });
      
      // Update display immediately if we have analysis results
      if (this.analysisResult) {
        if (newShowProbabilities) {
          // Show probabilities
          if (this.analysisResult.mineProbabilities) {
            this.displayProbabilityOverlays(this.analysisResult.mineProbabilities);
          }
        } else {
          // Hide probabilities
          document.querySelectorAll('.probability-overlay').forEach(el => el.remove());
        }
      }
      
      console.log('Probability display:', newShowProbabilities ? 'enabled' : 'disabled');
      
    } catch (error) {
      console.error('Error toggling probabilities:', error);
    }
  }

  handleMessage(message, sender, sendResponse) {
    console.log('Content script received message:', message);
    
    switch (message.action) {
      case 'getStatus':
        sendResponse({
          isReplayMode: this.isReplayMode,
          hasBoardData: !!this.boardData,
          boardData: this.boardData
        });
        break;
      
      case 'analyzeCurrent':
        this.updateAnalysis();
        sendResponse({ success: true });
        break;
      
      case 'refreshBoard':
        this.extractBoardData();
        sendResponse({ 
          success: true, 
          boardData: this.boardData 
        });
        break;
      
      default:
        console.log('Unknown message action:', message.action);
    }
  }
}

// Initialize the analyzer
const analyzer = new MinesweeperAnalyzer(); 