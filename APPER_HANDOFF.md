# Apper handoff checklist

1. Open https://apper.io/ and connect your own Apper account to ChatGPT by following Apper's documented connection flow. This action requires the account owner's consent.
2. Confirm whether Apper can import an existing Node.js + SQLite codebase or sync a repository. If only its own generated stack is supported, implement the supplied game's specs and server-side validators natively in Apper instead; do not assume direct ZIP import works.
3. Continue in the existing PUZUNIVO app/project; never create a second Admin or override the original four games. Keep Bitlora Pro separate.
4. Preserve the shared product rules: four games; three difficulties; 3 lives per game; optional, verified rewarded ad grants; free refill; single authoritative progress/rewards system; virtual rewards only; English UI; separate admin roles.
5. Adapt persistence from the local SQLite database to Apper's supported managed storage with required permission profiles, migrations and backups.
6. Verify native Android/iOS packaging and AdMob compatibility independently before claiming the final app is publishable to stores.
7. Run tests against all backend logic and independently check UI responsiveness, accessibility, identity permissions, purchases, consent and server-side ad verification.
8. No betting, casino games, crypto wallets, cash withdrawals, KYC or fabricated revenue.

## MegaRush fifth-game Apper integration — source available in this package

Apper deployment **did not occur** in this session due to the user's daily tool quota. This ZIP is the working independent Node/SQLite PUZUNIVO foundation with the new MegaRush module added in-place. Its endpoints use Node `DatabaseSync`, which **cannot simply run inside the Apper Vite browser bundle**. When Apper access resumes, port the player route to a new `src/pages/MegaRush.jsx` inside the existing Apper project and move the standalone `public/megarush/engine.js` into that module as a native WebGL component. Expose the fifth game card from `src/pages/Home.jsx` and `src/pages/Games.jsx`, not through another app.

Use the connected Apper identity (`Player_c` and `Admin_c`) and one authoritative player/wallet system. Create MegaRush-specific progression, sessions, collectibles, cosmetics, announcements and settings tables with Admin-vs-Player RLS, preserving existing tables; avoid embedding native SQLite in an Apper page. Migrate REST handlers from `megarush-api.mjs` into appropriately protected Apper backend actions/edge services, with signed rewards and one-use event semantics. Keep private answer keys and rewards logic server-side. Do not loosen Player access on unrelated puzzle content.

**Important:** A static iframe pointed at a local server is not a production integration. The local server must have a real deployed origin and secure account/session integration before it can be embedded or linked from live Apper. The bundled native AdMob scaffold is not an installed Android SDK in the Apper web preview.

## Updated after MegaRush landscape pass

Use the same existing PUZUNIVO Admin identity and Admin navigation. `/admin/megarush` in the *local* Node server is a nested management page sharing account/session controls; it is not an extra admin identity system. In Apper it should be an in-app route under the existing Admin menu, with existing RBAC and a permission review. The local SQLite Admin tables and Node APIs are not transferable to Apper browser code without implementing compatible protected backend actions and schema. No cloud deployment or import has occurred.


## Version 0.3.0 integration notes

Do not replace the current Apper Home or separate the Admin. Adapt the existing fifth-game entry in place; preserve the existing original four games. The local `megarush-api.mjs` has a backwards-compatible session schema extension for `required_orbs` and `pickup_count`. When translating this to Apper, give those attributes an authoritative backend owner and use the currently signed-in Player identity; no client-authoritative coin grants. Port the real minimap and camera-relative controls from the existing game files rather than building another controls layer. No Apper changes were committed in this build.
