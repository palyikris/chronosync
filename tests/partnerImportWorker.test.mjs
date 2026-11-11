import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as XLSX from 'xlsx';
import { parsePartnerFile } from './helpers/partnerImportWorker.mjs';
import { buildPartnerReview, suggestPartnerColumns } from '../src/utils/partnerBillingImport.ts';

const exported = readFileSync(new URL('./fixtures/szamlazz-partners-export.csv', import.meta.url));

test('reads the full quoted Számlázz.hu export layout, leading zeroes, labels and email lists', () => {
  const { result, error } = parsePartnerFile(exported);
  assert.equal(error, undefined);
  assert.equal(result.headers.length, 28);
  assert.equal(result.rows.length, 7);
  assert.equal(result.rows[0].rowNumber, 2);
  const mapping = suggestPartnerColumns(result.headers);
  assert.equal(Object.keys(mapping).length, 12);
  assert.equal(mapping.client_code, undefined);
  assert.equal(mapping.tax_subject, 24);
  assert.equal(mapping.billing_email, 14);
  const clients = result.rows.map((row, index) => ({ id: `client-${index}`, company_id: 'company', name: row.values[0] }));
  const rows = buildPartnerReview(result, mapping, clients, [], 'company', {}, { 2: 'accounts@example.invalid' });
  assert.deepEqual(rows.map(row => row.data.tax_subject), [1, 6, -1, 7, 0, undefined, undefined]);
  assert.deepEqual(rows.map(row => row.status), ['ready', 'ready', 'ready', 'ready', 'ready', 'ready', 'blocked']);
  assert.equal(rows[0].data.billing_postal_code, '0123');
  assert.equal(rows[0].data.billing_email, 'accounts@example.invalid');
  assert.equal(rows[0].data.payment_term_days, 0);
  assert.equal(rows[0].data.billing_name, 'Minta, Csoporttag Kft.');
  assert.equal(rows[0].data.billing_address, 'Minta utca 1. "A" épület');
  assert.equal(rows[1].data.billing_country_code, 'DE');
  assert.equal(rows[5].data.billing_country_code, undefined);
  assert.deepEqual(rows[6].invalidFields, ['tax_subject']);
});

test('export labels also work in XLS and XLSX, without changing formatted postal codes', () => {
  const csv = XLSX.read(exported.toString('utf8'), { type: 'string', raw: true });
  for (const bookType of ['biff8', 'xlsx']) {
    const buffer = XLSX.write(csv, { type: 'buffer', bookType });
    const { result, error } = parsePartnerFile(buffer, false);
    assert.equal(error, undefined);
    assert.equal(result.rows.length, 7);
    assert.equal(result.rows[0].values[3], '0123');
    assert.equal(result.rows[1].values[24], 'EU-s vállalkozás');
  }
});
