// Reproducible, real Chromium/WebGL2 evidence; not a mocked canvas screenshot.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';

mkdirSync('artifacts', { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--disable-gpu-sandbox',
    '--no-sandbox',
  ],
});

async function inspect(label, opts) {
  const context = await browser.newContext({
    viewport: opts.viewport,
    isMobile: opts.isMobile,
    hasTouch: opts.isMobile,
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const screenshotPath = 'artifacts/harbor-' + label + '.png';
  try {
    const response = await page.goto('http://127.0.0.1:3000/megarush', {
      waitUntil: 'domcontentloaded',
      timeout: 35000,
    });
    assert.equal(response?.status(), 200, 'The real game page must load');
    await page.locator('#play').waitFor({ timeout: 20000 });
    await page.locator('#play').click({ timeout: 15000 });
    await page.waitForFunction(
      () => !document.getElementById('hud')?.classList.contains('hidden'),
      null,
      { timeout: 45000 },
    );
    await page.waitForFunction(
      () => document.getElementById('heat')?.textContent === 'CHASE',
      null,
      { timeout: 45000 },
    );
    await page.waitForTimeout(4100);
    const state = await page.evaluate(() => {
      const canvas = document.getElementById('world');
      const hud = document.getElementById('hud');
      const message = document.getElementById('chase-distance');
      const gl = canvas?.getContext('webgl2');
      return {
        gl: Boolean(gl),
        width: canvas?.width,
        height: canvas?.height,
        mission: document.querySelector('.chase-objective strong')?.textContent,
        distance: message?.textContent,
        health: document.getElementById('health-stat')?.textContent,
        hudVisible: !hud?.classList.contains('hidden'),
        fps: document.getElementById('fps')?.textContent,
        centerElement: document.elementFromPoint(innerWidth / 2, innerHeight / 2)?.id,
        visibleActions: [...document.querySelectorAll('.actionpad button')].filter(button => getComputedStyle(button).display !== 'none').length,
      };
    });
    assert.ok(state.gl && state.width > 100 && state.height > 100, 'WebGL2 surface must render');
    assert.equal(state.mission, 'Escape the chase');
    assert.equal(state.hudVisible, true);
    assert.equal(state.centerElement, 'world', 'No giant mission card may cover the playable center of the scene');
    assert.equal(state.visibleActions, 5, 'The gameplay HUD must show five reference-style touch controls');
    assert.match(state.distance || '', /\d+ m$/);
    assert.ok(state.health?.includes('♥'), 'HUD hearts must be connected to gameplay');
    assert.deepEqual(errors, [], 'Unhandled browser errors are not acceptable');
    // Real movement must update the live mission distance, and pausing must
    // persist that position to the SQLite session rather than only local state.
    if (!opts.isMobile) {
      const initialDistance = Number.parseInt(state.distance, 10);
      await page.keyboard.down('w');
      try {
        await page.waitForFunction(
          start => {
            const current = Number.parseInt(document.getElementById('chase-distance')?.textContent || '', 10);
            return Number.isFinite(current) && current <= start - 2;
          },
          initialDistance,
          { timeout: 20000 },
        );
      } finally {
        await page.keyboard.up('w');
      }
      await page.locator('#menu-btn').click();
      await page.waitForFunction(
        async () => {
          const response = await fetch('/api/megarush/session/active', { credentials: 'same-origin' });
          const run = await response.json();
          return run.active === true && run.z >= 2;
        },
        null,
        { timeout: 15000, polling: 300 },
      );
      await page.locator('#play').click();
      console.log('DESKTOP MOVEMENT: real canvas input moved toward Harbor and paused position was saved to SQLite');
    }
    console.log(label.toUpperCase() + ': ' + JSON.stringify(state));
  } finally {
    await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
    await context.close();
  }
}

try {
  await inspect('desktop-1536x864', {
    viewport: { width: 1536, height: 864 },
    isMobile: false,
  });
  await inspect('mobile-landscape-932x430', {
    viewport: { width: 932, height: 430 },
    isMobile: true,
  });
} finally {
  await browser.close();
}
