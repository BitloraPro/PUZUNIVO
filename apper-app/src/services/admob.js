import { Capacitor } from '@capacitor/core';
import { AdMob, AdmobConsentStatus } from '@capacitor-community/admob';

/**
 * PUZUNIVO native AdMob configuration. The Android App ID is a PUBLIC
 * identifier, not an ad unit or a secret. It must also be present in the
 * generated native project's AndroidManifest via configure-android-admob.
 */
export const ADMOB = Object.freeze({
  androidAppId: import.meta.env.VITE_ADMOB_ANDROID_APP_ID ?? '',
  interstitial: import.meta.env.VITE_ADMOB_INTERSTITIAL_UNIT_ID ?? '',
  rewarded: import.meta.env.VITE_ADMOB_REWARDED_UNIT_ID ?? '',
  testMode: import.meta.env.VITE_ADMOB_TEST_MODE !== 'false',
});

const TEST_IDS = Object.freeze({
  interstitial: 'ca-app-pub-3940256099942544/1033173712',
  rewarded: 'ca-app-pub-3940256099942544/5224354917',
});

const UNIT_PATTERN = /^ca-app-pub-\d{16}\/\d{10}$/;
const APP_PATTERN = /^ca-app-pub-\d{16}~\d{10}$/;
let initializationPromise;

export function getAdMobStatus() {
  const appIdConfigured = APP_PATTERN.test(ADMOB.androidAppId);
  const unitsConfigured = UNIT_PATTERN.test(ADMOB.interstitial)
    && UNIT_PATTERN.test(ADMOB.rewarded);
  const native = Capacitor.isNativePlatform();
  const pluginInstalled = native && Capacitor.isPluginAvailable('AdMob');
  const ready = appIdConfigured && unitsConfigured && pluginInstalled;

  return {
    configured: appIdConfigured && unitsConfigured,
    appIdConfigured,
    unitsConfigured,
    androidAppId: ADMOB.androidAppId,
    interstitialUnitId: ADMOB.interstitial,
    rewardedUnitId: ADMOB.rewarded,
    testMode: ADMOB.testMode,
    native,
    pluginInstalled,
    ready,
    reason: !appIdConfigured
      ? 'The Android AdMob App ID is not configured.'
      : !unitsConfigured
        ? 'Both rewarded and interstitial unit IDs must be configured.'
        : !native
          ? 'AdMob is a native Android/iOS SDK; web preview cannot serve these ads.'
          : !pluginInstalled
            ? 'The native AdMob plugin is not installed in this device build.'
            : ADMOB.testMode
              ? 'Native AdMob is configured. Google test ad units are active until release testing is complete.'
              : 'Native AdMob is configured. Production ad units are selected.',
  };
}

async function getNativeAdMob() {
  const status = getAdMobStatus();
  if (!status.ready) throw new Error(status.reason);

  if (!initializationPromise) {
    initializationPromise = (async () => {
      // The plugin recommends consent information before SDK initialization.
      let consent = await AdMob.requestConsentInfo();
      if (
        consent.isConsentFormAvailable
        && consent.status === AdmobConsentStatus.REQUIRED
      ) {
        consent = await AdMob.showConsentForm();
      }
      if (!consent.canRequestAds) {
        throw new Error('Consent requirements do not permit an ad request.');
      }
      await AdMob.initialize();
      return AdMob;
    })().catch(error => {
      initializationPromise = null;
      throw error;
    });
  }
  return initializationPromise;
}

function getUnitId(kind) {
  return ADMOB.testMode ? TEST_IDS[kind] : ADMOB[kind];
}

export async function showInterstitialAd() {
  const native = await getNativeAdMob();
  await native.prepareInterstitial({
    adId: getUnitId('interstitial'),
    isTesting: ADMOB.testMode,
  });
  await native.showInterstitial();
  return { shown: true, testMode: ADMOB.testMode };
}

export async function showRewardedAd({ userId } = {}) {
  const native = await getNativeAdMob();
  const options = {
    adId: getUnitId('rewarded'),
    isTesting: ADMOB.testMode,
  };

  // The userId is provided to future Google signed SSV callbacks.
  // Client-side rewards remain *device-local* until a server validates SSV.
  if (userId) {
    options.ssv = {
      userId: String(userId),
      customData: 'puzunivo_lives_refill',
    };
  }

  await native.prepareRewardVideoAd(options);
  const reward = await native.showRewardVideoAd();

  // Only an earned reward, never a mere ad display/dismissal, grants local lives.
  const earned = Boolean(reward && Number(reward.amount) > 0 && reward.type);
  return {
    earned,
    source: 'native-sdk',
    testMode: ADMOB.testMode,
    serverVerified: false,
  };
}
