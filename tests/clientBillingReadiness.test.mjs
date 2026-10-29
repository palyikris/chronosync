import test from 'node:test';
import assert from 'node:assert/strict';
import { getBillingProfileReadiness } from '../src/utils/clientBillingReadiness.ts';

const profile = {
  billing_name:'Test buyer', billing_country_code:'US', billing_postal_code:'10001',
  billing_city:'New York', billing_address:'Test street 1', tax_subject:7,
  tax_number:'US123456789', eu_vat_number:null, group_tax_number:null, billing_email:null,
  send_invoice_email:false, net_unit_price:100, payment_method:'Átutalás',
  invoice_item_name:'Service', invoice_unit:'hour', vat_code:'HO',
};
test('Non-EU business readiness requires its tax number', () => {
  assert.equal(getBillingProfileReadiness(profile).complete,true);
  assert.ok(getBillingProfileReadiness({...profile,tax_number:null}).missingFields.includes('taxNumber'));
});
test('VAT group readiness requires a domestic member ID and group tax number', () => {
  const group = {...profile, tax_subject:1, tax_number:'12345678-4-41', group_tax_number:'17781228-5-44'};
  assert.equal(getBillingProfileReadiness(group).complete,true);
  assert.ok(getBillingProfileReadiness({...group,tax_number:'12345678-2-41'}).missingFields.includes('taxNumber'));
  assert.ok(getBillingProfileReadiness({...group,group_tax_number:'17781228-4-44'}).missingFields.includes('groupTaxNumber'));
  assert.ok(getBillingProfileReadiness({...group,tax_subject:7}).missingFields.includes('taxSubject'));
});
test('A private recipient with stored business identifiers is not ready to invoice', () => {
  assert.ok(getBillingProfileReadiness({...profile,tax_subject:-1}).missingFields.includes('taxNumber'));
});
test('A single-line profile cannot represent margin-scheme VAT', () => {
  assert.ok(getBillingProfileReadiness({...profile,vat_code:'K.AFA'}).missingFields.includes('vatCode'));
});
test('Recipient readiness is independent of deprecated client-level prices', () => {
  for (const net_unit_price of [null,-1,NaN,Infinity]) {
    assert.equal(getBillingProfileReadiness({...profile,net_unit_price}).complete, true);
  }
  assert.equal(getBillingProfileReadiness({...profile,net_unit_price:0}).complete,true);
});
