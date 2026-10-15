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

## No-PC cloud production pipeline

**No Unity-capable PC or local Unity Hub installation is required for source development.** The repo now includes a manual GitHub Actions workflow that can request a cloud **WebGL, Android or Windows** Unity build when verified content and an authorized Unity license are ready.

1. The source stays in this GitHub repo and is edited remotely.
2. Real artist-authored 3D assets (correct commercial licenses), a serialized Unity scene and asset manifest must exist before compilation; old procedural cube models are prohibited.
3. Unity license activation and authorization are separate one-time account-owner operations; **never provide passwords in chat, files or public repository commits**. Unity Personal licensing requires activation through Unity Hub, which can be performed on a remote graphical/cloud workstation, not the user's phone. A cloud build will not bypass this rule.
4. After prerequisites, open [GitHub Actions](https://github.com/BitloraPro/PUZUNIVO/actions/workflows/unity-cloud-build.yml), choose **Run workflow** and platform `WebGL`, `Android` or `StandaloneWindows64`. The preflight checks the files and presence of license secrets **without printing their contents**. If anything is missing, expensive Unity compilation is skipped.
5. Compiled packages appear under the GitHub Actions run's **Artifacts** only when Unity genuinely completes the selected build.

This pipeline is **prepared, not proof that a playable release exists**. For exact prerequisites and optional headless commands see [Cloud guide](Docs/NO_PC_CLOUD_WORKFLOW.md), [build guide](Docs/UNITY_BUILD_GUIDE.md), [asset checklist](Docs/ASSET_REQUIREMENTS.md) and [full master brief](Docs/MEGARUSH_UNITY_ONE_SHOT_MASTER_BRIEF.md).

## What's implemented in source
State machine for menu/free roam/chase/win/crash, cross-device input arbitration, touch joystick and buttons, collision-aware third-person camera, physics-based character locomotion, contextual skateboard jump/trick, police AI/health with cooldown, harbor finish trigger, vehicle enter/exit, and live in-session HUD. These are Unity C# **sources only**, not evidence of runtime execution.

## Clean reset policy
The legacy GitHub tracked files were **removed from the main branch** as explicitly requested. Historical commits remain in Git history; a normal Git deletion is not a secure deletion from repository history, other clones or cloud backups. Termux `~/PUZUNIVO/data/*.sqlite` and Apper's separately hosted cloud database are outside GitHub and are **not remotely deleted or migrated** by this commit. Do not treat deletion of code as deletion of production accounts.