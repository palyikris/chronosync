import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveDemoParentOrigin } from '../../src/demo/originPolicy.ts';
import * as appProtocol from '../../src/demo/protocol.ts';
import * as siteProtocol from '../../landing/src/demo/protocol.ts';

test('the real demo allows only the configured marketing origin in production', () => {
  const app = 'https://app.example.com';
  for (const requested of ['https://attacker.example', 'https://example.com.attacker.example', 'http://example.com', 'http://127.0.0.1:5173', 'https://example.com/path', null]) {
    assert.equal(resolveDemoParentOrigin(requested, app, 'https://example.com', false), app);
  }
  assert.equal(resolveDemoParentOrigin('https://example.com', app, 'https://example.com', false), 'https://example.com');
  assert.equal(resolveDemoParentOrigin(app, app, 'https://example.com', false), app);
  assert.equal(resolveDemoParentOrigin('null', app, 'javascript:alert(1)', false), app);
});

test('local ports are allowed only in development', () => {
  assert.equal(resolveDemoParentOrigin('http://127.0.0.1:5173', 'http://127.0.0.1:5174', '', true), 'http://127.0.0.1:5173');
  assert.equal(resolveDemoParentOrigin('http://localhost:5173', 'http://127.0.0.1:5174', '', true), 'http://localhost:5173');
  assert.equal(resolveDemoParentOrigin('http://127.0.0.1:9999', 'http://127.0.0.1:5174', '', true), 'http://127.0.0.1:5174');
});

test('independent builds retain the same version of the demo messaging contract', () => {
  assert.deepEqual(siteProtocol.DEMO_ROUTES, appProtocol.DEMO_ROUTES);
  const sample = { hours: 24, draftHours: 0, submittedHours: 0, approvedHours: 24, entryCount: 4, reviewed: true };
  for (const value of [sample, { ...sample, approvedHours: '24' }, null, { ...sample, hours: Infinity }]) {
    assert.equal(siteProtocol.isDemoSnapshot(value), appProtocol.isDemoSnapshot(value));
  }
});
