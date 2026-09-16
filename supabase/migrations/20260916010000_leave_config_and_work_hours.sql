alter table public.companies
  add column if not exists leave_client_id uuid references public.clients(id) on delete set null,
  add column if not exists leave_project_id uuid references public.projects(id) on delete set null;

alter table public.profiles
  add column if not exists weekly_work_hours numeric(4,1) check (weekly_work_hours > 0 and weekly_work_hours <= 80);

alter table public.leave_requests
  add column if not exists weekly_work_hours numeric(4,1) null,
  add column if not exists hours_taken numeric(6,2) null;

create index if not exists companies_leave_client_id_idx
  on public.companies (leave_client_id);

create index if not exists companies_leave_project_id_idx
  on public.companies (leave_project_id);

create index if not exists profiles_weekly_work_hours_idx
  on public.profiles (weekly_work_hours);

create index if not exists leave_requests_weekly_work_hours_idx
  on public.leave_requests (weekly_work_hours);

create index if not exists leave_requests_hours_taken_idx
  on public.leave_requests (hours_taken);
