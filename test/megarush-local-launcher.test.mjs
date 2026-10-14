import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('new MegaRush local entrypoint boots independent of Apper SDK', () => {
  const html = read('apper-app/megarush-local.html');
  const entry = read('apper-app/src/megarush-local.jsx');
  assert.match(html, /src\/megarush-local\.jsx/);
  assert.match(entry, /from '\.\/pages\/MegaRush\.jsx'/);
  assert.match(entry, /createRoot/);
  assert.doesNotMatch(html + entry, /ApperSDK|VITE_APPER_|src\/main\.jsx/);
});

test('local launcher points to the new port and file, not old Node game', () => {
  const shell = read('start-megarush-local.sh');
  const pkg = JSON.parse(read('apper-app/package.json'));
  const vite = read('apper-app/vite.local.config.js');
  assert.match(shell, /npm run megarush:local/);
  assert.match(shell, /127\.0\.0\.1:5173\/megarush-local\.html/);
  assert.match(pkg.scripts['megarush:local'], /vite --config vite\.local\.config\.js/);
  assert.match(vite, /megarush-local\.html/);
  assert.doesNotMatch(shell, /npm start/);
});

test('the locally launched 3D game is the same Apper gameplay route', () => {
  const page = read('apper-app/src/pages/MegaRush.jsx');
  const engine = read('apper-app/src/lib/megarushEngine.js');
  assert.match(page, /from '@\/lib\/megarushEngine'/);
  assert.match(page, /new WebGLWorld\(canvas\)/);
  assert.match(page, /ESCAPE THE CHASE/);
  assert.match(engine, /export class WebGLWorld/);
});
