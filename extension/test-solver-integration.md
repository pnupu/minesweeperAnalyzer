# Testing JSMinesweeper Solver Integration

This guide helps test the integration between the Chrome extension and the original JSMinesweeper solver.

## Prerequisites

1. Load the extension in Chrome (Developer mode)
2. Navigate to minesweeper.online
3. Open Chrome DevTools (F12)

## Test Steps

### 1. Verify Solver Scripts Load

1. Go to minesweeper.online
2. Open DevTools Console
3. Look for these messages:
   ```
   Minesweeper Replay Analyzer: Content script loaded
   All solver scripts loaded
   JSMinesweeper solver adapter initialized
   ```

### 2. Test Board Data Extraction

1. Start a game on minesweeper.online (any difficulty)
2. In DevTools Console, run:
   ```javascript
   // Check if analyzer is available
   console.log('Analyzer:', analyzer);
   
   // Check board data
   console.log('Board data:', analyzer.boardData);
   ```

Expected output:
- Board data should show width, height, mines, difficulty, and cells array
- Each cell should have x, y, state, value, isFlagged, isMine properties

### 3. Test Solver Integration

1. With a game in progress, run in Console:
   ```javascript
   // Test solver availability
   console.log('Solver:', analyzer.solver);
   
   // Manually trigger analysis
   analyzer.updateAnalysis();
   ```

2. Check for analysis results:
   ```javascript
   // After analysis completes
   console.log('Analysis result:', analyzer.analysisResult);
   ```

Expected output:
- Solver should be an ExtensionSolverAdapter instance
- Analysis result should contain success, actions, safeMoves, mineProbabilities

### 4. Test Visual Overlays

1. After running analysis, check for visual elements:
   - Probability overlays on cells (if enabled)
   - Safe move highlights (green borders)
   - Best guess highlights (yellow borders)

2. Use the analyzer panel buttons:
   - "Analyze Position" - should trigger analysis
   - "Show Probabilities" - should toggle probability display
   - "Refresh Board" - should re-extract board data

### 5. Test with Different Difficulties

Repeat tests with:
- Beginner (9×9, 10 mines)
- Intermediate (16×16, 40 mines)  
- Expert (30×16, 99 mines)

### 6. Test Replay Mode

1. Go to a replay on minesweeper.online
2. Verify replay mode detection:
   ```javascript
   console.log('Replay mode:', analyzer.isReplayMode);
   ```
3. Step through replay and verify analysis updates

### 7. Test Failed Game States

1. Find a failed game replay or lose a game intentionally
2. Check that mines are properly detected:
   ```javascript
   // Check for mine detection in failed games
   const mines = analyzer.boardData.cells.filter(cell => cell.isMine);
   console.log('Detected mines:', mines.length);
   console.log('Mine cells:', mines);
   ```
3. Verify that `hd_type10` (mine) and `hd_type11` (exploded mine) are parsed correctly

## Expected Behavior

### Successful Integration
- ✅ All solver scripts load without errors
- ✅ Board data extraction works for all difficulties
- ✅ Solver produces valid analysis results
- ✅ Visual overlays display correctly
- ✅ Analysis updates in real-time during replay

### Common Issues

#### Scripts Not Loading
- Check manifest.json web_accessible_resources
- Verify file paths in content.js
- Check for CORS or security errors

#### Solver Errors
- Check if Board/Tile classes are available
- Verify board data format matches expected structure
- Look for JavaScript errors in solver files

#### No Visual Overlays
- Check CSS is loaded
- Verify overlay positioning logic
- Check if probability data exists

## Debug Commands

```javascript
// Check what's available globally
console.log('Available classes:', {
  Board: typeof Board,
  Tile: typeof Tile,
  Solver: typeof Solver,
  ExtensionSolverAdapter: typeof ExtensionSolverAdapter
});

// Test board creation manually
const testBoard = new Board(9, 9, 10);
console.log('Test board:', testBoard);

// Test solver creation
const testSolver = new ExtensionSolverAdapter();
console.log('Test solver:', testSolver);

// Check board data structure
if (analyzer.boardData) {
  console.log('Board dimensions:', analyzer.boardData.width, 'x', analyzer.boardData.height);
  console.log('Mine count:', analyzer.boardData.mines);
  console.log('Cell count:', analyzer.boardData.cells.length);
  console.log('Sample cell:', analyzer.boardData.cells[0]);
  
  // Check for mine detection in failed games
  const mines = analyzer.boardData.cells.filter(cell => cell.isMine);
  console.log('Detected mines:', mines.length);
  if (mines.length > 0) {
    console.log('Mine positions:', mines.map(m => `(${m.x},${m.y})`));
  }
}
```

## Success Criteria

- [ ] All solver scripts load successfully
- [ ] Board data extraction works for all standard difficulties
- [ ] Solver produces analysis results without errors
- [ ] Visual overlays display probability information
- [ ] Safe moves are highlighted correctly
- [ ] Analysis updates during replay navigation
- [ ] Mine detection works correctly in failed games (hd_type10, hd_type11)
- [ ] No console errors during normal operation

## Next Steps

Once integration testing passes:
1. Test with complex board positions
2. Verify probability accuracy against known solutions
3. Performance testing with large boards
4. Integration with replay system
5. UI/UX improvements based on testing feedback 