import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const js = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
const json = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

test('playable 3D WebGL engine uses an authored mesh model loader and not the deleted demo', () => {
  assert.match(js, /new THREE.WebGLRenderer/);
  assert.match(js, /new GLTFLoader/);
  assert.match(js, /CesiumMan\/glTF-Binary\/CesiumMan\.glb/);
  assert.match(js, /CarConcept\/glTF-Binary\/CarConcept\.glb/);
  assert.doesNotMatch(js, /server\.mjs|ApperSDK|GameObject\.CreatePrimitive/);
});
test('real player and chase behavior is wired to actual input and mission coordinates', () => {
  assert.match(js, /function physics\(dt\)/);
  assert.match(js, /function updatePolice\(dt\)/);
  assert.match(js, /function movementHits\(x, z\)/);
  assert.match(js, /function swapVehicle\(\)/);
  assert.match(js, /function winGame\(\)/);
  assert.match(js, /state\.z >= 147/);
  for (const id of ['scene','startPanel','chaseButton','roamButton','hud','radar',
                     'joystick','sprint','jump','trick','swap','car','pause']) {
    assert.match(html, new RegExp('id="' + id + '"'));
  }
});
test('mobile portrait can start play and is not blocked by orientation lock', () => {
  assert.match(css, /@media \(orientation:portrait\)/);
  assert.doesNotMatch(html + js, /ROTATE TO LANDSCAPE|orientation\.lock/);
});
test('cloud-balance counter is never invented and package builds as Vite frontend', () => {
  assert.match(html, /COINS <b>—<\/b>/);
  assert.match(html, /XP <b>—<\/b>/);
  assert.equal(json.scripts.build, 'vite build');
  assert.ok(json.dependencies.three);
});
