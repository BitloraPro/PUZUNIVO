# PUZUNIVO Android

**The active native Android build source is `android-native/`** (Java + Gradle). See [`android-native/README.md`](android-native/README.md). This keeps the same PUZUNIVO server/accounts and selects landscape only on MegaRush.

The earlier `capacitor.config.ts` is a historical non-buildable scaffold; **do not generate a second parallel Android application from it**. The existing `android-native/` module is the single build path for now. Both require a real HTTPS backend; the local SQLite app cannot be embedded in a static APK.

# MegaRush Android / AdMob integration scaffold

(Historical Capacitor exploration below; not the active Android build.)

The Puzunivo web server runs a real interactive WebGL2 game but **this folder is not a signed Android project**. Generate a Capacitor Android wrapper after a developer environment (Android Studio, SDK, Gradle and compatible Capacitor/AdMob packages) is available. This scaffold keeps both game code and the existing PUZUNIVO auth/backend as the source of truth.

* Android App ID: `ca-app-pub-4590159013838755~2219878303`
* Interstitial: `ca-app-pub-4590159013838755/9228973931`
* Rewarded: `ca-app-pub-4590159013838755/5227139421`

In generated `android/app/src/main/AndroidManifest.xml` under `<application>` add exactly once:

```xml
<meta-data android:name="com.google.android.gms.ads.APPLICATION_ID" android:value="ca-app-pub-4590159013838755~2219878303" />
```

Install a current Capacitor + supported community AdMob plugin compatible with your Android toolchain, sync native assets and initialize Google User Messaging Platform consent. Production ads require review of policies, account/ad serving status, age targeting and device tests. Current browser mode **never fakes ads**; `public/megarush/native-monetization.js` is only activated by a real Capacitor native host.

The web client can verify an SDK *earned-reward* callback for **device-local revival**; signed AdMob Server-Side Verification with Google public key validation and one-use transaction IDs must be implemented before any persistent cloud bonus credit. The local virtual store does **not** charge real money.

Google Play Billing / IAP is **not wired**. Implement a trusted purchase validation endpoint (verify Google Play purchase token and package/product IDs; acknowledge delivery; deduplicate; handle refund and chargebacks) before exposing real-money purchase buttons. Never trust client-declared purchases or ad display claims.

Web app requires backend connectivity: Capacitor packaging must configure your **real HTTPS PUZUNIVO server origin**; `file://` will not connect to `/api` routes. No API tokens or user passwords are packaged here.

### Enforce landscape in a generated Android wrapper

In the generated Capacitor Android project, update the **existing** MainActivity entry inside `android/app/src/main/AndroidManifest.xml` (do not add a duplicate Activity):

```xml
android:screenOrientation="landscape"
```

Apply this together with any manifest attributes already present; no new Activity is needed. For a combined PUZUNIVO Android application where the four puzzles stay portrait, do **not** lock MainActivity globally: add a native orientation bridge that enters landscape on the MegaRush route and restores the prior orientation when the player returns to the PUZUNIVO dashboard. Screen orientation lock in the browser is best-effort; there is a portrait rotate reminder for unsupported browsers. This source ZIP does **not** contain a compiled Android app or manifest edit.
