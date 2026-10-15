# MegaRush — build with no personal Unity PC

GitHub Actions is the cloud build orchestration layer. The file
`.github/workflows/unity-cloud-build.yml` supports workflow_dispatch targets `WebGL`,
`Android`, `StandaloneWindows64`. It uses GameCI's Unity Builder v4 to execute the
same existing Unity Editor class: `MegaRush.Editor.MegaRushProductionBuild`.

## What we can do from code and GitHub alone
- Programmatically edit/test C# game sources, animation state logic, input, cameras,
  missions, UI APIs, editor automation and build scripts.
- Run static code checks and Python tests in GitHub Actions.
- Prepare automatic cloud build jobs and upload output artifacts once they genuinely exist.

## What requires an actual authorized cloud Unity environment
- A legitimately activated Unity license for the cloud Editor (Unity Personal
  requires Unity Hub; do not rely on outdated online manual activation instructions).
  Depending on license type, GameCI expects `UNITY_LICENSE` or `UNITY_SERIAL`
  and associated account authorization in GitHub Actions repository secrets.
- Artist-authored, legally cleared rigged character, city, vehicles and game HUD assets,
  in Unity-imported prefabs, complete `MegaRushAssetManifest.asset` and
  `SunsetHarbor.unity`, plus their distribution permission records in `LICENSES.md`.
- Working Unity Editor compile and actual graphics tests on target devices.

**Ownership/security:** the repo owner authorizes Unity login and license. Never
paste an account password, ULF file, serial, signing key or paid asset license into
ChatGPT messages or tracked GitHub files. No workflow has access to missing secrets.
A cloud Windows workstation (remote browser/desktop) can be used for Unity Hub
Personal activation; cloud GPU instances cost money and need user approval before
spending. A single setup via the provider's account sign-in may be unavoidable.
No computer purchase is required.

## Deployment milestones
- Cloud WebGL artifact -> HTTPS website where React hosting can link/launch the
  **real** Unity Web player. Apper must NOT substitute its old low-poly WebGL game.
- Android artifact -> tested on actual Android GPU, followed by signing and APK/AAB
  delivery. Test APKs are not signed Play Store releases.
- Windows artifact -> remote Windows run/QA before player-facing delivery.
- iOS -> separate Mac/Apple signing and approval prerequisites.
- PS5 -> authorized Sony developer status, Unity Pro/console module and PS5 devkit
  testing. A Windows/Web cloud build does not equal PS5.

## GitHub Actions controls
This workflow runs **manually only**, never on each small source commit, saving
runner time/credit. Its preflight prints exactly which resources are missing.
If prerequisites are missing it reports BLOCKED and skips Unity compilation; this
does not silently create fake builds or fake monetization data.

Source for activation details: https://game.ci/docs/github/activation/
Source for Unity Builder: https://game.ci/docs/github/builder/
Unity license policy: https://docs.unity.com/en-us/engine/6000.0/manual/get-started/install-and-upgrade/licenses-and-activation/license-activation-methods
