create index if not exists client_billing_profiles_client_company_idx
  on public.client_billing_profiles (client_id, company_id);
