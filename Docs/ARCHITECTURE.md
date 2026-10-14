# MegaRush fresh architecture (MVP to production)

## Single gameplay codebase
Unity 6.3 LTS / URP. Gameplay logic and scene assets shared across Web, Android, iOS, Windows and PS5 (subject to platform approval). Console code and symbols stay outside this repository until Sony and Unity authorize them.

- `Core/GameSession`: authoritative **local match state** and Harbor mission lifecycle, no invented profile stats.
- `Player/PlayerMotor`: CharacterController collision, acceleration, gravity, jump, trick, health and visual animation bridge.
- `Input/CrossPlatformInput`: keyboard/mouse, controller and UI joystick/buttons with one source of truth.
- `Camera/ThirdPersonCamera`: trailing orbit camera and geometry collision.
- `Police/PolicePursuit`: police activation, chase AI, pursuit vehicle steering and bounded collision damage.
- `Vehicle/VehicleInteraction`: seat/exit and input transfer between rider and a driveable vehicle.
- `Missions/HarborFinish`: actual Unity trigger; only completes active challenge.
- `UI/HudPresenter`: state-driven objective, minimap/health/speed readouts; no fabricated coins or XP.
- `Content/MegaRushAssetManifest`: required authored prefabs, not auto-generated cubes.
- `Editor/MegaRushSceneAuthoring`: creates scene only after required assets are imported.
- `Rendering/MobileQualityController`: per-device resolution and frame-rate limits.

## Ownership and online architecture
A **future** backend (not yet built) must authenticate users, own cloud saves, inventory, leaderboards and anti-cheat-checked completion events. Client motion/mission rewards are untrusted; server should reconcile replay-proof transaction IDs and physics bounds. PSN identity is not a default web account; link through approved console auth under platform terms. No withdrawals or monetary rewards in the client.

Possible backend services: API gateway, identity service, match-state/event service, PostgreSQL immutable progression ledger, monitoring and abuse controls. This is a proposal, **not implemented infrastructure**.

## Content/rendering
Use imported modular city blocks, photogrammetry-grade PBR asphalt/sidewalks, licensed character rigs/animations and separately optimized PS5/mobile LOD chains. URP Forward+ where supported; desktop/console higher-resolution shadows, decals, reflection probes; mobile/Web compressed textures, baked GI, static batching, occlusion culling. Any scene intended for shipping must pass an in-device screenshot comparison against the reference.

## Cross-platform requirements
- Web: WebGL2/WebAssembly, optimized textures, constrained memory footprint, keyboard/mouse/gamepad/touch.
- Android: native IL2CPP/ARM64, adaptive resolution and thermal/fps testing.
- iOS: native Metal build requires a compatible Apple build environment.
- Windows: keyboard/mouse/controller and 1080p+ QA.
- PS5: separately approved Unity platform add-on/SDK, PlayStation partner registration, devkit, trophies/network/compliance work. Cannot be built or tested on consumer PS5 or Termux.

## Explicit non-goals for the foundation commit
Do not claim reference-video visual parity, real production content, shipped binary, validated PS5 package, cloud-backed XP, or real Android performance until evidence exists.