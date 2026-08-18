-- Teams, roster membership, and invite-code based join flow.

-- Generates a human-friendly invite code, avoiding visually ambiguous
-- characters (0/O, 1/I/L).
create or replace function public.generate_invite_code()
returns text
language plpgsql
as $$
declare
  v_chars text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  v_code text := '';
  i integer;
begin
  for i in 1..8 loop
    v_code := v_code || substr(v_chars, floor(random() * length(v_chars) + 1)::int, 1);
  end loop;
  return v_code;
end;
$$;

grant execute on function public.generate_invite_code() to authenticated, service_role;

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  primary_color text check (primary_color is null or primary_color ~ '^#[0-9a-fA-F]{6}$'),
  secondary_color text check (secondary_color is null or secondary_color ~ '^#[0-9a-fA-F]{6}$'),
  logo_path text,
  timezone text not null default 'America/New_York',
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_teams_updated_at
  before update on public.teams
  for each row
  execute function public.set_updated_at();

create table public.team_invite_codes (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  code text not null unique default public.generate_invite_code(),
  role text not null default 'player' check (role in ('coach', 'player')),
  max_uses integer check (max_uses is null or max_uses > 0),
  uses_count integer not null default 0,
  expires_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid references public.profiles (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  check (max_uses is null or uses_count <= max_uses)
);

create index team_invite_codes_team_id_idx on public.team_invite_codes (team_id);

-- Roster status is a label only (injured, quit, off-season) -- deliberately
-- NOT an access gate. is_team_member() stays status-blind, so an inactive
-- player still sees team content; actually removing someone is a delete on
-- team_members, already allowed by team_members_delete_self_or_coach.
create table public.team_members (
  team_id uuid not null references public.teams (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('coach', 'player')),
  invited_via_code_id uuid references public.team_invite_codes (id) on delete set null,
  joined_at timestamptz not null default now(),
  status text not null default 'active' check (status in ('active', 'inactive')),
  primary key (team_id, user_id)
);

create index team_members_user_id_idx on public.team_members (user_id);
create index team_members_team_id_role_idx on public.team_members (team_id, role);

-- Security-definer helpers used throughout RLS policies. Because they run
-- as the function owner (the migration role), they bypass RLS on
-- team_members internally, which is what breaks the recursion a policy on
-- team_members would otherwise hit if it subqueried team_members directly.
create or replace function public.is_team_member(p_team_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from team_members tm
    where tm.team_id = p_team_id and tm.user_id = p_user_id
  );
$$;

create or replace function public.is_team_coach(p_team_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from team_members tm
    where tm.team_id = p_team_id and tm.user_id = p_user_id and tm.role = 'coach'
  );
$$;

create or replace function public.shares_team_with(p_other_user_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from team_members a
    join team_members b on a.team_id = b.team_id
    where a.user_id = p_user_id and b.user_id = p_other_user_id
  );
$$;

revoke execute on function public.is_team_member(uuid, uuid) from public;
revoke execute on function public.is_team_coach(uuid, uuid) from public;
revoke execute on function public.shares_team_with(uuid, uuid) from public;
grant execute on function public.is_team_member(uuid, uuid) to authenticated, service_role;
grant execute on function public.is_team_coach(uuid, uuid) to authenticated, service_role;
grant execute on function public.shares_team_with(uuid, uuid) to authenticated, service_role;

-- Auto-enrolls a team's creator as its first coach.
create or replace function public.handle_new_team()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into team_members (team_id, user_id, role)
  values (new.id, coalesce(new.created_by, auth.uid()), 'coach')
  on conflict (team_id, user_id) do nothing;
  return new;
end;
$$;

create trigger on_team_created
  after insert on public.teams
  for each row
  execute function public.handle_new_team();

-- Blocks any update/delete that would leave a team with zero coaches.
create or replace function public.prevent_last_coach_removal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_remaining_coaches integer;
begin
  if old.role <> 'coach' then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' and new.role = 'coach' then
    return new;
  end if;

  select count(*) into v_remaining_coaches
  from team_members
  where team_id = old.team_id
    and role = 'coach'
    and user_id <> old.user_id;

  if v_remaining_coaches = 0 then
    raise exception 'Cannot remove the last coach from a team';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger prevent_last_coach_removal
  before update or delete on public.team_members
  for each row
  execute function public.prevent_last_coach_removal();

-- Primary join path for both players and additional coaches. Runs as
-- security definer so a not-yet-member caller can redeem a code without
-- needing pre-existing SELECT/INSERT rights on team_members.
create or replace function public.redeem_invite_code(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite team_invite_codes%rowtype;
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_invite
  from team_invite_codes
  where code = p_code
  for update;

  if not found then
    raise exception 'Invalid invite code';
  end if;

  if v_invite.revoked_at is not null then
    raise exception 'Invite code has been revoked';
  end if;

  if v_invite.expires_at is not null and v_invite.expires_at < now() then
    raise exception 'Invite code has expired';
  end if;

  if v_invite.max_uses is not null and v_invite.uses_count >= v_invite.max_uses then
    raise exception 'Invite code has reached its usage limit';
  end if;

  insert into team_members (team_id, user_id, role, invited_via_code_id)
  values (v_invite.team_id, v_user_id, v_invite.role, v_invite.id)
  on conflict (team_id, user_id) do nothing;

  update team_invite_codes
  set uses_count = uses_count + 1
  where id = v_invite.id;

  return v_invite.team_id;
end;
$$;

revoke execute on function public.redeem_invite_code(text) from public;
grant execute on function public.redeem_invite_code(text) to authenticated;

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

alter table public.teams enable row level security;
alter table public.team_invite_codes enable row level security;
alter table public.team_members enable row level security;

-- created_by = auth.uid() is included so a team's creator can see the row
-- immediately on INSERT ... RETURNING (e.g. Supabase JS `.insert().select()`),
-- since the AFTER INSERT trigger that adds them to team_members hasn't
-- committed yet when RETURNING's implicit SELECT check runs.
create policy "teams_select_members"
  on public.teams for select
  to authenticated
  using ((select is_team_member(id)) or created_by = auth.uid());

create policy "teams_insert_self"
  on public.teams for insert
  to authenticated
  with check (created_by = auth.uid());

create policy "teams_update_coaches"
  on public.teams for update
  to authenticated
  using ((select is_team_coach(id)))
  with check ((select is_team_coach(id)));

create policy "teams_delete_coaches"
  on public.teams for delete
  to authenticated
  using ((select is_team_coach(id)));

-- Players never read invite codes directly; joining happens exclusively
-- through the redeem_invite_code() RPC above.
create policy "team_invite_codes_coaches_all"
  on public.team_invite_codes for all
  to authenticated
  using ((select is_team_coach(team_id)))
  with check ((select is_team_coach(team_id)));

create policy "team_members_select"
  on public.team_members for select
  to authenticated
  using ((select is_team_member(team_id)));

create policy "team_members_insert_coaches"
  on public.team_members for insert
  to authenticated
  with check ((select is_team_coach(team_id)));

create policy "team_members_update_coaches"
  on public.team_members for update
  to authenticated
  using ((select is_team_coach(team_id)))
  with check ((select is_team_coach(team_id)));

create policy "team_members_delete_self_or_coach"
  on public.team_members for delete
  to authenticated
  using (user_id = auth.uid() or (select is_team_coach(team_id)));

-- Deferred from profiles: teammates can view each other's profile once
-- team_members / shares_team_with exist.
create policy "profiles_select_teammates"
  on public.profiles for select
  to authenticated
  using ((select shares_team_with(id)));

grant select, insert, update, delete on public.teams to authenticated;
grant select, insert, update, delete on public.teams to service_role;
grant select, insert, update, delete on public.team_invite_codes to authenticated;
grant select, insert, update, delete on public.team_invite_codes to service_role;
grant select, insert, update, delete on public.team_members to authenticated;
grant select, insert, update, delete on public.team_members to service_role;
