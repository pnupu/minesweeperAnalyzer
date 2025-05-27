// Solver Bridge - runs in main world to communicate with content script
// This script runs in the main world and has access to the solver globals

console.log('🔧 SOLVER BRIDGE: Starting to load...');
console.log('🔧 SOLVER BRIDGE: Script execution context:', typeof window, typeof document);

// Add global error handler to catch script loading errors
window.addEventListener('error', (event) => {
  console.error('Script error detected:', event.error, event.filename, event.lineno);
  window.lastScriptError = {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    error: event.error
  };
});

// Add unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  window.lastScriptError = {
    message: 'Unhandled promise rejection',
    reason: event.reason
  };
});

const REQUIRED_COMPONENTS = [
  'ExtensionSolverAdapter',
  'Board',
  'Tile',
  'solver', // This is the main solver function from solver_main.js
  'PrimeSieve',
  'Binomial',
  'SolutionCounter',
  'FiftyFiftyHelper',
  'EfficiencyHelper',
  'ProbabilityEngine',
  'BruteForceAnalysis',
  'WitnessWebIterator',
  'Cruncher',
  'SequentialIterator' // Added
];

// Check if solver components are available
function checkSolverComponents() {
  const componentStatus = {};
  REQUIRED_COMPONENTS.forEach(name => {
    const component = window[name];
    componentStatus[name] = (typeof component !== 'undefined');
    if (typeof component === 'function' && name !== 'solver' && 
        name !== 'PrimeSieve' && name !== 'Binomial') { // solver, PrimeSieve, and Binomial are functions/objects, not class constructors to be new-ed directly for this check
      try {
        // Check if it can be instantiated (for classes)
        // For solver, just check if it's a function
        if (name !== 'ExtensionSolverAdapter' && // Avoid instantiating the adapter here
            name !== 'ProbabilityEngine' && // Avoid instantiating PE here
            name !== 'BruteForceAnalysis' && // Avoid instantiating BFA here
            name !== 'Cruncher' && // Avoid instantiating Cruncher here
            name !== 'WitnessWebIterator' && // Avoid instantiating WitnessWebIterator here
            name !== 'SequentialIterator' // Avoid instantiating SequentialIterator here
           ) {
          new component(); // Attempt to instantiate
        }
        componentStatus[name] = true;
      } catch (e) {
        // If instantiation fails, it might be a plain object or function, still log it
        // console.warn(`Component ${name} is a function but not a constructor or failed to instantiate:`, e);
      }
    }
  });
  
  console.log('🔧 SOLVER BRIDGE: Components check:', componentStatus);
  
  // Log any errors that might be preventing loading
  if (typeof window.lastScriptError !== 'undefined') {
    console.error('Last script error:', window.lastScriptError);
  }
  
  const allReady = Object.values(componentStatus).every(ready => ready);
  
  if (allReady) {
    console.log('🔧 SOLVER BRIDGE: ✅ All components ready! Dispatching solverReady event');
    window.dispatchEvent(new CustomEvent('solverReady', {
      detail: { ready: true, components: componentStatus }
    }));
    window.__MRA_SOLVER_READY = true;
  } else {
    console.log('🔧 SOLVER BRIDGE: ❌ Some components missing:', 
      Object.entries(componentStatus).filter(([name, ready]) => !ready).map(([name]) => name));
  }
  
  return allReady;
}

// Log what's available immediately
console.log('🔧 SOLVER BRIDGE: Initial globals check:', {
  PrimeSieve: typeof PrimeSieve,
  Binomial: typeof Binomial,
  Tile: typeof Tile,
  Board: typeof Board,
  solver: typeof solver,
  ExtensionSolverAdapter: typeof ExtensionSolverAdapter,
  SolutionCounter: typeof SolutionCounter,
  BruteForceAnalysis: typeof BruteForceAnalysis,
  FiftyFiftyHelper: typeof FiftyFiftyHelper,
  EfficiencyHelper: typeof EfficiencyHelper,
  ProbabilityEngine: typeof ProbabilityEngine
});

// Since we're loading early, wait a bit before checking
console.log('🔧 SOLVER BRIDGE: Waiting for other scripts to load...');

setTimeout(() => {
  console.log('🔧 SOLVER BRIDGE: Starting component checks after delay...');
  
  // Try to check immediately
  if (!checkSolverComponents()) {
    // If not ready, set up a retry mechanism
    let attempts = 0;
    const maxAttempts = 100; // Increased attempts
    
    const retryInterval = setInterval(() => {
      attempts++;
      console.log(`🔧 SOLVER BRIDGE: Readiness check attempt ${attempts}/${maxAttempts}`);
      
      if (checkSolverComponents() || attempts >= maxAttempts) {
        clearInterval(retryInterval);
        if (attempts >= maxAttempts) {
          console.error('🔧 SOLVER BRIDGE: ❌ Components failed to load after maximum attempts');
          console.log('🔧 SOLVER BRIDGE: Final globals state:', {
            PrimeSieve: typeof PrimeSieve,
            Binomial: typeof Binomial,
            Tile: typeof Tile,
            Board: typeof Board,
            solver: typeof solver,
            ExtensionSolverAdapter: typeof ExtensionSolverAdapter,
            SolutionCounter: typeof SolutionCounter,
            BruteForceAnalysis: typeof BruteForceAnalysis,
            FiftyFiftyHelper: typeof FiftyFiftyHelper,
            EfficiencyHelper: typeof EfficiencyHelper,
            ProbabilityEngine: typeof ProbabilityEngine
          });
          window.dispatchEvent(new CustomEvent('solverError', {
            detail: { error: 'Timeout waiting for solver components' }
          }));
          window.__MRA_SOLVER_READY = false;
        }
      }
    }, 200); // Slower polling
  }
}, 1000); // Wait 1 second for other scripts to load

console.log('🔧 SOLVER BRIDGE: Setup complete - waiting for postMessage events');

// Listen for solver calls from content script via postMessage
window.addEventListener('message', async (event) => {
  // Basic security checks for postMessage
  if (event.source !== window || !event.data || event.data.type !== 'MRA_SOLVER_CALL') {
    // console.log('🔧 SOLVER BRIDGE: Ignoring message:', event.data);
    return;
  }

  console.log('🔧 SOLVER BRIDGE: Received MRA_SOLVER_CALL via postMessage:', event.data);

  const { callId, boardData, options } = event.data;

  if (callId === undefined) {
    console.error('🔧 SOLVER BRIDGE: MRA_SOLVER_CALL missing callId!');
    // Cannot send a targeted result back without callId
    return;
  }
  
  console.log('🔧 SOLVER BRIDGE: Extracted callId:', callId);
  console.log('🔧 SOLVER BRIDGE: typeof boardData from message:', typeof boardData);

  try {
    if (typeof ExtensionSolverAdapter === 'undefined') {
      throw new Error('ExtensionSolverAdapter not available');
    }
    if (!boardData) {
        console.error('🔧 SOLVER BRIDGE: boardData in message is null/undefined. CallId: ' + callId);
        throw new Error('boardData in message is null or undefined');
    }
    
    const adapter = new ExtensionSolverAdapter();
    await adapter.initialize();
    const result = await adapter.solve(boardData, options);

    console.log('🔧 SOLVER BRIDGE: Sending MRA_SOLVER_RESULT via postMessage for callId:', callId);
    window.postMessage({
      type: 'MRA_SOLVER_RESULT',
      callId: callId,
      result: result
    }, '*'); // Again, consider target origin

  } catch (error) {
    console.error('🔧 SOLVER BRIDGE: Solver call failed. CallId:', callId, 'Error:', error);
    window.postMessage({
      type: 'MRA_SOLVER_RESULT',
      callId: callId, 
      result: { success: false, error: error.message, callId: callId } 
    }, '*');
  }
});

// Remove the old CustomEvent listener for 'callSolver'
// window.removeEventListener('callSolver', oldCallSolverHandler); // Assuming you had one 