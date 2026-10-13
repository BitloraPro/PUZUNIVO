import type { CapacitorConfig } from '@capacitor/cli';
const config: CapacitorConfig = {
  appId: 'com.puzunivo.megarush',
  appName: 'PUZUNIVO MegaRush',
  webDir: '../public',
  server: { cleartext: false },
  android: { allowMixedContent: false },
};
export default config;
