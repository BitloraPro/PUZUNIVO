# Unity project build guide — not yet a binary delivery

## One-shot handoff
All game, rendering, motion, gameplay, input and cross-platform acceptance requirements appear in
[MEGARUSH_UNITY_ONE_SHOT_MASTER_BRIEF.md](MEGARUSH_UNITY_ONE_SHOT_MASTER_BRIEF.md).

## First actual playable scene prerequisites
The repository intentionally contains Unity source but **NO commercial-quality imported prefabs** and
NO `Assets/MegaRush/Scenes/SunsetHarbor.unity`. These must be created from legally licensed assets
inside a Unity Editor installation. This gating is intentional, to prevent the same low-poly screenshot
being mislabeled as the user's supplied reference video.

Install Unity 6.3.0f1 (with URP and the target build support modules). Install production source
meshes/materials/rigs and scenes. Configure `Assets/MegaRush/Content/MegaRushAssetManifest.asset`
through Unity menu **MegaRush > Create/Select Asset Manifest** and fill each field. Use **MegaRush >
Create Harbor Chase Scene**, then validate the in-engine camera, animation, physics, steering,
phone controls, traffic, route and all HUD callbacks. **MegaRush > Build > Validate Unity Scene**
checks required files and asset bindings, but visual fidelity still requires manual QA.

## Actual build commands after the scene is verified
These commands require a licensed installed Unity Editor executable, not Apper/Termux.
Run in a terminal from the repository root, replacing `<UNITY>` with the installed editor path.

```shell
<UNITY> -batchmode -nographics -quit -projectPath . -executeMethod MegaRush.Editor.MegaRushProductionBuild.BuildWeb -logFile Builds/Web-Build.log
<UNITY> -batchmode -nographics -quit -projectPath . -executeMethod MegaRush.Editor.MegaRushProductionBuild.BuildAndroid -logFile Builds/Android-Build.log
<UNITY> -batchmode -nographics -quit -projectPath . -executeMethod MegaRush.Editor.MegaRushProductionBuild.BuildWindows -logFile Builds/Windows-Build.log
```

- Web output: `Builds/Web/` (host the real Unity Web export on HTTPS/CDN; compressed delivery configured separately).
- Android output: `Builds/MegaRush-Android.apk` (signing/distribution configuration required).
- Windows output: `Builds/Windows/MegaRush.exe`.
- iOS output: requires a separate Apple build/signing environment.
- PS5: requires Sony-approved partner/Unity Pro/console SDK/devkit. There is **no** PS5 build method and no verified console artifact.

Do not commit paid raw game assets if license forbids redistributing them. Model source and license metadata must be tracked separately with owner-approved access. Do not commit Unity licensing files, signing keys or account tokens.

## Honest status
GitHub Actions static checks pass, but no Unity Editor game build has been run. This is not
a playable executable until the imported assets and scene exist and all runtime QA passes.
