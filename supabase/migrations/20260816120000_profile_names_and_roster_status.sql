-- Structured profile names, roster status, and a pre-join code preview.
--
-- display_name stays authoritative as the rendered label (it is not null and
-- every existing policy/query reads it); first_name/last_name are the
-- structured fields a roster sorts on. phone/email are added nullable and
-- unused for now -- players are reached via push, but coaches will want a
-- fallback contact once rosters leave the app.

alter table public.profiles
  add column first_name text,
  add column last_name text,
  add column phone text;

-- Backfill from the single name field collected by the old signup form,
-- splitting on the first space. A one-word name becomes first_name only.
update public.profiles
set
  first_name = nullif(split_part(display_name, ' ', 1), ''),
  last_name = case
    when strpos(display_name, ' ') > 0
      then nullif(trim(substr(display_name, strpos(display_name, ' ') + 1)), '')
    else null
  end
where first_name is null;

-- Replaces the version in 20260809224941_profiles.sql. Signup now sends
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

-- Roster status is a label only (injured, quit, off-season) -- deliberately
-- NOT an access gate. is_team_member() stays status-blind, so an inactive
-- player still sees team content; actually removing someone is a delete on
-- team_members, already allowed by team_members_delete_self_or_coach.
alter table public.team_members
  add column status text not null default 'active'
  check (status in ('active', 'inactive'));

-- team_invite_codes is coach-only under RLS and teams requires membership, so
-- a player holding a code has no way to see which team it belongs to before
-- committing. This exposes exactly the team name, and only for a code that is
-- currently redeemable -- the same conditions redeem_invite_code() enforces.
create or replace function public.preview_invite_code(p_code text)
returns table (team_id uuid, team_name text, role text)
language sql
stable
security definer
set search_path = public
as $$
  select t.id, t.name, c.role
  from team_invite_codes c
  join teams t on t.id = c.team_id
  where c.code = p_code
    and c.revoked_at is null
    and (c.expires_at is null or c.expires_at > now())
    and (c.max_uses is null or c.uses_count < c.max_uses);
$$;

revoke execute on function public.preview_invite_code(text) from public;
grant execute on function public.preview_invite_code(text) to authenticated;
