# MEGARUSH — Sunset Harbor Pursuit

**Fresh cross-platform game architecture | 2026-10-14**

A new 3D production project, no dependency on the legacy PUZUNIVO puzzle backend, old Node server, Apper React preview, or procedural low-poly WebGL demo.

## Engines and supported delivery routes

- **Unity 6.3 LTS**, version 6000.3.0f1, **Universal Render Pipeline 17.3**, C# runtime.
- **Web:** Unity Web platform (WebGL/WebAssembly) after importing production assets and building in the Unity Editor.
- **Mobile:** Android and iOS native builds with scalable URP, touch + gamepad controls.
- **Windows desktop:** standalone build.
- **PS5:** architecture prepared for native port, but **no PS5 executable** is built or claimed. Sony-approved developer access, a Unity Pro license, proprietary console add-on/SDK and devkit are prerequisites.
- **Current deliverable is an architecture and source foundation, not a playable high-fidelity build.** No official 3D models have been imported, no Unity Editor build completed, no device visual testing completed.

## Game vision
Original third-person skateboard police pursuit in a sunset coastal city. A detailed humanoid rider, realistic surfacing, busy traffic, police convoy and helicopter, reflective Harbor Boulevard, palm trees, docks, vehicle swaps, tricks, checkpoint and cinematic camera. The supplied user reference video is a **visual acceptance target**, not an asset we copy or fake with a screenshot.

## How to begin on a Windows PC

1. Install **Unity Hub** and Unity **6000.3.0f1**; add Windows, Web and Android platform modules as needed.
2. Clone this repository and **open its root folder as a Unity project**. It is NOT a Node.js web server and has no `npm start`.
3. Obtain properly licensed production-ready meshes, PBR materials, rigged animations, environmental geometry, vehicle assets and audio per [ASSET_REQUIREMENTS.md](Docs/ASSET_REQUIREMENTS.md).
4. Drag imported prefab references into `MegaRushAssetManifest` (create with menu `MegaRush > Create/Select Asset Manifest`).
5. Use `MegaRush > Create Harbor Chase Scene`. Scene authoring **refuses** missing core assets; it will not quietly create another primitive-car cartoon.
6. Assign/verify the imported character's CharacterController, colliders, Animator, steering/wheels and HUD button references. Open the generated scene and play.
7. Build Web, Android, Windows in Unity after visual QA. No build artifact or APK is included in this repo.

See [architecture](Docs/ARCHITECTURE.md), [visual acceptance](Docs/REFERENCE_ACCEPTANCE.md), and [roadmap](Docs/DELIVERY_ROADMAP.md).

## What's implemented in source
State machine for menu/free roam/chase/win/crash, cross-device input arbitration, touch joystick and buttons, collision-aware third-person camera, physics-based character locomotion, contextual skateboard jump/trick, police AI/health with cooldown, harbor finish trigger, vehicle enter/exit, and live in-session HUD. These are Unity C# **sources only**, not evidence of runtime execution.

## Clean reset policy
The legacy GitHub tracked files were **removed from the main branch** as explicitly requested. Historical commits remain in Git history; a normal Git deletion is not a secure deletion from repository history, other clones or cloud backups. Termux `~/PUZUNIVO/data/*.sqlite` and Apper's separately hosted cloud database are outside GitHub and are **not remotely deleted or migrated** by this commit. Do not treat deletion of code as deletion of production accounts.