import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPartnerReview, suggestPartnerColumns, normalizePartnerCountry, normalizePartnerTaxSubject, readPartnerRow } from '../src/utils/partnerBillingImport.ts';

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
test('fills missing fields and appends email while preserving saved names, cities and zero-day terms', () => {
  const input = { headers: ['partner neve', 'email cím', 'település', 'utca és házszám', 'fizetési határidő (nap)'],
    rows: [{ rowNumber: 2, values: ['Árvíz & Társai Kft.', 'new@example.invalid', 'New city', 'New street 1', '30'] }] };
  const row = review(input)[0];
  assert.equal(row.status, 'ready');
  assert.deepEqual(row.changes, ['billing_address', 'billing_email']);
  assert.deepEqual(row.preserved.sort(), ['billing_name', 'billing_city', 'payment_term_days'].sort());
  assert.equal(profile.payment_term_days, 0);
});
test('each client can receive only one row; skipping a duplicate resolves the conflict', () => {
  const input = file(['New name', '12345678-2-41', '', 'one@example.invalid'], ['Other name', '12345678-2-41', '', 'two@example.invalid']);
  assert.ok(review(input).every(row => row.status === 'blocked' && row.issues.includes('duplicate')));
  assert.deepEqual(review(input, [profile], { 3: null }).map(row => row.status), ['ready', 'skipped']);
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

test('recognizes all exported tax-subject labels and preserves numeric codes', () => {
  const labels = [
    ['van magyar adószáma', 1], ['EU-s vállalkozás', 6], ['EU-n kívüli vállalkozás', 7],
    ['nem tudjuk hogy a vásárló adóalany-e', 0], ['nincs adószáma', -1],
    ['nincs adószáma (azaz nincs magyar adószáma)', -1],
  ];
  for (const [label, subject] of labels) {
    for (const value of [label, ` ${label.toUpperCase()} `, label.normalize('NFKD').replace(/\p{M}/gu, ''), String(subject)]) {
      const parsed = readPartnerRow({ rowNumber: 2, values: [value] }, { tax_subject: 0 });
      assert.equal(parsed.data.tax_subject, subject, value);
      assert.deepEqual(parsed.invalidFields, []);
    }
  }
  assert.equal(normalizePartnerTaxSubject('EU–s  vállalkozás'), 6);
  for (const value of ['', 'unknown', 'adóalany', 'nem EU-s vállalkozás', '2', 'true', '0x1', '1e0', '1.0']) {
    assert.equal(normalizePartnerTaxSubject(value), null, value);
  }
  assert.deepEqual(readPartnerRow({ rowNumber: 2, values: [''] }, { tax_subject: 0 }).data, {});
  assert.deepEqual(readPartnerRow({ rowNumber: 2, values: ['unknown'] }, { tax_subject: 0 }).invalidFields, ['tax_subject']);
});

test('text tax subjects fill missing status, preserve zero and block conflicting identities', () => {
  const input = { headers: ['partner neve', 'adóalany', 'utca és házszám'],
    rows: [{ rowNumber: 2, values: ['Árvíz & Társai Kft.', 'van magyar adószáma', 'Street'] }] };
  const row = review(input, [{ ...profile, tax_subject: null }])[0];
  assert.equal(row.status, 'ready');
  assert.equal(row.data.tax_subject, 1);
  assert.ok(row.changes.includes('tax_subject'));
  assert.equal(review(input, [{ ...profile, tax_subject: 0 }])[0].status, 'blocked');
  input.rows[0].values[1] = 'nincs adószáma';
  assert.ok(review(input)[0].issues.includes('identityConflict'));
  assert.equal(review(input, [{ ...profile, tax_subject: null, tax_number: null }])[0].status, 'ready');
});

test('multiple billing emails need an explicit choice or omission for that row', () => {
  const source = { rowNumber: 2, values: [' first@example.invalid, second@example.invalid;first@example.invalid\nthird@example.invalid '] };
  const mapping = { billing_email: 0 };
  const parsed = readPartnerRow(source, mapping);
  assert.deepEqual(parsed.emailOptions, ['first@example.invalid', 'second@example.invalid', 'third@example.invalid']);
  assert.deepEqual(parsed.invalidFields, ['billing_email']);
  assert.equal(parsed.data.billing_email, undefined);
  assert.equal(readPartnerRow(source, mapping, ['first@example.invalid', 'third@example.invalid']).data.billing_email,
    'first@example.invalid,third@example.invalid');
  assert.deepEqual(readPartnerRow(source, mapping, []).invalidFields, []);
  assert.deepEqual(readPartnerRow(source, mapping, []).data, {});
  assert.deepEqual(readPartnerRow(source, mapping, ['not-in-file@example.invalid']).invalidFields, ['billing_email']);
  assert.equal(readPartnerRow({ ...source, values: ['same@example.invalid; SAME@example.invalid'] }, mapping).data.billing_email, 'same@example.invalid');
  // A malformed address cannot silently become a different valid recipient.
  const malformed = { ...source, values: ['valid@example.invalid, broken email'] };
  assert.deepEqual(readPartnerRow(malformed, mapping).invalidFields, ['billing_email']);
  assert.equal(readPartnerRow(malformed, mapping, ['valid@example.invalid']).data.billing_email, 'valid@example.invalid');
  assert.deepEqual(readPartnerRow({ ...source, values: ['broken email'] }, mapping, []).invalidFields, []);
  const allEmails = Array.from({ length: 20 }, (_, index) => `person-${index}@example.invalid`);
  assert.ok(allEmails.join(',').length > 255);
  assert.equal(readPartnerRow({ ...source, values: [allEmails.join(', ')] }, mapping, allEmails).data.billing_email,
    allEmails.join(','));
});

test('email choices unblock only their own row and only report new addresses as changes', () => {
  const input = file(['Árvíz & Társai Kft.', '', 'Budapest', 'SAVED@example.invalid, second@example.invalid'],
    ['Second Zrt.', '', 'Szeged', 'third@example.invalid; fourth@example.invalid']);
  const mapping = suggestPartnerColumns(input.headers);
  const profiles = [{ ...profile, billing_city: null }];
  const unresolved = buildPartnerReview(input, mapping, clients, profiles, COMPANY);
  assert.ok(unresolved.every(row => row.status === 'blocked'));
  const selected = buildPartnerReview(input, mapping, clients, profiles, COMPANY, {}, { 2: ['SAVED@example.invalid', 'second@example.invalid'] });
  assert.equal(selected[0].status, 'ready');
  assert.ok(selected[0].changes.includes('billing_email'));
  assert.equal(selected[0].data.billing_email, 'second@example.invalid');
  assert.equal(selected[1].status, 'blocked');
  const skipped = buildPartnerReview(input, mapping, clients, profiles, COMPANY, {}, { 2: [], 3: [] });
  assert.ok(skipped.every(row => row.status === 'ready' && !Object.hasOwn(row.data, 'billing_email')));
  assert.equal(profile.billing_email, 'saved@example.invalid');
});
