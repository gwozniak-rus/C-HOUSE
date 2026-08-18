-- Announcements/reminders: same pinned, persistent, draft/publish pattern as practice plans.

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  title text not null,
  body text not null,
  reminder_at timestamptz,
  published_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index announcements_team_id_published_at_idx on public.announcements (team_id, published_at desc);

create trigger set_announcements_updated_at
  before update on public.announcements
  for each row
  execute function public.set_updated_at();

alter table public.announcements enable row level security;

create policy "announcements_select"
  on public.announcements for select
  to authenticated
  using (
    (select is_team_coach(team_id))
    or ((select is_team_member(team_id)) and published_at is not null)
  );

create policy "announcements_coaches_write"
  on public.announcements for all
  to authenticated
  using ((select is_team_coach(team_id)))
  with check ((select is_team_coach(team_id)));

grant select, insert, update, delete on public.announcements to authenticated;
grant select, insert, update, delete on public.announcements to service_role;
