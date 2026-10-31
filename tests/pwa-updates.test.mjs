import test from 'node:test';
import assert from 'node:assert/strict';

const flush = () => new Promise(resolve => setImmediate(resolve));

async function setup(t, { waiting = false, controlled = true } = {}) {
  let manager;
  const original = Object.fromEntries(['window', 'document', 'navigator'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const timers = new Map();
  let timerId = 0;
  let reloads = 0;
  let notices = 0;
  let errors = 0;
  let registrations = 0;
  let checks = 0;
  let messages = 0;
  let updateResult = Promise.resolve();
  const worker = Object.assign(new EventTarget(), { postMessage() { messages++; } });
  const registration = Object.assign(new EventTarget(), {
    waiting: waiting ? worker : null,
    active: controlled ? worker : null,
    installing: null,
    update() { checks++; return updateResult; },
  });
  const serviceWorker = Object.assign(new EventTarget(), {
    controller: controlled ? worker : null,
    register(url, options) {
      registrations++;
      assert.equal(url, '/sw.js');
      assert.equal(options.updateViaCache, 'none');
      return Promise.resolve(registration);
    },
  });
  const window = Object.assign(new EventTarget(), {
    location: { reload() { reloads++; } },
    setInterval(fn) { timers.set(++timerId, fn); return timerId; },
    clearInterval(id) { timers.delete(id); },
    setTimeout(fn) { timers.set(++timerId, fn); return timerId; },
    clearTimeout(id) { timers.delete(id); },
  });
  const document = Object.assign(new EventTarget(), { visibilityState: 'visible' });
  const navigator = { serviceWorker, onLine: true };
  for (const [key, value] of Object.entries({ window, document, navigator })) {
    Object.defineProperty(globalThis, key, { configurable: true, value });
  }
  t.after(() => {
    manager?.dispose();
    for (const [key, descriptor] of Object.entries(original)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });
  const { startPwaUpdates } = await import(`../src/pwa/updates.ts?test=${encodeURIComponent(t.name)}`);
  const start = () => startPwaUpdates(() => notices++, () => errors++);
  manager = start();
  await flush();
  return {
    manager, start, registration, serviceWorker, worker, window, document, navigator, timers,
    pendingUpdate(promise) { updateResult = promise; },
    counts: () => ({ reloads, notices, errors, registrations, checks, messages }),
  };
}

test('checks at startup, visibility, reconnect and interval; skips hidden/offline checks', async t => {
  const env = await setup(t);
  assert.equal(env.counts().checks, 1);
  env.window.dispatchEvent(new Event('online'));
  await flush();
  env.document.dispatchEvent(new Event('visibilitychange'));
  await flush();
  for (const callback of env.timers.values()) callback();
  await flush();
  assert.equal(env.counts().checks, 4);
  env.document.visibilityState = 'hidden';
  env.document.dispatchEvent(new Event('visibilitychange'));
  for (const callback of env.timers.values()) callback();
  env.navigator.onLine = false;
  env.window.dispatchEvent(new Event('online'));
  assert.equal(env.counts().checks, 4);
  env.manager.dispose();
  env.navigator.onLine = true;
  env.window.dispatchEvent(new Event('online'));
  env.document.visibilityState = 'visible';
  env.document.dispatchEvent(new Event('visibilitychange'));
  assert.equal(env.counts().checks, 4);
  assert.equal(env.timers.size, 0);
});

test('coalesces concurrent checks and can retry after network failure', async t => {
  const env = await setup(t);
  let reject;
  env.pendingUpdate(new Promise((_, no) => { reject = no; }));
  env.window.dispatchEvent(new Event('online'));
  env.document.dispatchEvent(new Event('visibilitychange'));
  assert.equal(env.counts().checks, 2);
  reject(new Error('offline'));
  await flush();
  env.pendingUpdate(Promise.resolve());
  env.window.dispatchEvent(new Event('online'));
  await flush();
  assert.equal(env.counts().checks, 3);
});

test('React remounts share one registration and remove old lifecycle listeners', async t => {
  const env = await setup(t);
  env.manager.dispose();
  const remounted = env.start();
  await flush();
  assert.equal(env.counts().registrations, 1);
  assert.equal(env.timers.size, 1);
  const before = env.counts().checks;
  env.window.dispatchEvent(new Event('online'));
  await flush();
  assert.equal(env.counts().checks, before + 1);
  remounted.dispose();
  assert.equal(env.timers.size, 0);
});

test('waiting updates require a click, activate once, and reload exactly once', async t => {
  const env = await setup(t, { waiting: true });
  assert.equal(env.counts().notices, 1);
  assert.equal(env.counts().messages, 0);
  assert.equal(env.counts().reloads, 0);
  env.manager.applyUpdate();
  env.manager.applyUpdate();
  assert.equal(env.counts().messages, 1);
  env.serviceWorker.controller = new EventTarget();
  env.serviceWorker.dispatchEvent(new Event('controllerchange'));
  env.serviceWorker.dispatchEvent(new Event('controllerchange'));
  assert.equal(env.counts().reloads, 1);
});

test('newly installed workers surface an update and activation failures allow retry', async t => {
  const env = await setup(t);
  env.registration.installing = env.worker;
  env.registration.dispatchEvent(new Event('updatefound'));
  env.registration.waiting = env.worker;
  env.worker.dispatchEvent(new Event('statechange'));
  assert.equal(env.counts().notices, 1);
  env.manager.applyUpdate();
  [...env.timers.values()].at(-1)();
  assert.equal(env.counts().errors, 1);
  env.manager.applyUpdate();
  assert.equal(env.counts().messages, 2);
});

test('first installation does not reload; another tab activating only offers a reload', async t => {
  const env = await setup(t, { controlled: false });
  env.registration.installing = env.worker;
  env.registration.dispatchEvent(new Event('updatefound'));
  env.registration.waiting = env.worker;
  env.worker.dispatchEvent(new Event('statechange'));
  assert.equal(env.counts().notices, 0, 'first installation does not offer a release update');
  env.registration.waiting = null;
  env.registration.active = env.worker;
  env.serviceWorker.controller = env.worker;
  env.serviceWorker.dispatchEvent(new Event('controllerchange'));
  assert.equal(env.counts().notices, 0);
  env.serviceWorker.controller = new EventTarget();
  env.serviceWorker.dispatchEvent(new Event('controllerchange'));
  assert.equal(env.counts().notices, 1);
  assert.equal(env.counts().reloads, 0);
  env.manager.applyUpdate();
  assert.equal(env.counts().reloads, 1);
});
