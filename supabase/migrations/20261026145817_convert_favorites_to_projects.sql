-- Favourites now identify a project; entry descriptions and durations stay on entries.
alter table public.user_favorite_tasks rename to user_favorite_projects;
alter table public.user_favorite_projects
  drop column description,
  drop column hours_logged;

-- Preserve one existing favourite per user/project if several task templates used it.
delete from public.user_favorite_projects duplicate
using public.user_favorite_projects retained
where duplicate.user_id = retained.user_id
  and duplicate.project_id = retained.project_id
  and (duplicate.created_at, duplicate.id) > (retained.created_at, retained.id);

alter table public.user_favorite_projects
  add constraint user_favorite_projects_user_project_key unique (user_id, project_id);
alter index public.user_favorite_tasks_user_created_idx rename to user_favorite_projects_user_created_idx;
alter index public.user_favorite_tasks_project_idx rename to user_favorite_projects_project_idx;
alter policy "Users read their own favourite tasks" on public.user_favorite_projects rename to "Users read own favourite projects";
alter policy "Users create own favourite tasks" on public.user_favorite_projects rename to "Users create own favourite projects";
alter policy "Users update own favourite tasks" on public.user_favorite_projects rename to "Users update own favourite projects";
alter policy "Users delete their own favourite tasks" on public.user_favorite_projects rename to "Users delete own favourite projects";
