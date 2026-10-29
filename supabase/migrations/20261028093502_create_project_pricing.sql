-- Project rates are independent of the single-rate client invoicing workflow.
alter table public.projects
  add constraint projects_id_company_id_key unique (id, company_id);

create table public.project_pricing (
  project_id uuid not null,
  company_id uuid not null,
  pricing_year smallint not null check (pricing_year between 2000 and 9999),
  original_fee numeric(18, 4) check (original_fee >= 0),
  original_fee_text text,
  indexed_fee numeric(18, 4) check (indexed_fee >= 0),
  unit text not null check (btrim(unit) <> ''),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  contract_indexation text,
  indexation_basis text,
  attachment_note text,
  po_number text,
  source_file text,
  source_sheet text,
  source_row integer check (source_row > 0),
  source_sha256 text check (source_sha256 ~ '^[a-f0-9]{64}$'),
  source_formula text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (project_id, pricing_year),
  constraint project_pricing_project_company_fkey
    foreign key (project_id, company_id)
    references public.projects (id, company_id) on delete cascade,
  constraint project_pricing_original_fee_representation_check
    check (original_fee is null or original_fee_text is null)
);

create index project_pricing_company_year_idx
  on public.project_pricing (company_id, pricing_year, project_id);
create index project_pricing_project_company_idx
  on public.project_pricing (project_id, company_id);

create function private.set_project_pricing_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function private.set_project_pricing_updated_at()
  from public, anon, authenticated;
create trigger set_project_pricing_updated_at
before update on public.project_pricing for each row
execute function private.set_project_pricing_updated_at();

alter table public.project_pricing enable row level security;
create policy "Company admins can read project pricing"
  on public.project_pricing for select to authenticated
  using (company_id = (select private.current_billing_admin_company_id()));
create policy "Company admins can create project pricing"
  on public.project_pricing for insert to authenticated
  with check (company_id = (select private.current_billing_admin_company_id()));
create policy "Company admins can update project pricing"
  on public.project_pricing for update to authenticated
  using (company_id = (select private.current_billing_admin_company_id()))
  with check (company_id = (select private.current_billing_admin_company_id()));

revoke all on public.project_pricing from public, anon, authenticated;
grant select, insert, update on public.project_pricing to authenticated;
grant all on public.project_pricing to service_role;

comment on table public.project_pricing is
  'Annual project price references. NULL indexed_fee means no indexed price was supplied; never substitute original_fee automatically. Client invoicing continues to use client_billing_profiles.';
