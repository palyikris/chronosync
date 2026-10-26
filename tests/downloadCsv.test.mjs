import test from 'node:test';
import assert from 'node:assert/strict';
import { serializeCsv } from '../src/utils/downloadCsv.ts';

test('CSV preserves Hungarian text, delimiters, quotes, newlines and empty values', () => {
  assert.equal(serializeCsv([['Árvíz, Kft.', 'A "quote"', 'Line\nTwo', null]]), '\uFEFF"Árvíz, Kft.","A ""quote""","Line\nTwo",""');
});
test('CSV exports formula-like user data as spreadsheet text', () => {
  assert.equal(serializeCsv([['=SUM(A1)', ' +1', '@name', '-1', 'Safe']]), '\uFEFF"\'=SUM(A1)","\' +1","\'@name","\'-1","Safe"');
});
