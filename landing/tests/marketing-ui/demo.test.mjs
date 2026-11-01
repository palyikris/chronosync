import test from 'node:test';
import assert from 'node:assert/strict';
import { getDemoCsv } from '../../src/components/marketing/demoData.ts';

test('CSV sample is a consistent table with the same approved totals', () => {
  const rows = getDemoCsv().split('\r\n').map(row => row.split(','));
  assert.equal(rows.length, 6);
  assert.ok(rows.every(row => row.length === 9));
  assert.equal(rows[0][6], 'Approved hours');
  const entries = rows.slice(1, -1);
  assert.ok(entries.every(row => row[0].includes('fictional')));
  assert.equal(entries.reduce((sum, row) => sum + Number(row[6]), 0), 24);
  assert.equal(entries.reduce((sum, row) => sum + Number(row[8]), 0), 1800);
  assert.equal(rows.at(-1)[6], '24');
  assert.equal(rows.at(-1)[8], '1800');
});
