-- profiles: 1:1 extension of auth.users, populated automatically on signup.
--
-- display_name stays authoritative as the rendered label (it is not null and
-- every existing policy/query reads it); first_name/last_name are the
-- structured fields a roster sorts on. phone is nullable and unused for now
-- -- players are reached via push, but coaches will want a fallback contact
-- once rosters leave the app.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  first_name text,
  last_name text,
  phone text
);

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

-- Populates a profile row whenever a new auth user is created. Signup sends
-- first_name/last_name, so display_name is composed from them; the original
-- display_name -> full_name -> email-local-part chain is kept underneath as a
-- fallback for OAuth providers and any caller still sending a single name.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_first text := nullif(trim(new.raw_user_meta_data ->> 'first_name'), '');
  v_last text := nullif(trim(new.raw_user_meta_data ->> 'last_name'), '');
begin
  insert into public.profiles (id, first_name, last_name, display_name, avatar_url)
  values (
    new.id,
    v_first,
    v_last,
    coalesce(
      nullif(trim(concat_ws(' ', v_first, v_last)), ''),
      new.raw_user_meta_data ->> 'display_name',
      new.raw_user_meta_data ->> 'full_name',
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Keeps display_name in lockstep with the structured fields so every existing
-- consumer of display_name stays correct after a profile edit, without the
-- client having to send a redundant third value. Only overwrites when the
-- structured fields actually carry a name, so a profile that only ever had a
-- display_name is never blanked.
create or replace function public.sync_profile_display_name()
returns trigger
language plpgsql
as $$
begin
  if nullif(trim(concat_ws(' ', new.first_name, new.last_name)), '') is not null then
    new.display_name := trim(concat_ws(' ', new.first_name, new.last_name));
  end if;
  return new;
end;
$$;

create trigger sync_profiles_display_name
  before insert or update of first_name, last_name on public.profiles
  for each row
  execute function public.sync_profile_display_name();

alter table public.profiles enable row level security;

-- Note: "profiles_select_teammates" lives in 02_teams.sql -- it depends on
-- shares_team_with(), which is defined there once team_members exists.
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Fallback path; the primary insert path is the handle_new_user() trigger.
create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

grant select, update, insert on public.profiles to authenticated;
grant select, insert, update, delete on public.profiles to service_role;
