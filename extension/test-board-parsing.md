# Testing Board Parsing

## Quick Test Steps

### 1. Load Extension
1. Go to `chrome://extensions/`
2. Load the extension in developer mode
3. Navigate to `https://minesweeper.online`

### 2. Test Board Detection

#### Test on Beginner (9x9, 10 mines)
1. Go to minesweeper.online
2. Select "Beginner" difficulty
3. Start a game
4. Open extension popup
5. ✅ Should show: "Board: 9×9, 10 mines (beginner)"

#### Test on Intermediate (16x16, 40 mines)
1. Select "Intermediate" difficulty
2. Start a game
3. Check popup
4. ✅ Should show: "Board: 16×16, 40 mines (intermediate)"

#### Test on Expert (30x16, 99 mines)
1. Select "Expert" difficulty
2. Start a game
3. Check popup
4. ✅ Should show: "Board: 30×16, 99 mines (expert)"

### 3. Test Cell State Detection

#### Test Revealed Cells
1. Start any game and make some moves
2. Open browser console (F12)
3. Look for "Board data extracted:" log
4. ✅ Should show cells with:
   - `state: 'revealed'` for opened cells
   - `value: X` (0-8) for number cells
   - `state: 'hidden'` for unopened cells

#### Test Mine Counter Reading
1. Start a game
2. Place some flags (right-click)
3. Check console logs
4. ✅ Mine counter should update correctly

### 4. Test Replay Mode Detection

#### Test Replay Detection
1. Find any completed game replay on minesweeper.online
2. Open the replay
3. Check extension popup
4. ✅ Should show "Mode: Replay"
5. ✅ Should detect replay controls

#### Test Replay Analysis
1. In a replay, use step controls
2. Check console for "Board changed, re-extracting data..."
3. ✅ Board should update as you step through

### 5. Console Debugging

Open browser console and look for these logs:

```
✅ "Minesweeper Replay Analyzer: Content script loaded"
✅ "Setting up Minesweeper Analyzer..."
✅ "Replay mode detected: true/false"
✅ "Extracting board data..."
✅ "Board data extracted:" + object with board info
✅ "Board observer set up on:" + element
```

### 6. Expected Board Data Structure

The extracted board data should look like:
```javascript
{
  width: 9,           // Board width
  height: 9,          // Board height  
  mines: 10,          // Total mines
  difficulty: "beginner", // Detected difficulty
  cells: [            // Array of cell objects
    {
      x: 0, y: 0,
      state: "hidden",     // "hidden", "revealed", "flagged"
      value: 0,            // 0-8 for revealed cells
      isFlagged: false,
      isMine: false,
      element: DOMElement  // Reference to DOM element
    },
    // ... more cells
  ],
  isReplay: false     // Whether in replay mode
}
```

### 7. Troubleshooting

#### Board not detected:
- Check if you're on minesweeper.online
- Try refreshing the page
- Check console for errors

#### Wrong dimensions:
- Verify the difficulty selector shows correct level
- Check if custom board is being used

#### Cells not parsing:
- Look for "Cell not found" warnings in console
- Check if page structure has changed

#### Mine count wrong:
- Check if mine counter elements exist
- Verify the digit extraction is working

### 8. Manual Testing Commands

Open browser console on minesweeper.online and run:

```javascript
// Test difficulty detection
console.log('Active level:', document.querySelector('.level-select-link.active')?.textContent);

// Test cell detection
console.log('Cells found:', document.querySelectorAll('[id^="cell_"]').length);

// Test mine counter
console.log('Mine counter elements:', {
  hundreds: document.querySelector('#top_area_mines_100')?.className,
  tens: document.querySelector('#top_area_mines_10')?.className,
  ones: document.querySelector('#top_area_mines_1')?.className
});

// Test board container
console.log('Board container:', document.querySelector('#AreaBlock'));
```

### 9. Success Criteria

✅ Correctly detects all three standard difficulties  
✅ Accurately parses board dimensions  
✅ Reads mine count from display  
✅ Extracts cell states (hidden/revealed/flagged)  
✅ Detects replay mode  
✅ Updates board state during replay playback  
✅ Shows board info in popup  
✅ No console errors during normal operation  

### 10. Test Failed Game States

#### Test Mine Detection in Failed Games
1. Find a failed game replay or lose a game intentionally
2. Open browser console and run:
   ```javascript
   // Check for mine detection
   const mines = analyzer.boardData.cells.filter(cell => cell.isMine);
   console.log('Detected mines:', mines.length);
   console.log('Mine positions:', mines.map(m => `(${m.x},${m.y})`));
   
   // Check specific mine types
   const type10Cells = document.querySelectorAll('.hd_type10'); // Regular mines
   const type11Cells = document.querySelectorAll('.hd_type11'); // Exploded mine
   console.log('Type 10 (mines):', type10Cells.length);
   console.log('Type 11 (exploded):', type11Cells.length);
   ```
3. ✅ Should correctly identify mines with `isMine: true`
4. ✅ Should handle both `hd_type10` (mine) and `hd_type11` (exploded mine)

### 11. Next Steps

Once board parsing is working:
1. Test with actual JSMinesweeper solver integration
2. Implement probability display overlays
3. Add move analysis and highlighting
4. Test performance with larger boards 