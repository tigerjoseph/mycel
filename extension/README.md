# Mycel Saver (Chrome extension)

Save posts, images, and quotes straight into Mycel's Library → Mindspace, without leaving the browser.

## Install (unpacked)

Chrome extensions distributed outside the Web Store must be loaded manually in developer mode:

1. Open `chrome://extensions` in Chrome (or any Chromium browser — Edge, Brave, Arc all work).
2. Turn on **Developer mode** (top-right toggle).
3. Click **Load unpacked**.
4. Select this `extension/` folder.
   - In the packaged Mycel app, use **Settings → Browser extension → Reveal extension folder** to open it in Finder.
   - In a dev checkout, it's `extension/` at the repo root.
5. Pin the "Mycel Saver" icon to your toolbar (optional).

## Requirements

- **Mycel must be running** on the same Mac. The extension talks to a local server at `http://127.0.0.1:17321` — it never leaves your machine.
- The first save (or opening the extension popup) pairs the extension with Mycel by fetching a connection token from `/health`. No login or account needed.

## Using it

- **Instagram**: open instagram.com, hover any post and click the **+ Mycel** button that appears in the corner. Images, video, caption, and the profile name are captured automatically and tagged.
- **Any page**: click the toolbar icon, or press `⌘⇧S` (`Ctrl+Shift+S` on Windows/Linux), to save the current tab.
- **Images**: right-click any image → **Save image to Mycel**.
- **Selected text**: select text on any page, right-click → **Save quote to Mycel**.

Saved items show up immediately in Mycel under **Library → Mindspace**.

## Troubleshooting

- Popup says "Open Mycel on your Mac first" → launch the Mycel app and try again; the extension retries the connection on every save attempt.
- Nothing happens on Instagram → refresh the tab after installing/reloading the extension so the content script attaches.
- Still stuck → in Mycel, check **Settings → Browser extension** for the port and connection status.

## Files

| File | Purpose |
|------|---------|
| `manifest.json` | Extension manifest (MV3) — permissions, content scripts, commands |
| `background.js` | Service worker — owns the token, talks to `127.0.0.1:17321`, context menus, shortcut handling |
| `instagram.js` / `instagram.css` | Content script that injects the **+ Mycel** hover button on Instagram posts |
| `popup.html` / `popup.js` | Toolbar popup — connection status + "Save this tab" |
