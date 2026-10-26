-- Run only in an empty temporary PostgreSQL database, never against a hosted project.
create role anon;
create role authenticated;
create role service_role bypassrls;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
grant usage on schema auth to authenticated, anon;
create table public.profiles (id uuid primary key, company_id uuid not null);
create table public.clients (id uuid primary key, company_id uuid not null, is_active boolean not null default true);
create table public.projects (id uuid primary key, client_id uuid references clients(id), company_id uuid not null, is_active boolean not null default true);
create function public.get_auth_company_id() returns uuid language sql stable as $$
  select company_id from public.profiles where id = auth.uid();
$$;
grant select on profiles, clients, projects to authenticated;
insert into profiles values
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000010'),
  ('00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000010');
insert into clients values
  ('00000000-0000-4000-8000-000000000020', '00000000-0000-4000-8000-000000000010', true),
  ('00000000-0000-4000-8000-000000000021', '00000000-0000-4000-8000-000000000011', true),
  ('00000000-0000-4000-8000-000000000022', '00000000-0000-4000-8000-000000000010', false);
insert into projects values
  ('00000000-0000-4000-8000-000000000030', '00000000-0000-4000-8000-000000000020', '00000000-0000-4000-8000-000000000010', true),
  ('00000000-0000-4000-8000-000000000031', '00000000-0000-4000-8000-000000000021', '00000000-0000-4000-8000-000000000011', true),
  ('00000000-0000-4000-8000-000000000032', '00000000-0000-4000-8000-000000000020', '00000000-0000-4000-8000-000000000010', false),
  ('00000000-0000-4000-8000-000000000033', '00000000-0000-4000-8000-000000000022', '00000000-0000-4000-8000-000000000010', true);
\ir ../../supabase/migrations/20261026143159_create_user_favorite_tasks.sql
-- Seed old task templates to verify conversion preserves project favourites and deduplicates them.
insert into public.user_favorite_tasks (id, user_id, project_id, description, hours_logged) values
  ('00000000-0000-4000-8000-000000000040', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000030', 'Planning', 0.25),
  ('00000000-0000-4000-8000-000000000041', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000030', 'Different description', 8);
\ir ../../supabase/migrations/20261026145817_convert_favorites_to_projects.sql
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-8000-000000000001';
do $$
begin
  if (select count(*) from user_favorite_projects) <> 1 then raise exception 'Project conversion lost or duplicated favourites'; end if;
  if exists(select 1 from information_schema.columns where table_schema = 'public' and table_name = 'user_favorite_projects' and column_name in ('description', 'hours_logged')) then
    raise exception 'Favourite projects still store description or duration';
  end if;
  begin
    insert into user_favorite_projects(user_id, project_id) values
      ('00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000030');
    raise exception 'Spoofed ownership was accepted';
  exception when insufficient_privilege then null; end;
  for i in 31..33 loop
    begin
      insert into user_favorite_projects(project_id) values
        (('00000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid);
      raise exception 'Foreign-company or inactive project was accepted';
    exception when insufficient_privilege then null; end;
  end loop;
  begin
    update user_favorite_projects set user_id = '00000000-0000-4000-8000-000000000002';
    raise exception 'Ownership transfer was accepted';
  exception when insufficient_privilege then null; end;
  begin
    insert into user_favorite_projects(project_id) values ('00000000-0000-4000-8000-000000000030');
    raise exception 'A duplicate favourite project was accepted';
  exception when unique_violation then null; end;
end $$;
insert into user_favorite_projects(project_id) values ('00000000-0000-4000-8000-000000000030')
  on conflict (user_id, project_id) do update set project_id = excluded.project_id;
do $$
begin
  if (select count(*) from user_favorite_projects) <> 1 then raise exception 'Upsert duplicated the favourite project'; end if;
end $$;
set request.jwt.claim.sub = '00000000-0000-4000-8000-000000000002';
do $$
declare changed integer;
begin
  if exists(select 1 from user_favorite_projects) then raise exception 'Another user can read favourites'; end if;
  update user_favorite_projects set project_id = project_id;
  get diagnostics changed = row_count;
  if changed <> 0 then raise exception 'Another user can update favourites'; end if;
  delete from user_favorite_projects;
  get diagnostics changed = row_count;
  if changed <> 0 then raise exception 'Another user can delete favourites'; end if;
end $$;
set role anon;
do $$
begin
  begin
    perform * from public.user_favorite_projects;
    raise exception 'Anonymous access was accepted';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
update projects set is_active = false where id = '00000000-0000-4000-8000-000000000030';
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-8000-000000000001';
do $$
begin
  if (select count(*) from user_favorite_projects) <> 1 then raise exception 'Archived favourites cannot be managed'; end if;
end $$;
delete from user_favorite_projects;
do $$
begin
  if exists(select 1 from user_favorite_projects) then raise exception 'Owner cannot remove archived favourite'; end if;
end $$;
reset role;
select 'Project conversion, uniqueness, and access controls passed' as result;
