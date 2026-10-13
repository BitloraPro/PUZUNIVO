import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const workflow=readFileSync(new URL('../.github/workflows/android-debug-megarush.yml',import.meta.url),'utf8');
const activity=readFileSync(new URL('../mobile/android-native/app/src/main/java/com/puzunivo/game/MainActivity.java',import.meta.url),'utf8');

test('Android APK CI rejects undeployed/incompatible backend and verifies all game engines',()=>{
 assert.match(workflow,/setup-node@v4/);
 assert.match(workflow,/node-version: '22'/);
 assert.match(workflow,/npm test/);
 assert.match(workflow,/npm run check/);
 assert.match(workflow,/api\/megarush\/health/);
 assert.match(workflow,/api\/megarush\/bootstrap/);
 assert.match(workflow,/get\('\/megarush','text\/html'\)/);
 assert.match(workflow,/app:assembleDebug/);
 assert.match(workflow,/apksigner/);
 assert.match(workflow,/sha256sum/);
 assert.match(workflow,/upload-artifact@v4/);
 assert.match(workflow,/GAME_ORIGIN/);
});

test('Native app preserves one player dashboard and applies landscape only inside MegaRush',()=>{
 assert.match(activity,/getString\(R.string.puzunivo_server_url\)/);
 assert.match(activity,/https/);
 assert.match(activity,/SCREEN_ORIENTATION_SENSOR_LANDSCAPE/);
 assert.match(activity,/path.startsWith\("\/megarush\/"\)/);
 assert.match(activity,/MIXED_CONTENT_NEVER_ALLOW/);
 assert.match(activity,/setAllowFileAccess\(false\)/);
 assert.doesNotMatch(activity,/http:\/\/localhost/);
 assert.match(activity,/next.getPort\(\) == -1/);
 assert.match(activity,/uri.getPath\(\)/);
});


test('Mobile Jump and Climb persist through the input sampling tick; camera supports 360 degree orbit',()=>{
 const source=readFileSync(new URL('../public/megarush/game.js',import.meta.url),'utf8');
 assert.match(source,/keys\.add\('jump'\)/);
 assert.match(source,/keys\.add\('climb'\)/);
 assert.match(source,/control\.jump=held\('Space'\)\|\|held\('jump'\)/);
 assert.match(source,/control\.climb=held\('KeyR'\)\|\|held\('climb'\)/);
 assert.doesNotMatch(source,/control\.jump=true;setTimeout/);
 assert.match(source,/Math\.atan2\(Math\.sin\(world\.cameraYaw/);
});


test('Android offline retry and hardware Back cannot silently leave a running chase',()=>{
 assert.match(activity,/showConnectivityError\(\)/);
 assert.match(activity,/request\.isForMainFrame\(\)/);
 assert.match(activity,/web\.loadUrl\(trustedOrigin\)/);
 assert.match(activity,/document\.getElementById\('menu-btn'\)/);
 assert.match(activity,/window\.location\.assign\('\/app'\)/);
});


test('Android pauses remote gameplay on background and WebGL recovery honours existing pause state',()=>{
 const game=readFileSync(new URL('../public/megarush/game.js',import.meta.url),'utf8');
 assert.match(activity,/window\.dispatchEvent\(new Event\('puzunivo:native-pause'\)\)/);
 assert.match(game,/window\.addEventListener\('puzunivo:native-pause',pauseForInterruption\)/);
 assert.match(game,/resumeGraphicsAfterRestore=running&&!document\.hidden/);
 assert.match(game,/const mayResume=resumeGraphicsAfterRestore&&!document\.hidden/);
 assert.match(game,/else\{running=false;showPanel\(\);\}/);
 assert.doesNotMatch(game,/if\(session\)\{running=true;last=performance\.now\(\);physicsCarry=0;frameSamples=0;fpsElapsed=0;/);
});


test('Forced final heartbeat persists game progress even after Android has paused the render loop',()=>{
 const game=readFileSync(new URL('../public/megarush/game.js',import.meta.url),'utf8');
 assert.match(game,/if\(!session\|\|!player\|\|\(!running&&!force\)\)return Promise\.resolve\(\)/);
 assert.match(game,/if\(heartbeatPromise\)return force\?heartbeatPromise\.then\(\(\)=>heartbeat\(true\)\):heartbeatPromise/);
 assert.match(game,/function pauseForInterruption\(\)\{[\s\S]*?heartbeat\(true\)\.catch\(\(\)=>\{\}\);[\s\S]*?running=false/);
});
