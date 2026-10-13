// Optional Capacitor-only Google Mobile Ads bridge. Never emulates advertisements
// in a browser, never grants Fun Coins or IAP items from an untrusted client.
export const ADS = Object.freeze({
  androidAppId:'ca-app-pub-4590159013838755~2219878303',
  interstitialUnit:'ca-app-pub-4590159013838755/9228973931',
  rewardedUnit:'ca-app-pub-4590159013838755/5227139421',
  // Native development must use official Google test ads.
  testInterstitial:'ca-app-pub-3940256099942544/1033173712',
  testRewarded:'ca-app-pub-3940256099942544/5224354917',
});
const isProduction=()=>Boolean(window.MEGARUSH_PRODUCTION_ADS===true);
const plugin=()=>window.Capacitor?.isNativePlatform?.() ? window.Capacitor?.Plugins?.AdMob : null;
let readyPromise;
export function nativeAdsAvailable(){return Boolean(plugin());}
async function ready(){
 const native=plugin();if(!native)throw Error('Native AdMob SDK is not installed in this web build');
 if(!readyPromise){readyPromise=(async()=>{
   if(!native.requestConsentInfo)throw Error('Google UMP consent plugin is unavailable');
   let consent=await native.requestConsentInfo();
   if(consent.isConsentFormAvailable&&!consent.canRequestAds){
     if(!native.showConsentForm)throw Error('Consent form unavailable');
     consent=await native.showConsentForm();
   }
   if(!consent.canRequestAds)throw Error('User consent does not permit ad requests');
   await native.initialize();return native;
 })().catch(e=>{readyPromise=null;throw e});}
 return readyPromise;
}
export async function rewardedRevive(){
 const ad=await ready();await ad.prepareRewardVideoAd({adId:isProduction()?ADS.rewardedUnit:ADS.testRewarded,isTesting:!isProduction()});
 const earned=await ad.showRewardVideoAd();
 return Boolean(earned && Number(earned.amount)>0 && typeof earned.type==='string');
}
export async function interstitialBetweenChapters(){
 const ad=await ready();await ad.prepareInterstitial({adId:isProduction()?ADS.interstitialUnit:ADS.testInterstitial,isTesting:!isProduction()});
 await ad.showInterstitial();return true;
}
export function realMoneyPurchasesAvailable(){return false;}
