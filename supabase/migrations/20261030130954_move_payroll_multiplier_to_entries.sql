-- The project only identifies payroll work; each entry owns its billing factor.
alter table public.projects add column is_payroll boolean not null default false;
alter table public.timesheets add column billing_multiplier integer not null default 1;
alter table public.timesheets add constraint timesheets_billing_multiplier_positive
  check (billing_multiplier > 0);

update public.projects set is_payroll = true where payroll_headcount is not null;

-- Preserve existing billing totals, including archived, leave-locked and reserved
-- entries. This metadata backfill must not run ordinary entry-edit triggers.
-- The exclusive lock prevents writes until all original trigger modes are restored.
do $$
declare
  saved_triggers jsonb;
  saved_trigger record;
begin
  lock table public.timesheets in access exclusive mode;
  select coalesce(jsonb_agg(jsonb_build_object('name', tgname, 'mode', tgenabled)), '[]')
    into saved_triggers from pg_trigger
    where tgrelid = 'public.timesheets'::regclass and not tgisinternal and tgenabled <> 'D';
  for saved_trigger in select * from jsonb_to_recordset(saved_triggers) as t(name text, mode text) loop
    execute format('alter table public.timesheets disable trigger %I', saved_trigger.name);
  end loop;
  update public.timesheets entry set billing_multiplier = project.payroll_headcount
    from public.projects project
    where project.id = entry.project_id and project.company_id = entry.company_id
      and project.client_id = entry.client_id and project.payroll_headcount is not null;
  for saved_trigger in select * from jsonb_to_recordset(saved_triggers) as t(name text, mode text) loop
    execute format('alter table public.timesheets enable %s trigger %I',
      case saved_trigger.mode when 'A' then 'always' when 'R' then 'replica' else '' end,
      saved_trigger.name);
  end loop;
end;
$$;

comment on column public.projects.is_payroll is
  'Shows the per-entry billing multiplier input. No project-wide billing factor.';
comment on column public.projects.payroll_headcount is
  'Legacy migration source only. Billing uses timesheets.billing_multiplier.';
comment on column public.timesheets.billing_multiplier is
  'Positive whole-number multiplier for this entry. Invoice and attachment hours use hours_logged times this value; logged time is unchanged.';

-- Existing saved multipliers survive later project flag changes. New factors
-- above 1 can only be chosen on payroll projects within the entry tenant/client.
create or replace function public.check_timesheet_billing_multiplier()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    if row(new.project_id, new.company_id, new.client_id, new.billing_multiplier)
      is not distinct from row(old.project_id, old.company_id, old.client_id, old.billing_multiplier) then
      return new;
    end if;
  end if;
  if new.billing_multiplier <> 1 and not exists (
    select 1 from public.projects project
      where project.id = new.project_id and project.company_id = new.company_id
        and project.client_id = new.client_id and project.is_payroll
  ) then
    raise exception 'A billing multiplier is only available for payroll projects' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function public.check_timesheet_billing_multiplier() from public, anon, authenticated;
create trigger check_timesheet_billing_multiplier
  before insert or update of project_id, company_id, client_id, billing_multiplier on public.timesheets
  for each row execute function public.check_timesheet_billing_multiplier();
