# Testing Automatic Board State Detection & Probability Display

## Quick Test Steps

### 1. Load Extension and Navigate to Minesweeper
1. Load the extension in Chrome (Developer mode)
2. Navigate to `https://minesweeper.online`
3. Open Chrome DevTools (F12) to monitor console logs

### 2. Test Automatic Board Detection
1. Start a Beginner game
2. Make a few moves to reveal some cells
3. ✅ Check console for:
   ```
   Minesweeper Replay Analyzer: Content script loaded
   All solver scripts loaded
   JSMinesweeper solver adapter initialized
   Board data extracted: {width: 9, height: 9, mines: 10, ...}
   Auto-analyzing board...
   ```

### 3. Test Automatic Probability Display
1. After making moves, probabilities should automatically appear on hidden cells
2. ✅ Look for colored overlays on unrevealed cells:
   - **Green "SAFE"** - Definitely safe cells (0-1% mine probability)
   - **Red "MINE"** - Definitely mines (99-100% mine probability)  
   - **Yellow "XX%"** - Uncertain cells with percentage

### 4. Test Board State Change Detection
1. Make another move in the game
2. ✅ Check console for:
   ```
   Board changed, re-extracting data...
   Board state changed, triggering analysis...
   ```
3. ✅ Probabilities should update automatically

### 5. Test Replay Mode
1. Find a replay on minesweeper.online
2. Use replay controls (play, step forward/backward)
3. ✅ Probabilities should update as you step through the replay

### 6. Test Keyboard Shortcuts
- **Ctrl+A** (or Cmd+A on Mac): Manual analysis trigger
- **Ctrl+P** (or Cmd+P on Mac): Toggle probability display on/off

### 7. Test Probability Toggle
1. Press Ctrl+P to toggle probabilities off
2. ✅ All probability overlays should disappear
3. ✅ Panel should show "Probabilities: OFF (Ctrl+P)" in red
4. Press Ctrl+P again to toggle back on
5. ✅ Probabilities should reappear
6. ✅ Panel should show "Probabilities: ON (Ctrl+P)" in green

## Expected Console Output

### Successful Initialization:
```
Minesweeper Replay Analyzer: Content script loaded
Setting up Minesweeper Analyzer...
JSMinesweeper solver adapter initialized
Replay mode detected: false
Extracting board data...
Mine counter elements: {hundreds: div#top_area_mines_100, tens: div#top_area_mines_10, ones: div#top_area_mines_1}
Extracting digit from class "hd_top-area-num0 top-area-num pull-left zoomable": 0
Extracting digit from class "top-area-num pull-left zoomable hd_top-area-num1": 1
Extracting digit from class "top-area-num pull-left zoomable hd_top-area-num0": 0
Mine counter digits: {h: 0, t: 1, o: 0}
Total mine count: 10
Board data extracted: {width: 9, height: 9, mines: 10, difficulty: 'beginner', cells: Array(81), isReplay: false}
Auto-analyzing board...
```

### Successful Analysis:
```
Updating analysis for board: {width: 9, height: 9, mines: 10, ...}
Solver: ExtensionSolverAdapter {...}
Converted solver result: {success: true, safeMoves: [...], mineProbabilities: {...}, ...}
Solver result: {success: true, ...}
Displaying analysis: {success: true, ...}
```

## Troubleshooting

### Issue: "Cannot analyze: missing board data or solver"
**Solutions:**
1. Refresh the page and try again
2. Check if you're on minesweeper.online
3. Make sure you've made at least one move to reveal cells
4. Check console for script loading errors

### Issue: Mine count shows 0
**Solutions:**
1. Check console for mine counter extraction logs
2. Verify the mine counter elements exist on the page
3. Try refreshing and starting a new game

### Issue: No probabilities displayed
**Solutions:**
1. Check if probabilities are enabled (Ctrl+P)
2. Make sure there are hidden cells adjacent to revealed cells
3. Check console for analysis errors
4. Verify solver initialization completed

### Issue: Probabilities don't update automatically
**Solutions:**
1. Check if auto-analyze is enabled in settings
2. Make sure board state actually changed
3. Check console for board change detection logs

## Debug Commands

Open browser console and run these commands:

```javascript
// Check analyzer status
console.log('Analyzer:', analyzer);
console.log('Board data:', analyzer.boardData);
console.log('Solver:', analyzer.solver);
console.log('Analysis result:', analyzer.analysisResult);

// Manual analysis trigger
analyzer.updateAnalysis();

// Toggle probabilities
analyzer.toggleProbabilities();

// Check settings
analyzer.getSettings().then(settings => console.log('Settings:', settings));

// Check for probability overlays
console.log('Probability overlays:', document.querySelectorAll('.probability-overlay').length);
```

## Success Criteria

✅ **Board Detection**
- Correctly detects board dimensions and mine count
- Works on all difficulties (Beginner, Intermediate, Expert)
- Updates when board state changes

✅ **Automatic Analysis**  
- Triggers analysis automatically when cells are revealed
- Updates probabilities in real-time during gameplay/replay
- Handles both game mode and replay mode

✅ **Probability Display**
- Shows color-coded probability overlays on hidden cells
- Updates automatically when board changes
- Can be toggled on/off with Ctrl+P

✅ **User Interface**
- Panel shows current analysis status
- Keyboard shortcuts work (Ctrl+A, Ctrl+P)
- Visual feedback for probability toggle state

✅ **Performance**
- No significant lag during analysis
- Smooth updates during replay playback
- No console errors during normal operation

## Next Steps

Once automatic analysis is working:
1. Test with complex board positions
2. Verify accuracy of probability calculations
3. Test performance with larger boards (Expert difficulty)
4. Add more advanced features (mistake detection, efficiency analysis) 