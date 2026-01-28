# Android Camera Embed

This plugin is Android-only. It uses the `capture` attribute to open the Android camera and is not supported on iOS or desktop.

## Features

- Ribbon button and command palette entry to capture a photo on Android.
- Saves photos next to the note or in a configurable vault folder.
- Embeds the captured image at the cursor position.

## Install (development)

1. `npm install`
2. `npm run build`
3. Copy `manifest.json` and `main.js` into your vault:
   `.obsidian/plugins/android-camera-embed`

## Settings

- **Photos folder**: vault-relative path (e.g. `Attachments/Camera`). Leave blank to store next to the note.
- **Create folder if missing**: auto-create the folder if it doesn't exist.

## Publishing

1. `npm run build`
2. `npm run dist` to produce `dist/` for release.

## License

MIT
# obsidian-android-camera
