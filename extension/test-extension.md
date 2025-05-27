# Testing the Chrome Extension

## Quick Test Checklist

### 1. Load Extension in Chrome
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `extension` folder from this project
5. ✅ Extension should appear in the list with no errors

### 2. Test Basic Functionality
1. Navigate to `https://minesweeper.online`
2. ✅ Content script should inject (check console for "Minesweeper Replay Analyzer: Content script loaded")
3. ✅ You should see an analyzer overlay panel in the top-right corner
4. Click the extension icon in Chrome toolbar
5. ✅ Popup should open with status information

### 3. Test Popup Interface
1. Open popup by clicking extension icon
2. ✅ Should show connection status as "Connected" when on minesweeper.online
3. ✅ Should show "Not on minesweeper.online" when on other sites
4. ✅ Settings checkboxes should be functional
5. ✅ "Analyze Current" button should be enabled when connected

### 4. Test Console Logs
Open Chrome DevTools (F12) and check console for:
- ✅ "Minesweeper Analyzer: Background service worker loaded"
- ✅ "Minesweeper Replay Analyzer: Content script loaded"
- ✅ "Setting up Minesweeper Analyzer..."

### 5. Test on Different Pages
1. ✅ Extension should only activate on minesweeper.online
2. ✅ Popup should show "disconnected" status on other sites
3. ✅ No console errors on non-minesweeper sites

## Expected Behavior

### On minesweeper.online:
- Content script loads and injects overlay
- Popup shows "Connected" status
- Analyzer panel visible in top-right
- Console shows initialization messages

### On other sites:
- No content script injection
- Popup shows "Not on minesweeper.online"
- No overlay or console messages

## Troubleshooting

### Extension won't load:
- Check manifest.json syntax
- Ensure all referenced files exist
- Check Chrome extensions page for error messages

### Content script not working:
- Check browser console for errors
- Verify minesweeper.online is accessible
- Try refreshing the page

### Popup not working:
- Check popup.html, popup.css, popup.js for syntax errors
- Verify popup files are in correct location
- Check extension popup in Chrome DevTools

## Next Steps

Once basic functionality is confirmed:
1. Test on actual minesweeper games
2. Test replay detection
3. Begin implementing board parsing
4. Integrate JSMinesweeper solver

## Development Tips

- Keep Chrome DevTools open while testing
- Use `chrome://extensions/` to reload extension after changes
- Check both page console and extension popup console for errors
- Test in incognito mode to ensure clean environment 