# PUZUNIVO — Independent Brain Games Platform

**Status (13 October 2026, v0.5.2):** Original four PUZUNIVO puzzle games and the fifth MegaRush WebGL2 landscape **vertical slice** are in this source tree. 40 Node/API/physics tests pass locally. Android native wrapper source and a guarded APK build workflow are included, **but there is no verified built APK, live server deployment, actual Android GPU test or cinematic-quality production assets yet**. The separately hosted Apper application has not been updated by this GitHub code push. The game depends on a compatible, owner-deployed HTTPS Node 22 backend; a debug APK pointing to the wrong site is intentionally blocked by CI.

PUZUNIVO is an original puzzle platform, independent from Bitlora/Bitlora Pro. Includes an English-language mobile-friendly web application plus separate web administration dashboard. No gambling, cash wallets, KYC, crypto rewards or fabricated live business metrics.

## MegaRush gameplay v0.5.2 — server-verified Harbor finish and wall sliding

The Harbor Escape is now a true **server-confirmed** main mission: a verified skate chase reaches the actual Harbor checkpoint and may finish the zone without collecting optional light shards. The Node/SQLite session tracks the checkpoint in the *same* `mr_sessions` record, validates bounded position/time, prevents replayed awards, and migrates the original session table additively; existing puzzle games, accounts, and Admin are unchanged. New runs save their initial skate/police pursuit state immediately so an app reload does not silently cancel it. Player movement slides along building walls rather than freezing or entering diagonal corners.

This remains a stylized WebGL2 playtest, **not** a match for the detailed cinematic concept illustration. Tests do not replace a physical Android GPU QA pass, a deployed HTTPS backend, native AdMob verification, or a real APK build.

## MegaRush gameplay v0.5.1 — skate-first harbor pursuit

New runs begin with a skateboarding Harbor Chase, a pursuer whose heat remains active until reaching the actual waterfront, and an accurate distance/progress waypoint. Camera-to-screen arrow projection was fixed. The existing WebGL2 renderer adds geometry-based helicopter patrol, offshore sailboats, illuminated far skyline and a wheel-level neon skate trail; CSS sky gains a procedural sunset disk. **This is still a stylized low-/mid-poly playtest, not the cinematic image or a finished Android APK.** Previously saved runs, four puzzle games, and the shared Admin are preserved.

## MegaRush gameplay v0.5 mobile playtest improvements

The v0.5 update fixes left/right touch movement relative to the actual on-screen camera handedness, reduces the chase-camera distance from 13.8m to 7.9m on foot/skate, increases responsive walking/skating/driving movement and proportional analog control, and adds geometric neon road lights plus palm-frond silhouettes around the harbor. The gameplay HUD no longer carries a wide top menu banner that obscures the sky. These are verifiable source and automated physics changes, **not** a claim of AAA cinematic reference-image visual fidelity or Android GPU qualification.

**Termux after updating:** `git pull --ff-only`, `npm run check`, `npm test`, then restart the existing Node server. Never delete the `data/` directory: it holds the persistent player/admin accounts and game saves. If Git reports local modifications, inspect them instead of forcing a pull.

## Start on your computer, Termux, or a Node 22 server

Requirements: Node.js 22 or later. Uses Node's built-in (currently experimental in Node 22) SQLite API; **no npm install and no external packages are required**.

Linux/Android Termux/macOS:

```bash
npm run check
npm test
ADMIN_EMAIL="admin@example.com" ADMIN_PASSWORD="replace-with-a-long-private-password" npm start
```

Windows PowerShell:

```powershell
npm run check
npm test
$env:ADMIN_EMAIL="admin@example.com"
$env:ADMIN_PASSWORD="replace-with-a-long-private-password"
npm start
```

App: `http://localhost:3000`  
Admin: `http://localhost:3000/admin`

Use a **new, strong unique password at least 12 characters long**. No default admin password or credentials are included. The first admin is created when the server starts with both variables set and no corresponding email exists. Later changes to the environment password do **not** reset the existing user's password.

Choose an appropriate deployment host with persistent writable storage, HTTPS, and secure backups. Set `COOKIE_SECURE=true` when running behind a properly configured HTTPS proxy.

## Implemented features

- Responsive English PUZUNIVO mobile-first PWA with Welcome, Guest, Email Signup/Login, guest-upgrade, Dashboard, Games Catalog, Difficulty selection, gameplay, Level Results, Profile, daily-challenge overview, virtual rewards, Help/Support, account deletion, and Web Admin.
- Four independently verified game types: Number Series, One-Line Logic, Slide & Escape, and Memory Pattern.
- 3 modes per game, 30 level slots per mode. **Number Series generates 450 deterministic questions** (5 per level); other games generate a game-specific puzzle per level with varying templates. Additional content diversity and human difficulty review are required before public release.
- A single backend authoritative Lives System: 3 lives per game, 1 deducted per incorrect submitted attempt, free refill timer 15 minutes by default. **No forced advertisements**.
- Server-side validation for answers/paths/block moves/patterns. XP and virtual coins granted once per level completion; no cash value.
- Persistent profiles/progress, audit logs, player support tickets, admin authentication and configurable game enablement/refill rules.
- Metrics only from actual player records. No fabricated income or real-time activity.
- Local SQLite storage, modern responsive UI, PWA web manifest, and basic shell caching.
- Automated `npm test`: puzzle validation, path solvability, slide board solvability, memory patterns, real REST API authentication, life progression, admin controls, progress and reward non-duplication.

## Not implemented / not production ready

1. **Apper hosting/connection**: No authorized Apper connector/account was connected in the originating ChatGPT environment, so this project was not uploaded or published on Apper.
2. **Native Android/iOS builds**: This is a web/PWA app, not an Android AAB or Apple IPA. A native wrapper or Flutter port and store tests are needed.
3. **Real AdMob**: A developer account, verified mobile app, SDK, ad unit identifiers, consent flow and verified reward callback are required. Rewarded Ad button remains disabled; no fake reward is issued.
4. **In-app purchases**: Play Billing/App Store verified purchase processing not connected. No real money handled.
5. **Google Sign-In, email verification, password recovery, administrator MFA, and verified remote accounts**: not yet integrated.
6. **Production hosting and security**: Requires persistent managed database, hardened rate limiting, HTTPS, backups/restore drills, monitoring, penetration testing, operational recovery, abuse prevention and privacy/legal review.
7. **Advanced Admin Puzzle Studio**: Admin currently shows content architecture and controls games/refill, but does not offer production puzzle creation, content version publishing, or a full support CRM.
8. **Offline gameplay**: The PWA shell can be cached, but authenticated gameplay requires the server. Cloud sync across devices is not supported.
9. **Game variety/balance**: A curated, human-reviewed puzzle library and UX playtests are needed to make all 90 levels per game genuinely distinct and enjoyable.
10. **Accessibility/global readiness**: More accessible controls, localized copy, age targeting, relevant consent requirements and platform policies need final validation.

## Security notes

- Cookies are HttpOnly, SameSite=Lax; use HTTPS in production, configure reverse-proxy TLS, origin/CSRF protections and rate limits as required by your infrastructure.
- Passwords hashed with scrypt (unique per-user salts).
- SQLite file resides in `data/` unless `PUZUNIVO_DATA_DIR` is specified. **Never commit live database files or secrets to GitHub.**
- No passwords, API tokens or live player data are included in this ZIP.

## Architecture

```text
public/index.html + app.js      Mobile PWA / gamer UI
public/admin.html + admin.js    Separate responsive Admin UI
public/style.css               Shared brand tokens
server.mjs                     Node REST APIs, identity, persistent SQLite and admin roles
logic.mjs                      All four independent game rules / validators
public/sw.js                    Basic network-first shell caching
test/                           Unit and API integration tests
data/                           Runtime SQLite storage (excluded from ZIP)
```

There is a **single authoritative game catalog, lives/reward backend and progress store**; the mobile app retrieves game metadata from the server. Keep changes in their responsible module; no duplicates or hard-coded financial metrics.

## Moving this into Apper

Apper's website describes connecting the Apper service to ChatGPT and includes GitHub sync on its public roadmap. Connection, import semantics, permissions and native mobile/AdMob support must be verified inside your Apper account before a handover or publication. This source is provided as a real working foundation; do **not** claim it is deployed to Apper merely because it is packaged here.

Reference: https://apper.io/ and https://apper.io/roadmap

## Fifth game now included: MegaRush — The Multi-Verse Map

The independently runnable package now includes a fifth **WebGL2 open-world gameplay module** with its own secure Admin Live-Ops panel. See [MEGARUSH_README.md](MEGARUSH_README.md) for actual supported gameplay, controls, 500-zone architecture, security boundaries, optional native monetization scaffold and Apper handoff limitations.

## Repository build and Android limitations

- Source CI: `.github/workflows/ci.yml` runs syntax validation and unit/API tests on GitHub Actions.
- Android debug build: `.github/workflows/android-debug-megarush.yml` has manual `server_url` input. It refuses to compile if the HTTPS origin does not expose the expected PUZUNIVO MegaRush endpoints and 3D assets. Builds a **debug** APK artifact only after validating the real remote backend. A release-signed Google Play AAB is a separate, uncompleted milestone.
- Do not commit private environment settings, passwords, databases or developer signing keys to this public repository.
- The 3D model is an original procedural low-poly implementation, not an AAA capture of the visual reference. Any claims of exact visual match, Android GPU validation, or Apper deployment require independent evidence.
