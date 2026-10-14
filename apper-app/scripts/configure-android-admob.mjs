import fs from 'node:fs';
import path from 'node:path';

const APP_ID = 'ca-app-pub-4590159013838755~2219878303';
const nativeRoot = path.resolve('android', 'app', 'src', 'main');
const manifestPath = path.join(nativeRoot, 'AndroidManifest.xml');
const stringsPath = path.join(nativeRoot, 'res', 'values', 'strings.xml');

if (!fs.existsSync(manifestPath) || !fs.existsSync(stringsPath)) {
  console.error('Missing generated Android native project. Run npm run android:add first.');
  process.exitCode = 1;
} else {
  let manifest = fs.readFileSync(manifestPath, 'utf8');
  const existing = /<meta-data\b(?=[^>]*android:name=["']com\.google\.android\.gms\.ads\.APPLICATION_ID["'])[^>]*\/?\s*>/;
  const appIdEntry = '<meta-data android:name="com.google.android.gms.ads.APPLICATION_ID" android:value="@string/admob_app_id" />';

  if (existing.test(manifest)) {
    manifest = manifest.replace(existing, appIdEntry);
  } else {
    if (!/<application\b[^>]*>/.test(manifest)) {
      throw new Error('Cannot locate Android manifest <application> section.');
    }
    manifest = manifest.replace(/<application\b[^>]*>/, '$&\n        ' + appIdEntry);
  }

  let strings = fs.readFileSync(stringsPath, 'utf8');
  const idEntry = '<string name="admob_app_id">' + APP_ID + '</string>';
  const existingString = /<string\b[^>]*name=["']admob_app_id["'][^>]*>[^<]*<\/string>/;

  if (existingString.test(strings)) {
    strings = strings.replace(existingString, idEntry);
  } else {
    if (!strings.includes('</resources>')) throw new Error('Android strings.xml is missing </resources>.');
    strings = strings.replace('</resources>', '    ' + idEntry + '\n</resources>');
  }

  fs.writeFileSync(manifestPath, manifest);
  fs.writeFileSync(stringsPath, strings);
  console.log('Configured AdMob App ID in generated AndroidManifest.xml and strings.xml without duplicate entries.');
}
