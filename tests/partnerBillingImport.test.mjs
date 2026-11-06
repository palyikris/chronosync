import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPartnerReview, suggestPartnerColumns, normalizePartnerCountry, readPartnerRow } from '../src/utils/partnerBillingImport.ts';

const COMPANY = 'company';
const clients = [
  { id: 'one', company_id: COMPANY, name: 'Árvíz & Társai Kft.', client_code: 'ARV' },
  { id: 'two', company_id: COMPANY, name: 'Second Zrt.', client_code: 'TWO' },
  { id: 'other', company_id: 'other-company', name: 'Outside Kft.', client_code: 'OUT' },
];
const profile = { client_id: 'one', company_id: COMPANY, billing_name: 'Saved legal name', billing_country_code: 'HU',
  billing_city: 'Saved city', billing_email: 'saved@example.invalid', tax_subject: 1,
  tax_number: '12345678-2-41', payment_term_days: 0, payment_method: 'Saved method' };
const file = (...rows) => ({ headers: ['partner neve', 'adószám', 'település', 'email cím', 'partner azonosító'],
  sheetName: 'Partners', rows: rows.map((values, index) => ({ rowNumber: index + 2, values })) });
const review = (input, profiles = [profile], choices = {}) => buildPartnerReview(input,
  suggestPartnerColumns(input.headers), clients, profiles, COMPANY, choices);

test('recognizes official Hungarian columns without treating provider ID as a client code', () => {
  const mapping = suggestPartnerColumns(['partner neve', 'partner azonosító', 'közösségi adószám', 'postacím: település', 'település', 'fizetési határidő (nap)']);
  assert.deepEqual(mapping, { billing_name: 0, billing_city: 4, eu_vat_number: 2, payment_term_days: 5 });
  assert.equal(suggestPartnerColumns(['név', 'nev']).billing_name, undefined);
});
test('matches normalized exact names, keeps company suffixes and ignores other tenants', () => {
  assert.equal(review(file(['arviz tarsai kft', '', '', '', '']))[0].clientId, 'one');
  for (const name of ['Árvíz & Társai', 'Árvíz & Társai Zrt.', 'Outside Kft.']) {
    assert.equal(review(file([name, '', '', '', '']))[0].status, 'unmatched');
  }
});
test('tax match can handle a different legal name, but conflicting identity signals need review', () => {
  assert.equal(review(file(['New name', '12345678241', 'Budapest']))[0].match, 'tax');
  assert.equal(review(file(['Second Zrt.', '12345678-2-41', 'Budapest']))[0].status, 'unmatched');
});
test('duplicate customer names and repeated tax IDs do not auto-match', () => {
  const duplicateClients = [...clients, { ...clients[0], id: 'duplicate' }];
  const input = file(['Árvíz & Társai Kft.']);
  assert.equal(buildPartnerReview(input, suggestPartnerColumns(input.headers), duplicateClients, [], COMPANY)[0].status, 'unmatched');
  assert.equal(review(file(['New name', '12345678-2-41']), [profile, { ...profile, client_id: 'two' }])[0].status, 'unmatched');
});
test('only missing fields change; zero-day terms and saved names/email/city stay intact', () => {
  const input = { headers: ['partner neve', 'email cím', 'település', 'utca és házszám', 'fizetési határidő (nap)'],
    rows: [{ rowNumber: 2, values: ['Árvíz & Társai Kft.', 'new@example.invalid', 'New city', 'New street 1', '30'] }] };
  const row = review(input)[0];
  assert.equal(row.status, 'ready');
  assert.deepEqual(row.changes, ['billing_address']);
  assert.deepEqual(row.preserved.sort(), ['billing_name', 'billing_email', 'billing_city', 'payment_term_days'].sort());
  assert.equal(profile.payment_term_days, 0);
});
test('each client can receive only one row; skipping a duplicate resolves the conflict', () => {
  const input = file(['New name', '12345678-2-41', '', 'one@example.invalid'], ['Other name', '12345678-2-41', '', 'two@example.invalid']);
  assert.ok(review(input).every(row => row.status === 'blocked' && row.issues.includes('duplicate')));
  assert.deepEqual(review(input, [profile], { 3: null }).map(row => row.status), ['unchanged', 'skipped']);
});
test('manual assignments are restricted to the same company and tax conflicts block all fills', () => {
  assert.equal(review(file(['Unknown', '87654321-2-41', 'New city']), [profile], { 2: 'one' })[0].status, 'blocked');
  assert.equal(review(file(['Unknown', '', 'New city']), [profile], { 2: 'other' })[0].clientId, null);
});
test('private and domestic business tax subjects cannot be conflated', () => {
  const input = { headers: ['partner neve', 'adóalany', 'utca és házszám'], rows: [{ rowNumber: 2, values: ['Árvíz & Társai Kft.', '1', 'Street'] }] };
  assert.equal(review(input, [{ ...profile, tax_subject: -1, tax_number: null }])[0].status, 'blocked');
});
test('country names normalize; invalid email, unknown countries and fractional terms need review', () => {
  assert.equal(normalizePartnerCountry('Magyarország'), 'HU');
  assert.equal(normalizePartnerCountry('Germany'), 'DE');
  assert.equal(normalizePartnerCountry('Németország'), 'DE');
  assert.equal(normalizePartnerCountry('unknown'), null);
  const mapping = { billing_email: 0, billing_country_code: 1, payment_term_days: 2 };
  assert.deepEqual(readPartnerRow({ rowNumber: 2, values: ['bad email', 'unknown', '1.5'] }, mapping).invalidFields.sort(), Object.keys(mapping).sort());
  assert.equal(readPartnerRow({ rowNumber: 2, values: ['0000'] }, { billing_postal_code: 0 }).data.billing_postal_code, '0000');
});
test('client-code matching requires an explicit matching column, not the provider partner ID', () => {
  const input = file(['Unrelated name', '', '', 'new@example.invalid', 'TWO']);
  assert.equal(review(input)[0].clientId, null);
  const mapping = { ...suggestPartnerColumns(input.headers), client_code: 4 };
  assert.equal(buildPartnerReview(input, mapping, clients, [profile], COMPANY)[0].match, 'code');
  input.rows[0].values[4] = 'T-W-O';
  assert.equal(buildPartnerReview(input, mapping, clients, [profile], COMPANY)[0].clientId, null);
});
