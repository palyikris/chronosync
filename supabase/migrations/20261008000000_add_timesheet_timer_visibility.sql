alter table public.profiles
  add column if not exists show_timesheet_timer boolean not null default false;

update public.profiles
set show_timesheet_timer = false
where show_timesheet_timer is null;