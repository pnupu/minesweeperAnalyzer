// Background service worker for Minesweeper Replay Analyzer

console.log('Minesweeper Analyzer background service worker loaded');

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed:', details);
  
  // Set default settings
  chrome.storage.sync.set({
    autoAnalyze: true,
    showProbabilities: true,
    highlightMoves: true,
    enableAnalysis: true
  });
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message);
  
  switch (message.action) {
    case 'analysisComplete':
      // Store analysis result for popup
      chrome.storage.local.set({
        lastAnalysis: message.result,
        lastAnalysisTime: Date.now()
      });
      break;
      
    default:
      console.log('Unknown message action:', message.action);
  }
});

// Handle tab updates to detect navigation to minesweeper.online
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('minesweeper.online')) {
    console.log('Minesweeper.online page loaded:', tab.url);
  }
});

// Extension installation/update handler
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed/updated:', details.reason);
  
  if (details.reason === 'install') {
    // Set default settings
    chrome.storage.sync.set({
      analysisEnabled: true,
      showProbabilities: true,
      autoAnalyze: false,
      highlightBestMoves: true
    });
    
    // Open welcome page or instructions
    chrome.tabs.create({
      url: 'https://minesweeper.online'
    });
  }
});

// Handle board analysis
async function handleBoardAnalysis(boardData, sendResponse) {
  try {
    console.log('Analyzing board:', boardData);
    
    // TODO: Integrate with JSMinesweeper solver
    // For now, return mock analysis
    const analysis = {
      probabilities: generateMockProbabilities(boardData),
      safeMoves: [],
      bestGuess: null,
      certainMines: []
    };
    
    sendResponse({ success: true, analysis });
  } catch (error) {
    console.error('Error analyzing board:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Mock probability generation (to be replaced with actual solver)
function generateMockProbabilities(boardData) {
  if (!boardData || !boardData.cells) return {};
  
  const probabilities = {};
  
  boardData.cells.forEach((cell, index) => {
    if (cell.state === 'hidden') {
      // Generate random probability for demo
      probabilities[index] = Math.random();
    }
  });
  
  return probabilities;
}

// Context menu setup (optional - for right-click analysis)
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'analyzeCurrent',
    title: 'Analyze Current Position',
    contexts: ['page'],
    documentUrlPatterns: ['https://minesweeper.online/*']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'analyzeCurrent') {
    chrome.tabs.sendMessage(tab.id, { action: 'analyzeCurrent' });
  }
});

// Alarm for periodic analysis updates (if needed)
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'updateAnalysis') {
    // Trigger analysis update in active minesweeper tabs
    chrome.tabs.query({ url: 'https://minesweeper.online/*' }, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, { action: 'updateAnalysis' });
      });
    });
  }
});

// Storage change listener
chrome.storage.onChanged.addListener((changes, namespace) => {
  console.log('Storage changed:', changes);
  
  // Notify content scripts of setting changes
  chrome.tabs.query({ url: 'https://minesweeper.online/*' }, (tabs) => {
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, { 
        action: 'settingsChanged', 
        changes: changes 
      });
    });
  });
}); 