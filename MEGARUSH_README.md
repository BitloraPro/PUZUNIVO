> Current local milestone: v0.6.0 code verification (at least 46 automated tests); APK **not** compiled, Android GPU **not** tested, Apper **not** deployed.

# MegaRush: The Multi-Verse Map — PUZUNIVO Fifth Game

**Delivery:** self-contained, playable **WebGL2 low-poly open-world vertical slice** integrated into the existing PUZUNIVO independent Node/SQLite foundation. **Not deployed to the Apper cloud app.** No generated mockups replace source code, and there are no fake cash rewards, real-money withdrawals or fictional business metrics.

## Start now (Node.js 22+)

There are **no npm packages to install** for this independent web build. It uses Node's built-in SQLite.

```bash
cd puzunivo-app
npm test
# Create a secure admin account only on first boot:
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='PUT_YOUR_OWN_PRIVATE_12_PLUS_CHARACTER_PASSWORD_HERE' npm start
```

**Windows PowerShell:**

```powershell
cd puzunivo-app
npm test
$env:ADMIN_EMAIL='you@example.com'
$env:ADMIN_PASSWORD='YOUR_OWN_LONG_PRIVATE_PASSWORD_HERE'
npm start
```

Open:

- **PUZUNIVO player dashboard:** http://localhost:3000
- **MegaRush playable 3D game:** http://localhost:3000/megarush
- **Main Admin:** http://localhost:3000/admin
- **MegaRush secure Live-Ops Admin:** http://localhost:3000/admin/megarush

Select **Continue as Guest** (automatically when starting MegaRush) or sign in with a real PUZUNIVO account. The player Home and Games pages now display only MegaRush. Old puzzle data and code remain intact for safe rollback. Lawful free roaming does not automatically generate police pursuit; vehicle theft and reckless vehicle collisions are incident-triggered, recorded server-side. Existing account, sessions, and coin balances remain the sole identity/economy source. Any existing `data/puzunivo.sqlite` continues to work: MegaRush tables are created with `CREATE TABLE IF NOT EXISTS` without destroying the current schema.

## Real, currently implemented behavior

| Feature | What the executable code does |
|---|---|
| WebGL world | WebGL2 renderer, original colorful low-poly city/roads, varied buildings, rooftop obstacles, skate ramps and rails, parking lot, forest/peaks, beach and ocean; no CDN dependency for 3D engine |
| Characters | Rylee (blue hair/pink hoodie), Zara (parkour theme), Leo (BMX theme), persistent selection, customizable board skin and virtual cosmetic store |
| Controls | Keyboard + mobile analog joystick, landscape orientation guidance, camera drag and hold-to-sprint; smooth acceleration, realistic walking/skating/vehicle speeds, jumps, simple climb control, swimming/dive, weather-based road friction |
| Traffic / pedestrians | Procedurally moving low-poly vehicles and walkers, simple collisions, vehicle access near traffic, pursuit-triggered police car with bounded AI chase and contact damage |
| World events | Day/night lighting, rain, fog, collectable glowing objects, audio feedback (optional), simplified 3D stunts |
| Progression | 10 named chapters, 50 server-level slots each = **500 progressive zones**; repeatable procedural world variations rather than 500 hand-built maps |
| Game economy | Nonredeemable Fun Coins from server-saved game completions; unique completion constraint; virtual-only cosmetic purchases, no payouts |
| Player data | Reuses PUZUNIVO sessions/users; new MegaRush progress, sessions, pickups and cosmetics persist in same SQLite DB |
| Admin | Authenticated role-gated Live-Ops settings, player ban/unban/reset, actual activity/session counts, chapter distribution, virtual store pricing, announcement publishing |
| Monetization hooks | Provided AdMob app/rewarded/interstitial IDs plus optional native plugin interface; Google test IDs by default. **No actual AdMob in browser, no real-money IAP.** |
| Tests | Sixteen automated tests cover original four puzzles, account/Admin protection, MegaRush APIs, in-place schema migration, stable pickups, camera-relative input and WebGL renderer interface |

## Controls

| Input | Action |
|---|---|
| WASD / arrow keys | Directional movement |
| Space | Jump |
| B | Toggle skateboard |
| E | Enter/exit nearby traffic car |
| K | Kickflip while skating |
| R | Climbing assistance during a jump |
| V | Dive in water |
| M | Procedural sound on/off |
| Escape | Pause/menu |
| On-screen touch controls | Mobile movement, jumping, skating and vehicle controls |

**Server-verified progression:** The server issues a random run ID, grants pickups only once for recognized collectible IDs and at a reasonably close last validated position, checks session duration and collectible count, and saves completed levels only once. This is basic anti-cheat, **not security against sophisticated multiplayer exploit clients**. Real-money processing cannot be based on this telemetry; the product explicitly excludes cash rewards.

## Directory structure

```text
puzunivo-app/
  server.mjs                     Existing PUZUNIVO server, minimal import and route wiring
  logic.mjs                      Original four puzzle engines (unchanged)
  megarush-api.mjs               MegaRush tables, routes, validation, 10 chapters, Live-Ops
  public/
    index.html                   Existing PUZUNIVO home (same)
    app.js                       Fifth MegaRush card linked into existing dashboard
    admin.js                     MegaRush entry in existing Admin navigation
    style.css                    One new branded MegaRush card style
    megarush/
      index.html                 Fifth game's playable screen
      game.css                   Responsive premium UI/HUD/touch controls
      game.js                    Gameplay lifecycle, progress, pickups, locker, store
      engine.js                  Self-contained WebGL2 mesh/world/character/vehicle physics
      native-monetization.js     Optional Capacitor AdMob hooks, test units by default
      admin.html                 Standalone secure MegaRush control page
      admin.css                  Admin styling
      admin.js                   Working admin Live-Ops UI
  mobile/
    capacitor.config.ts          Capacitor wrapper scaffold (not yet compiled)
    README.md                    Native AdMob App ID/manifest and verified billing steps
  test/
    logic.test.mjs               Original puzzle engine tests
    api.test.mjs                 Original PUZUNIVO API tests
    megarush.test.mjs            Real MegaRush API/auth/physics checks
  data/                          SQLite DB files, ignored by git and absent from ZIP
```

## Live-Ops keys & effects

- `weather`: clear/rain/fog/cycle; affects rendering and rain traction.
- `trafficDensity`, `pedestrianDensity`: control rendered vehicles and pedestrians.
- `collectibleDensity`: controls server-issued pickup count in next run.
- `difficultyMultiplier`: scales required collectibles in next run.
- `dayCycleMinutes`: changes daylight speed.
- `banner` and announcements: appear in game; clients poll roughly every 25 seconds.
- `shopPrices`: server-validated mutable cosmetic costs in Fun Coins.

## What is **NOT** done and must not be claimed

- No direct changes to Apper-hosted PUZUNIVO, because Apper message quota prevented writes. The included source is an independent local foundation copy provided in this conversation context and does not overwrite Apper or Bitlora.
- This is a low-poly gameplay **vertical slice**, not an AAA open world. Missing: sophisticated vehicle hijack animations, realistic wall-running physics, high-fidelity cinematic character models, production NPC pathfinding, persistent vehicle ownership/garages, full underwater caves, multiplayer, procedural audio radio stations with licensed songs, professional-level quest art/QA for all 500 zones, and measured 60 FPS on all devices.
- No native APK/AAB and no on-device AdMob validation. The supplied IDs are public config for future native packaging only; ads never show in this web app.
- No Google Play Billing purchases, refunds or verified financial logs, and no real money rewards. Virtual cosmetics work from coins only.
- Not hardened as a public production financial app: backend should receive stronger abuse rate-limits, proxy deployment, encrypted backups, secure cookie/TLS, user privacy/retention controls and production monitoring before broad distribution.
- Browser navigation was blocked by the execution environment during attempted screenshot QA; no pixel-perfect browser or GPU runtime certification is asserted.

## Security

Do **not** ship demo passwords, store SQLite files in git, add fake reward callbacks, run production without HTTPS, or expose the Admin password. Production AdMob requires native app verification, UMP consent and server-side validation for any cloud-based ad reward. Native setup details are in `mobile/README.md`.

## Landscape 3D gameplay — 2026-10-13 update

- Gameplay uses a fixed full-viewport landscape HUD, analog joystick, separate touch actions, camera orbit by dragging the scene, speed display, an objective bar, and a rotate-device prompt. Browser orientation lock is *best effort*; an installed Android host must set `screenOrientation=landscape` natively.
- Sprint with Shift on keyboard or press-and-hold Sprint on mobile. Rylee has an identifiable blue-hair/dark-jacket/neon-green-board mesh. Roads gained lamp posts, street crossings, palms, harbor details; pursuit can now cost health through collisions.
- On desktop, WASD, arrows, Space, B, E, K, R, M and drag-to-orbit remain supported.
- This package is an updated local playable 3D slice. It is **not** the cinematic photorealistic scene in the illustrative AI-generated reference, and **not** a completed multiplayer open-world game or an Android APK. Full fidelity needs authored 3D models/animations, licensed or custom textures, polished audio, animations, world streaming and real-device performance testing.
- Apper cloud cannot be patched while the app connector is message-limited. The preexisting online dashboard/admin remain untouched. **Do not overwrite that app with this separate local copy.**


## 0.3.0 gameplay additions

- Analog movement relative to the camera view, with orbit drag and Sprint.
- Real localized minimap with street geometry, avatar heading, uncollected shards and chase marker.
- On-screen pointing arrow and distance to the nearest light shard.
- Harbor bridge, ferris wheel and illuminated windows; appearance changes with selected cosmetics and weather/daylight. **Still low-poly; not equal to cinematic promotional artwork.**
- Reachable deterministic spawns, immutable per-session difficulty and spawn counts, serialized position heartbeats before collecting.
- Schema migration is additive: old session records get default `required_orbs` and `pickup_count` columns, and new runs snapshot their specific values.
- Version 0.3.0 test result: **16/16 passing**, with device-GPU testing outstanding.


## Latest v0.4.0 additions

- Procedural **real 3D articulated avatar** + animated arms/legs/hair/face/clothes/board, upgraded close vehicles, animated police lights, distance-based LOD and adaptive-resolution frame control.
- Physics-controlled building/shoreline and traffic crashes with cooldown, no render-tick damage.
- Same PUZUNIVO server native **Android Debug APK build project**, path `mobile/android-native/`. The verified source package contains the Android Java/Gradle source and GitHub Actions recipe, **not** a compiled APK. A real already-hosted HTTPS PUZUNIVO backend is required to use a debug build.
- `npm run check && npm test` now expects **23 passing automated tests**.
- No claim of photorealistic visual parity, Android GPU QA, compiled APK, Apper deployment, production ads or Play Store approval. Read `IMPLEMENTATION_STATUS.md` for full limitations.


### v0.4.2 continuation

The primary game's code now includes a physically traversable coastal highway and optional active **Harbor Chase** mission. Enter a near unoccupied traffic car to trigger a pursuit, drive along the central coast causeway towards the real `(x=0,z=112)` harbor gate, follow its dynamically calculated waypoint, and arrive to end the chase. Escaping does not grant fabricated currency. The same progression/coin DB and Admin remain authoritative. A 3D kickflip, building-safe camera, sun/ambient shading and stronger Android navigation are source-backed but not phone-render tested. `npm run check && npm test` runs 33 tests.
