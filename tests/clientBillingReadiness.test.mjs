import test from 'node:test';
import assert from 'node:assert/strict';
import { getBillingProfileReadiness } from '../src/utils/clientBillingReadiness.ts';

const profile = {
  billing_name:'Test buyer', billing_country_code:'US', billing_postal_code:'10001',
  billing_city:'New York', billing_address:'Test street 1', tax_subject:7,
  tax_number:'US123456789', eu_vat_number:null, billing_email:null,
  send_invoice_email:false, net_unit_price:100, payment_method:'Átutalás',
  invoice_item_name:'Service', invoice_unit:'hour', vat_code:'HO',
};
test('Non-EU business readiness requires its tax number', () => {
  assert.equal(getBillingProfileReadiness(profile).complete,true);
  assert.ok(getBillingProfileReadiness({...profile,tax_number:null}).missingFields.includes('taxNumber'));
});
test('Billing readiness rejects invalid prices and allows a zero price', () => {
  for (const net_unit_price of [null,-1,NaN,Infinity]) {
    assert.ok(getBillingProfileReadiness({...profile,net_unit_price}).missingFields.includes('netUnitPrice'));
  }
  assert.equal(getBillingProfileReadiness({...profile,net_unit_price:0}).complete,true);
});
