import test from 'node:test';
import assert from 'node:assert/strict';
import { isModuleEnabled, toggleModule } from '../src/modules/catalog.ts';

test('base and first module do not grant invoicing', () => {
  assert.equal(isModuleEnabled(undefined, 'leave_attachments'), false);
  assert.equal(isModuleEnabled([], 'invoicing'), false);
  assert.equal(isModuleEnabled(['leave_attachments'], 'leave_attachments'), true);
  assert.equal(isModuleEnabled(['leave_attachments'], 'invoicing'), false);
  assert.equal(isModuleEnabled(['invoicing'], 'invoicing'), false);
});

test('enabling invoicing includes its dependency and disabling dependency removes invoicing', () => {
  const enabled = toggleModule([], 'invoicing', true);
  assert.equal(isModuleEnabled(enabled, 'invoicing'), true);
  assert.equal(isModuleEnabled(enabled, 'leave_attachments'), true);
  assert.deepEqual(toggleModule(enabled, 'leave_attachments', false), []);
  assert.deepEqual(toggleModule(enabled, 'invoicing', false), ['leave_attachments']);
});
