create table if not exists public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  status varchar(16) not null default 'PENDING' check (status in ('PENDING', 'APPROVED', 'REJECTED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leave_requests_end_after_start check (end_date >= start_date)
);

create index if not exists leave_requests_user_id_idx on public.leave_requests (user_id);
create index if not exists leave_requests_company_id_idx on public.leave_requests (company_id);
create index if not exists leave_requests_status_idx on public.leave_requests (status);

create or replace function public.set_leave_requests_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_leave_requests_updated_at on public.leave_requests;

create trigger set_leave_requests_updated_at
before update on public.leave_requests
for each row
execute function public.set_leave_requests_updated_at();

create unique index if not exists leave_requests_non_overlapping_idx
on public.leave_requests (
  user_id,
  start_date,
  end_date
)
where status in ('PENDING', 'APPROVED');
