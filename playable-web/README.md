# MEGARUSH — play now in a browser

This is a **NEW** mobile/desktop browser-playable game in `playable-web/`, separate from the Unity cross-platform source foundation in the repository root. It does not use the deleted old Puzunivo Node/SQLite/Apper low-poly engine.

## Run on Android Termux (free)
```bash
pkg install -y git nodejs
cd ~/PUZUNIVO
git pull --ff-only
bash start-playable-web.sh
```
In Chrome on the **same phone**, open http://127.0.0.1:5173/ and tap **START HARBOR CHASE**. This project intentionally does **not** open port 3000 or run the old game. The first run installs npm dependencies (internet required).

## Controls
Android: analog joystick; drag the game world to rotate the camera; Sprint hold; Jump, Trick, Board, Vehicle, Pause buttons. Portrait is supported; landscape provides more space.

Windows: WASD or arrow keys to move, Shift sprint, Space jump, K trick, B swap board, V enter/exit vehicle, Esc pause, mouse drag to look.

## Realistic scope
Imported glTF character and realistic car are loaded from official Khronos assets; procedural scene fills the city around them. This is an initial **playable 3D prototype**, not a photorealistic match to the supplied cinematic game video. No gameplay completion or real device performance is asserted until user tests. Model loading needs working HTTPS/CORS. See [ASSET_CREDITS.md](./ASSET_CREDITS.md).

## Build & output
```bash
cd playable-web
npm install --no-audit --no-fund
npm run check
npm run build
```
The GitHub workflow uploads a compiled static HTML/WebGL build artifact. If repository Pages is enabled to use GitHub Actions, a browser-playable hosted URL will also be published automatically. A GitHub Actions source build is not a browser GPU test. The Unity root project and PS5 route remain separate and unfinished.
