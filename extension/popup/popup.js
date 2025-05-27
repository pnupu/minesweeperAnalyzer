// Popup script for Minesweeper Replay Analyzer

document.addEventListener('DOMContentLoaded', async () => {
  console.log('Popup loaded');
  
  // Get references to UI elements
  const statusEl = document.getElementById('status');
  const boardInfoEl = document.getElementById('board-info');
  const modeInfoEl = document.getElementById('mode-info');
  const analyzeBtn = document.getElementById('analyze-btn');
  const refreshBtn = document.getElementById('refresh-btn');
  const toggleProbabilitiesBtn = document.getElementById('toggle-probabilities');
  const analysisResultEl = document.getElementById('analysis-result');
  
  // Settings checkboxes
  const autoAnalyzeCheck = document.getElementById('auto-analyze');
  const showProbabilitiesCheck = document.getElementById('show-probabilities');
  const highlightMovesCheck = document.getElementById('highlight-moves');
  
  // Load settings
  await loadSettings();
  
  // Get current tab and check if it's minesweeper.online
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (!tab.url.includes('minesweeper.online')) {
    statusEl.textContent = 'Not on minesweeper.online';
    statusEl.style.color = '#d32f2f';
    analyzeBtn.disabled = true;
    refreshBtn.disabled = true;
    toggleProbabilitiesBtn.disabled = true;
    return;
  }
  
  // Get status from content script
  try {
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'getStatus' });
    updateStatus(response);
  } catch (error) {
    console.error('Error getting status:', error);
    statusEl.textContent = 'Extension not loaded';
    statusEl.style.color = '#d32f2f';
  }
  
  // Set up event listeners
  analyzeBtn.addEventListener('click', async () => {
    analyzeBtn.disabled = true;
    analyzeBtn.textContent = 'Analyzing...';
    
    try {
      await chrome.tabs.sendMessage(tab.id, { action: 'analyzeCurrent' });
      analyzeBtn.textContent = 'Analyze Position';
    } catch (error) {
      console.error('Error analyzing:', error);
      showError('Analysis failed: ' + error.message);
    } finally {
      analyzeBtn.disabled = false;
      analyzeBtn.textContent = 'Analyze Position';
    }
  });
  
  refreshBtn.addEventListener('click', async () => {
    refreshBtn.disabled = true;
    refreshBtn.textContent = 'Refreshing...';
    
    try {
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'refreshBoard' });
      updateStatus(response);
      refreshBtn.textContent = 'Refresh Board';
    } catch (error) {
      console.error('Error refreshing:', error);
      showError('Refresh failed: ' + error.message);
    } finally {
      refreshBtn.disabled = false;
      refreshBtn.textContent = 'Refresh Board';
    }
  });
  
  toggleProbabilitiesBtn.addEventListener('click', async () => {
    const newValue = !showProbabilitiesCheck.checked;
    showProbabilitiesCheck.checked = newValue;
    await saveSetting('showProbabilities', newValue);
    
    // Trigger probability toggle in content script
    try {
      await chrome.tabs.sendMessage(tab.id, { action: 'toggleProbabilities' });
    } catch (error) {
      console.error('Error toggling probabilities:', error);
    }
  });
  
  // Settings change handlers
  autoAnalyzeCheck.addEventListener('change', () => {
    saveSetting('autoAnalyze', autoAnalyzeCheck.checked);
  });
  
  showProbabilitiesCheck.addEventListener('change', () => {
    saveSetting('showProbabilities', showProbabilitiesCheck.checked);
  });
  
  highlightMovesCheck.addEventListener('change', () => {
    saveSetting('highlightMoves', highlightMovesCheck.checked);
  });
  
  // Load last analysis result
  loadLastAnalysis();
});

async function loadSettings() {
  try {
    const settings = await chrome.storage.sync.get([
      'autoAnalyze',
      'showProbabilities', 
      'highlightMoves'
    ]);
    
    document.getElementById('auto-analyze').checked = settings.autoAnalyze !== false;
    document.getElementById('show-probabilities').checked = settings.showProbabilities !== false;
    document.getElementById('highlight-moves').checked = settings.highlightMoves !== false;
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

async function saveSetting(key, value) {
  try {
    await chrome.storage.sync.set({ [key]: value });
  } catch (error) {
    console.error('Error saving setting:', error);
  }
}

function updateStatus(response) {
  const statusEl = document.getElementById('status');
  const boardInfoEl = document.getElementById('board-info');
  const modeInfoEl = document.getElementById('mode-info');
  
  if (response && response.hasBoardData) {
    statusEl.textContent = 'Ready';
    statusEl.style.color = '#4CAF50';
    
    if (response.boardData) {
      boardInfoEl.textContent = `${response.boardData.width}×${response.boardData.height}, ${response.boardData.mines} mines`;
      modeInfoEl.textContent = response.isReplayMode ? 'Replay' : 'Live Game';
    }
  } else {
    statusEl.textContent = 'No board detected';
    statusEl.style.color = '#ff9800';
    boardInfoEl.textContent = 'Unknown';
    modeInfoEl.textContent = 'Unknown';
  }
}

function showError(message) {
  const analysisResultEl = document.getElementById('analysis-result');
  analysisResultEl.className = 'analysis-result error';
  analysisResultEl.textContent = message;
  analysisResultEl.style.display = 'block';
  
  setTimeout(() => {
    analysisResultEl.style.display = 'none';
  }, 5000);
}

async function loadLastAnalysis() {
  try {
    const data = await chrome.storage.local.get(['lastAnalysis', 'lastAnalysisTime']);
    
    if (data.lastAnalysis && data.lastAnalysisTime) {
      const timeDiff = Date.now() - data.lastAnalysisTime;
      if (timeDiff < 60000) { // Show if less than 1 minute old
        showAnalysisResult(data.lastAnalysis);
      }
    }
  } catch (error) {
    console.error('Error loading last analysis:', error);
  }
}

function showAnalysisResult(result) {
  const analysisResultEl = document.getElementById('analysis-result');
  
  if (result.success) {
    analysisResultEl.className = 'analysis-result';
    analysisResultEl.innerHTML = `
      <div><strong>Analysis Complete</strong></div>
      <div>Safe moves: ${result.safeMoves ? result.safeMoves.length : 0}</div>
      <div>Best guess: ${result.bestGuess ? `(${result.bestGuess.x},${result.bestGuess.y})` : 'None'}</div>
      <div>Win probability: ${result.winProbability ? `${(result.winProbability * 100).toFixed(1)}%` : 'Unknown'}</div>
    `;
  } else {
    analysisResultEl.className = 'analysis-result error';
    analysisResultEl.textContent = 'Analysis failed: ' + (result.error || 'Unknown error');
  }
  
  analysisResultEl.style.display = 'block';
}