# PUZUNIVO Android AdMob Native Setup

The Apper-hosted preview is a **web app**, not a signed Android APK/AAB. Configuring these values in its web environment does **not** insert an AdMob App ID into an Android package.

## Configured identifiers

Android App ID: `ca-app-pub-4590159013838755~2219878303`
Interstitial unit: `ca-app-pub-4590159013838755/9228973931`
Rewarded unit: `ca-app-pub-4590159013838755/5227139421`

The source imports the actual Capacitor AdMob plugin. Capacitor config and dependencies are included.

## Native build

In a local checkout of the **same PUZUNIVO project**, with Android Studio and the required Android SDK installed:

1. Install dependencies: `npm install`
2. Create Android native project once: `npm run android:add`
3. Sync the web bundle, plugin and Android App ID: `npm run android:sync`
4. Open native project: `npm run android:open`
5. Test on physical Android device using **test ads** and UMP consent prompts.
6. Verify rewarded-ad `amount/type` and that no lives are granted if the ad is dismissed.
7. Configure Google's AdMob server-side verification endpoint and verify Google signatures and one-use transaction IDs before granting **cloud** XP or currency.
8. After production-device and Play policy QA, set `VITE_ADMOB_TEST_MODE=false` in the build environment and create a signed release AAB.

`scripts/configure-android-admob.mjs` edits the actual generated
`android/app/src/main/AndroidManifest.xml` and
`android/app/src/main/res/values/strings.xml` in place, ensuring no duplicate
metadata entries. Do **not** try to paste the App ID into a web page in place of
the Android Manifest.

## Honest feature status

- Native SDK package and React bridge are declared in source.
- All three production IDs are configured.
- Until the Android build is generated and tested, there are **no live ads in the web preview**.
- AdMob reward callback can refill three **local** lives only on actual native devices.
- Persistent cloud lives, verified XP and coins require protected authoritative server APIs.
- The default test mode is intentional; do not use real production ads during unverified testing.
- No signed APK/AAB is produced by Apper web preview.
