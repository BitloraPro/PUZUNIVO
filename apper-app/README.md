# Apper PUZUNIVO — MegaRush 3D

This folder is a source snapshot of the **existing PUZUNIVO Apper project** (`puzunivo-competent`), copied into the parent `BitloraPro/PUZUNIVO` repository on 2026-10-14. It does not replace the repository root's independent Node.js/SQLite game.

## Start the latest MegaRush 3D locally without Apper SDK (Termux / desktop)

For the **standalone 3D practice game**, use the dedicated entrypoint. It imports the same `src/pages/MegaRush.jsx` and `src/lib/megarushEngine.js` as the Apper copy, but skips the Apper SDK and database:

```sh
# From the GitHub repository root (recommended):
cd ~/PUZUNIVO
git pull --ff-only
bash start-megarush-local.sh
```

Or, while already in `apper-app`:

```sh
npm install --no-audit --no-fund
npm run megarush:local
```

Open **http://127.0.0.1:5173/megarush-local.html**. On a phone rotate to **landscape**. Keep the terminal running. If an earlier Node server is still running on `localhost:3000`, don't open that address: it serves the **old** game, not this entrypoint. This is a standalone practice game: no Apper login, remote mission verification, backend balances or reward grants are available.

To independently build the standalone game: `npm run megarush:build` (output `dist-local/`). The authenticated Apper app requires the platform-provided environment and SDK, not this special local entrypoint.

## Run the frontend locally

1. Install Node.js and run `npm install` **inside this folder**.
2. Obtain the correct **public** configuration for a separate development environment from your Apper project; place it in a local `.env` file. Never commit secrets or use a production administrator token in the browser.
3. Run `npm run dev`, then open the displayed development URL.
4. Run `npm run build` for a frontend bundle, or `npm test` for the included standalone puzzle-engine tests.

**Live Apper project preview:** https://preview--puzunivo-competent.apper.so

## Current state

- The original web preview deploy reported a successful build for commit `2db7743ddaae308734d0096a06899807e577c315`.
- Source includes the playable WebGL2 3D `/megarush` page and engine, sunset/coastal city, board riding, touch controls, HUD, police chase, traffic, helicopter and Harbor checkpoint.
- `src/pages/Home.jsx` and `src/pages/Games.jsx` send visitors to `/megarush`; other puzzle/Admin pages and the project database have been preserved.
- The Harbor chase in this Apper frontend is a **local practice** session. The GitHub repo root has a separate server-verified chase system; the two backends are **not integrated**. Coins and XP show dashes, not fabricated values.
- This is stylized procedural 3D, **not** reference-video-equivalent photorealism. Native Android visual tests and signed APK have not been completed.

## Security and asset notes

- The Apper platform-injected `.env` and any private credentials were deliberately **excluded** from GitHub. Obtain configuration through your own Apper environment.
- `public/favicon.ico` (a binary asset) is intentionally excluded from this text-only connector source sync. Provide an appropriate favicon when running independently.
- This folder is independent: the repository root's `npm start`, server, tests and data remain unchanged.

## Key files

- `src/pages/MegaRush.jsx` — 3D gameplay route, controls, HUD and mission UI
- `src/pages/MegaRush.css` — reference-directed landscape visual styling
- `src/lib/megarushEngine.js` — mesh, shaders, world generation, physics and camera
- `MEGARUSH_APPER_REFERENCE_SPEC.md` — user reference acceptance brief, limitations
