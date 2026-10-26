create table public.user_favorite_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  description text not null check (char_length(btrim(description)) between 1 and 2000),
  hours_logged numeric not null check (hours_logged > 0 and hours_logged <= 24),
  created_at timestamptz not null default now()
);

create index user_favorite_tasks_user_created_idx
  on public.user_favorite_tasks (user_id, created_at, id);
create index user_favorite_tasks_project_idx
  on public.user_favorite_tasks (project_id);

alter table public.user_favorite_tasks enable row level security;
revoke all on public.user_favorite_tasks from anon;
grant select, insert, update, delete on public.user_favorite_tasks to authenticated, service_role;

create policy "Users read their own favourite tasks"
  on public.user_favorite_tasks for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Users create own favourite tasks"
  on public.user_favorite_tasks for insert to authenticated
  with check (
    user_id = (select auth.uid()) and exists (
      select 1 from public.projects p
      join public.clients c on c.id = p.client_id and c.company_id = p.company_id
      where p.id = user_favorite_tasks.project_id and p.is_active and c.is_active
        and p.company_id = (select public.get_auth_company_id())
    )
  );

create policy "Users update own favourite tasks"
  on public.user_favorite_tasks for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid()) and exists (
      select 1 from public.projects p
      join public.clients c on c.id = p.client_id and c.company_id = p.company_id
      where p.id = user_favorite_tasks.project_id and p.is_active and c.is_active
        and p.company_id = (select public.get_auth_company_id())
    )
  );

create policy "Users delete their own favourite tasks"
  on public.user_favorite_tasks for delete to authenticated
  using (user_id = (select auth.uid()));
