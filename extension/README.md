# Minesweeper Replay Analyzer Chrome Extension

A Chrome extension that analyzes Minesweeper replays on minesweeper.online using the JSMinesweeper solver engine. Get probability calculations, mistake detection, and improve your Minesweeper skills!

## Features

- 🎯 **Real-time Board Analysis**: Automatically detects and parses board state from minesweeper.online
- 📊 **Comprehensive Board Detection**: Supports all standard difficulties (Beginner, Intermediate, Expert)
- 🔍 **Replay Analysis**: Detects replay mode and monitors board state changes
- ⚡ **Live Board Parsing**: Extracts cell states, mine count, and board dimensions in real-time
- 📈 **Smart Detection**: Automatically identifies difficulty level and board configuration
- 🎮 **Seamless Integration**: Works directly on minesweeper.online with minimal performance impact

## Current Status

### ✅ Phase 1.1: Chrome Extension Setup (Complete)
- Chrome extension structure with Manifest V3
- Content script injection and background service worker
- Popup interface with settings and controls
- Proper permissions and security setup

### ✅ Phase 1.3: Board State Detection & Import (Complete)
- **Board Detection**: Automatically detects board dimensions and difficulty
- **Cell State Parsing**: Extracts hidden/revealed/flagged states from DOM
- **Mine Counter Reading**: Reads mine count from game display
- **Replay Mode Detection**: Identifies when viewing replays vs. active games
- **Real-time Updates**: Monitors board changes during replay playback
- **Multi-difficulty Support**: Handles Beginner (9×9), Intermediate (16×16), Expert (30×16)

### ✅ Phase 1.2: JSMinesweeper Integration (Complete)
- **✅ Core Solver Integration**: All JSMinesweeper components copied and integrated
- **✅ Extension Adapter**: `ExtensionSolverAdapter` bridges extension and solver
- **✅ Script Loading**: Sequential loading ensures proper dependency resolution
- **🧪 Ready for Testing**: Use `test-solver-integration.md` for comprehensive testing

### 🚧 Next: Phase 2.1: Real-time Analysis & Visualization
- Connect solver to live board analysis
- Implement probability overlays and move suggestions
- Optimize performance for real-time analysis

## Installation

### From Source (Development)

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the `extension` folder
5. The extension should now appear in your extensions list

## Testing the Board Parser

### Quick Test
1. Load the extension in Chrome
2. Navigate to `https://minesweeper.online`
3. Start any difficulty game
4. Click the extension icon - you should see board info like "Board: 9×9, 10 mines (beginner)"
5. Check browser console for detailed parsing logs

### Detailed Testing
See `test-board-parsing.md` for comprehensive testing instructions including:
- Testing all difficulty levels
- Verifying cell state detection
- Testing replay mode detection
- Console debugging tips

## Technical Implementation

### Board Parsing Architecture
```javascript
// Extracted board data structure
{
  width: 9,              // Board dimensions
  height: 9,
  mines: 10,             // Total mine count
  difficulty: "beginner", // Detected difficulty
  cells: [               // Array of cell objects
    {
      x: 0, y: 0,         // Cell coordinates
      state: "hidden",    // "hidden", "revealed", "flagged"
      value: 0,           // 0-8 for revealed number cells
      isFlagged: false,   // Flag state
      isMine: false,      // Mine state (in completed games)
      element: DOMElement // Reference to DOM element
    }
  ],
  isReplay: false        // Replay mode detection
}
```

### Detection Methods
- **Difficulty Detection**: Active level selector, URL patterns, board size fallback
- **Cell State Detection**: CSS class analysis (`hd_closed`, `hd_opened`, `hd_typeX`)
  - Handles `hd_type0` through `hd_type8` for number cells
  - Handles `hd_type10` for mines in failed games
  - Handles `hd_type11` for exploded mines
- **Mine Counter**: Digital display parsing from game UI elements
- **Replay Detection**: DOM structure analysis and URL patterns
- **Board Monitoring**: MutationObserver for real-time updates

### Browser Compatibility
- Chrome 88+ (Manifest V3 support required)
- Edge 88+ (Chromium-based)

## Development

### Project Structure
```
extension/
├── manifest.json              # Extension configuration
├── src/
│   ├── content.js            # Board parsing and analysis logic
│   ├── content.css           # Overlay and UI styles
│   └── background.js         # Background service worker
├── popup/
│   ├── popup.html            # Extension popup interface
│   ├── popup.css             # Popup styles
│   └── popup.js              # Popup functionality
├── test-board-parsing.md     # Board parsing test guide
└── README.md                 # This file
```

### Key Components

#### Content Script (`src/content.js`)
- **MinesweeperAnalyzer Class**: Main analyzer with board parsing
- **Board Detection**: Multi-method difficulty and dimension detection
- **Cell Parsing**: Comprehensive cell state extraction
- **Replay Monitoring**: Real-time board state tracking
- **UI Integration**: Overlay panel with board information

#### Popup Interface (`popup/`)
- **Connection Status**: Shows if extension is active on minesweeper.online
- **Board Information**: Displays detected board dimensions and settings
- **Analysis Controls**: Buttons for manual analysis and settings
- **Settings Management**: Persistent user preferences

## Console Debugging

When testing, look for these console messages:
```
✅ "Minesweeper Replay Analyzer: Content script loaded"
✅ "Setting up Minesweeper Analyzer..."
✅ "Extracting board data..."
✅ "Board data extracted:" + detailed board object
✅ "Board observer set up on:" + DOM element
```

## Troubleshooting

### Board Not Detected
- Ensure you're on minesweeper.online
- Try refreshing the page
- Check browser console for errors
- Verify extension is loaded in developer mode

### Wrong Board Information
- Check if correct difficulty is selected
- Look for "Cell not found" warnings in console
- Verify mine counter elements are present

### Replay Mode Issues
- Ensure replay has loaded completely
- Check for replay control elements in DOM
- Try stepping through replay manually

## Roadmap

### Phase 2: Real-time Analysis & Visualization (Next)
- [ ] Connect solver to live board analysis
- [ ] Implement probability overlays on board cells
- [ ] Add safe move highlighting and best guess recommendations
- [ ] Optimize performance for real-time analysis

### Phase 3: Analysis & Visualization
- [ ] Real-time probability overlays
- [ ] Safe move highlighting
- [ ] Best guess recommendations
- [ ] Move quality assessment

### Phase 4: Advanced Features
- [ ] Mistake detection and analysis
- [ ] Efficiency rating system
- [ ] Move history tracking
- [ ] Performance statistics

## Contributing

1. Fork the repository
2. Test the current board parsing functionality
3. Create a feature branch for JSMinesweeper integration
4. Submit a pull request with comprehensive testing

## License

This project is licensed under the MIT License - see the main repository for details.

## Acknowledgments

- Built on top of [JSMinesweeper](https://github.com/davidnhill/JSMinesweeper) by David Hill
- Designed for use with [minesweeper.online](https://minesweeper.online)
- Board parsing implementation based on minesweeper.online DOM structure analysis 