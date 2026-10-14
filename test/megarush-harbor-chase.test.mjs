import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import net from 'node:net';

async function freePort() {
  return new Promise(resolve => {
    const s = net.createServer();
    s.listen(0, '127.0.0.1', () => {
      const port = s.address().port;
      s.close(() => resolve(port));
    });
  });
}

test('Harbor Chase is opt-in, saved, idempotent and rejects forged progress', async t => {
  const directory = mkdtempSync(join(tmpdir(), 'mr-harbor-'));
  const port = await freePort();
  const host = 'http://127.0.0.1:' + port;
  const child = spawn(process.execPath, ['server.mjs'], {
    cwd: new URL('..', import.meta.url).pathname,
    env: { ...process.env, PORT: String(port), PUZUNIVO_DATA_DIR: directory },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let errors = '';
  child.stderr.on('data', chunk => { errors += chunk; });
  t.after(() => {
    child.kill();
    rmSync(directory, { recursive: true, force: true });
  });
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try {
      const response = await fetch(host + '/api/health');
      if (response.ok) { ready = true; break; }
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 40));
  }
  assert.ok(ready, errors || 'Node server did not start');
  let cookie = '';
  async function call(url, body) {
    const response = await fetch(host + url, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { ...(cookie ? { Cookie: cookie } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const issued = response.headers.get('set-cookie');
    if (issued) cookie = issued.split(';')[0];
    return { status: response.status, body: await response.json() };
  }

  assert.equal((await call('/api/megarush/mission/chase/start', { sessionId: 'fake' })).status, 401);
  assert.equal((await call('/api/auth/guest', {})).status, 201);
  const session = await call('/api/megarush/session/start', { character: 'rylee' });
  assert.equal(session.status, 201);
  const id = session.body.id;
  assert.equal(session.body.incidentType, '');
  const before = await call('/api/megarush/session/active');
  assert.equal(before.body.state.chaseActive, false);
  assert.equal(before.body.incidentType, '');
  const started = await call('/api/megarush/mission/chase/start', { sessionId: id });
  assert.equal(started.status, 200);
  assert.equal(started.body.chaseActive, true);
  assert.equal(started.body.mission, 'harbor_challenge');
  const duplicate = await call('/api/megarush/mission/chase/start', { sessionId: id });
  assert.equal(duplicate.status, 200);
  assert.equal(duplicate.body.duplicate, true);
  const restored = await call('/api/megarush/session/active');
  assert.equal(restored.body.incidentType, 'harbor_challenge');
  assert.equal(restored.body.state.chaseActive, true);
  assert.equal((await call('/api/megarush/session/heartbeat', {
    id, x: 0, z: 112, state: restored.body.state
  })).status, 400);
  assert.equal((await call('/api/megarush/level/complete', { sessionId: id })).status, 409);
  assert.equal((await call('/api/megarush/session/end', { id })).status, 200);
  assert.equal((await call('/api/megarush/mission/chase/start', { sessionId: id })).status, 409);
});
