create schema if not exists private;

revoke all on schema private from public;

create or replace function private.current_billing_admin_company_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select profile.company_id
  from public.profiles as profile
  join public.companies as company on company.id = profile.company_id
  where profile.id = (select auth.uid())
    and profile.role = 'company_admin'
    and profile.is_active = true
    and company.is_active = true
    and company.is_deleted = false
  limit 1;
$$;

revoke all on function private.current_billing_admin_company_id() from public;
grant usage on schema private to authenticated, service_role;
grant execute on function private.current_billing_admin_company_id()
  to authenticated, service_role;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.clients'::regclass
      and conname = 'clients_id_company_id_key'
  ) then
    alter table public.clients
      add constraint clients_id_company_id_key unique (id, company_id);
  end if;
end;
$$;

create table if not exists public.client_billing_profiles (
  client_id uuid primary key,
  company_id uuid not null,
  billing_name text,
  billing_country_code text not null default 'HU',
  billing_postal_code text,
  billing_city text,
  billing_address text,
  tax_subject smallint,
  tax_number text,
  eu_vat_number text,
  group_tax_number text,
  billing_email text,
  send_invoice_email boolean not null default false,
  invoice_language text not null default 'hu',
  currency text not null default 'HUF',
  payment_method text not null default 'Átutalás',
  payment_term_days smallint not null default 8,
  billing_model text not null default 'hourly',
  net_unit_price numeric(14, 4),
  invoice_unit text not null default 'óra',
  vat_code text not null default '27',
  invoice_item_name text not null default 'Szolgáltatás',
  automatic_invoicing_enabled boolean not null default false,
  invoice_schedule_day smallint not null default 1,
  attach_timesheet_report boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_billing_profiles_client_company_fkey
    foreign key (client_id, company_id)
    references public.clients (id, company_id)
    on delete cascade,
  constraint client_billing_profiles_country_code_check
    check (billing_country_code ~ '^[A-Z]{2}$'),
  constraint client_billing_profiles_tax_subject_check
    check (tax_subject is null or tax_subject in (-1, 0, 1, 6, 7)),
  constraint client_billing_profiles_language_check
    check (
      invoice_language in (
        'hu', 'en', 'de', 'it', 'ro', 'sk', 'hr', 'fr',
        'es', 'cz', 'pl', 'bg', 'nl', 'ru', 'si'
      )
    ),
  constraint client_billing_profiles_currency_check
    check (currency ~ '^[A-Z]{3}$'),
  constraint client_billing_profiles_payment_term_check
    check (payment_term_days between 0 and 365),
  constraint client_billing_profiles_billing_model_check
    check (billing_model in ('hourly', 'fixed_monthly')),
  constraint client_billing_profiles_unit_price_check
    check (net_unit_price is null or net_unit_price >= 0),
  constraint client_billing_profiles_schedule_day_check
    check (invoice_schedule_day between 1 and 28),
  constraint client_billing_profiles_non_empty_defaults_check
    check (
      btrim(payment_method) <> ''
      and btrim(invoice_unit) <> ''
      and btrim(vat_code) <> ''
      and btrim(invoice_item_name) <> ''
    ),
  constraint client_billing_profiles_automation_ready_check
    check (
      automatic_invoicing_enabled = false
      or (
        nullif(btrim(billing_name), '') is not null
        and nullif(btrim(billing_postal_code), '') is not null
        and nullif(btrim(billing_city), '') is not null
        and nullif(btrim(billing_address), '') is not null
        and tax_subject is not null
        and net_unit_price is not null
        and (
          tax_subject <> 1
          or nullif(btrim(tax_number), '') is not null
        )
        and (
          tax_subject <> 6
          or nullif(btrim(eu_vat_number), '') is not null
        )
        and (
          send_invoice_email = false
          or nullif(btrim(billing_email), '') is not null
        )
      )
    )
);

create index if not exists client_billing_profiles_company_id_idx
  on public.client_billing_profiles (company_id, client_id);

create index if not exists client_billing_profiles_automation_idx
  on public.client_billing_profiles (company_id, invoice_schedule_day, client_id)
  where automatic_invoicing_enabled = true;

create or replace function private.set_client_billing_profile_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function private.set_client_billing_profile_updated_at()
  from public, anon, authenticated;

drop trigger if exists set_client_billing_profile_updated_at
  on public.client_billing_profiles;

create trigger set_client_billing_profile_updated_at
before update on public.client_billing_profiles
for each row
execute function private.set_client_billing_profile_updated_at();

insert into public.client_billing_profiles (
  client_id,
  company_id,
  billing_name,
  invoice_language
)
select
  client.id,
  client.company_id,
  client.name,
  coalesce(client.invoice_attachment_language::text, 'hu')
from public.clients as client
on conflict (client_id) do nothing;

alter table public.client_billing_profiles enable row level security;

drop policy if exists "Company admins can read client billing profiles"
  on public.client_billing_profiles;
create policy "Company admins can read client billing profiles"
  on public.client_billing_profiles
  for select
  to authenticated
  using (
    company_id = (
      select private.current_billing_admin_company_id()
    )
  );

drop policy if exists "Company admins can create client billing profiles"
  on public.client_billing_profiles;
create policy "Company admins can create client billing profiles"
  on public.client_billing_profiles
  for insert
  to authenticated
  with check (
    company_id = (
      select private.current_billing_admin_company_id()
    )
  );

drop policy if exists "Company admins can update client billing profiles"
  on public.client_billing_profiles;
create policy "Company admins can update client billing profiles"
  on public.client_billing_profiles
  for update
  to authenticated
  using (
    company_id = (
      select private.current_billing_admin_company_id()
    )
  )
  with check (
    company_id = (
      select private.current_billing_admin_company_id()
    )
  );

revoke all on table public.client_billing_profiles from anon, authenticated;
grant select, insert, update on table public.client_billing_profiles
  to authenticated;
