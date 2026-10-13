# PUZUNIVO / MegaRush native Android debug build

This Android shell launches the **same** existing PUZUNIVO HTTPS server: portrait app home, account, puzzle games, admin permissions and **landscape only on `/megarush`**. It is **not** a new identity system, a separate 3D demo admin or a standalone offline game. No account credentials are stored in the APK. The server must be deployed and reachable from the Android device first.

## How to compile an APK

Upload the entire project unchanged to a private GitHub repository. Open **Actions → Build PUZUNIVO Android Debug APK → Run workflow**, enter the true, deployed **HTTPS origin** of this Node/SQLite PUZUNIVO server, and start the job. Its APK can be downloaded from the Actions **artifact** if the build succeeds.

The workflow also checks that the destination serves the **real** MegaRush health and bootstrap APIs and playable game HTML/JS, then runs tests and verifies the built APK signature. A plain Apper preview or unrelated HTTPS website fails this gate.

A local developer can equivalently set the HTTPS URL in the existing `app/src/main/res/values/strings.xml` and run `gradle :app:assembleDebug` from this folder with JDK 17, Android SDK 35 and Gradle 8.10.2. Do not commit a private authentication token here. The APK uses only a public origin. Release signing and Play compliance remain a separate gate.

**Important:** a website hosted on Apper that lacks the MegaRush route and matching REST API is *not* a compatible backend. Do not point this app at Apper until you port and deploy the fifth game within that existing application.

## Verification boundaries

`app-debug.apk` can only be produced in an Android SDK environment or by the workflow. This ChatGPT runtime had no SDK or network DNS, so **no APK has been compiled here**, and no physical Android GPU/Android System WebView test has been run. The debug APK is for device QA, not Google Play public release. A WebView wrapper still depends on the shared live server, is not offline-first and does not confer cinematic AAA 3D fidelity. Before any release, use Play Integrity / native asset delivery as appropriate, real device GPU QA, signed Android release builds, and verified third-party content licensing.

No new Admin portal is part of this Android module. The original portal stays server-side behind the original admin permissions.
