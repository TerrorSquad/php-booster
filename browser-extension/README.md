# Dark Mode Toggle — Browser Extension

A cross-browser extension (Firefox & Chrome) that lets you toggle dark mode on any website and choose from multiple color schemes.

## Features

- **One-click dark mode** toggle for any website
- **Six color schemes** to choose from:
  - **Default Dark** — balanced dark theme with blue accents
  - **Solarized Dark** — the classic Solarized palette
  - **Nord** — cool, arctic-inspired tones
  - **Dracula** — popular dark theme with vibrant accents
  - **Midnight Blue** — deep navy dark mode
  - **Sepia** — warm, paper-toned dark mode
- **Instant preview** — changes apply immediately without page reload
- **Persistent settings** — your choice is remembered across sessions
- **Manifest V3** — compatible with both Firefox (≥ 109) and Chrome

## Installation

### Firefox (Developer / Temporary)

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on…**.
3. Select `browser-extension/manifest.json`.

### Chrome (Developer)

1. Open `chrome://extensions`.
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked**.
4. Select the `browser-extension/` directory.

## Usage

1. Click the extension icon in the toolbar.
2. Toggle dark mode **On** or **Off** with the switch.
3. Pick a color scheme from the list — it applies instantly to the current page.

## File Structure

```
browser-extension/
├── manifest.json    # Extension manifest (v3)
├── background.js    # Service worker — initializes default state
├── content.js       # Content script — injects dark mode CSS
├── popup.html       # Popup UI markup
├── popup.css        # Popup styles
├── popup.js         # Popup logic (toggle + scheme selection)
├── icons/           # Extension icons (16, 48, 128 px)
└── README.md        # This file
```

## Development

No build step is required — the extension runs from source files directly.

To make changes:
1. Edit the source files.
2. Reload the extension in `about:debugging` (Firefox) or `chrome://extensions` (Chrome).
