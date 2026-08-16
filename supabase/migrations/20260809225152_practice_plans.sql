-- Daily practice plans: pinned/dated, coach-authored, structured time-block items.

create table public.practice_plans (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  title text not null default 'Practice Plan',
  practice_date date not null,
  notes text,
  published_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- No uniqueness on (team_id, practice_date): a team may run more than one
-- session on a given day (e.g. a doubleheader).
create index practice_plans_team_id_practice_date_idx on public.practice_plans (team_id, practice_date);

create trigger set_practice_plans_updated_at
  before update on public.practice_plans
  for each row
  execute function public.set_updated_at();

create table public.practice_plan_items (
  id uuid primary key default gen_random_uuid(),
  practice_plan_id uuid not null references public.practice_plans (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete cascade,
  position integer not null,
  start_time time,
  title text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index practice_plan_items_plan_id_position_idx on public.practice_plan_items (practice_plan_id, position);

create trigger set_practice_plan_items_updated_at
  before update on public.practice_plan_items
  for each row
  execute function public.set_updated_at();

-- team_id is denormalized from the parent plan so RLS/index lookups on this
-- table never need a join; this trigger keeps it authoritative regardless
-- of whatever value a client sends.
create or replace function public.sync_practice_plan_item_team_id()
returns trigger
language plpgsql
as $$
begin
  select team_id into new.team_id
  from practice_plans
  where id = new.practice_plan_id;

  if not found then
    raise exception 'Invalid practice_plan_id';
  end if;

  return new;
end;
$$;

create trigger sync_practice_plan_items_team_id
  before insert or update of practice_plan_id on public.practice_plan_items
  for each row
  execute function public.sync_practice_plan_item_team_id();

alter table public.practice_plans enable row level security;
alter table public.practice_plan_items enable row level security;

create policy "practice_plans_select"
  on public.practice_plans for select
  to authenticated
  using (
    (select is_team_coach(team_id))
    or ((select is_team_member(team_id)) and published_at is not null)
  );

create policy "practice_plans_coaches_write"
  on public.practice_plans for all
  to authenticated
  using ((select is_team_coach(team_id)))
  with check ((select is_team_coach(team_id)));

create policy "practice_plan_items_select"
  on public.practice_plan_items for select
  to authenticated
  using (
    (select is_team_coach(team_id))
    or (
      (select is_team_member(team_id))
      and exists (
        select 1 from practice_plans pp
        where pp.id = practice_plan_id and pp.published_at is not null
      )
    )
  );

create policy "practice_plan_items_coaches_write"
  on public.practice_plan_items for all
  to authenticated
  using ((select is_team_coach(team_id)))
  with check ((select is_team_coach(team_id)));

grant select, insert, update, delete on public.practice_plans to authenticated;
grant select, insert, update, delete on public.practice_plans to service_role;
grant select, insert, update, delete on public.practice_plan_items to authenticated;
grant select, insert, update, delete on public.practice_plan_items to service_role;
