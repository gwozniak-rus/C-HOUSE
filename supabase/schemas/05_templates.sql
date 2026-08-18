-- Reusable templates (coach-facing, desktop view): practice-plan, itinerary,
-- and packing-list. Kept as separate tables per type since item shapes
-- genuinely differ and each already has a separate instance table.
-- Coach-only, both read and write: players never browse raw templates,
-- only the instances published from them.

create table public.practice_plan_templates (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  name text not null,
  description text,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index practice_plan_templates_team_id_idx on public.practice_plan_templates (team_id);

create table public.practice_plan_template_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.practice_plan_templates (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete cascade,
  position integer not null,
  start_time time,
  title text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index practice_plan_template_items_template_id_position_idx
  on public.practice_plan_template_items (template_id, position);

create table public.itinerary_templates (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  name text not null,
  description text,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index itinerary_templates_team_id_idx on public.itinerary_templates (team_id);

create table public.itinerary_template_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.itinerary_templates (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete cascade,
  position integer not null,
  day_offset integer not null default 0,
  start_time time,
  title text not null,
  location text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index itinerary_template_items_template_id_position_idx
  on public.itinerary_template_items (template_id, position);

create table public.packing_list_templates (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  name text not null,
  description text,
  mode text not null check (mode in ('per_player', 'shared')),
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index packing_list_templates_team_id_idx on public.packing_list_templates (team_id);

create table public.packing_list_template_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.packing_list_templates (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete cascade,
  position integer not null,
  item_name text not null,
  quantity integer default 1 check (quantity is null or quantity > 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index packing_list_template_items_template_id_position_idx
  on public.packing_list_template_items (template_id, position);

create trigger set_practice_plan_templates_updated_at before update on public.practice_plan_templates for each row execute function public.set_updated_at();
create trigger set_practice_plan_template_items_updated_at before update on public.practice_plan_template_items for each row execute function public.set_updated_at();
create trigger set_itinerary_templates_updated_at before update on public.itinerary_templates for each row execute function public.set_updated_at();
create trigger set_itinerary_template_items_updated_at before update on public.itinerary_template_items for each row execute function public.set_updated_at();
create trigger set_packing_list_templates_updated_at before update on public.packing_list_templates for each row execute function public.set_updated_at();
create trigger set_packing_list_template_items_updated_at before update on public.packing_list_template_items for each row execute function public.set_updated_at();

-- Denormalize team_id onto every *_template_items row from its parent
-- template, same pattern as practice_plan_items.
create or replace function public.sync_practice_plan_template_item_team_id()
returns trigger
language plpgsql
as $$
begin
  select team_id into new.team_id from practice_plan_templates where id = new.template_id;
  if not found then
    raise exception 'Invalid template_id';
  end if;
  return new;
end;
$$;

create trigger sync_practice_plan_template_items_team_id
  before insert or update of template_id on public.practice_plan_template_items
  for each row execute function public.sync_practice_plan_template_item_team_id();

create or replace function public.sync_itinerary_template_item_team_id()
returns trigger
language plpgsql
as $$
begin
  select team_id into new.team_id from itinerary_templates where id = new.template_id;
  if not found then
    raise exception 'Invalid template_id';
  end if;
  return new;
end;
$$;

create trigger sync_itinerary_template_items_team_id
  before insert or update of template_id on public.itinerary_template_items
  for each row execute function public.sync_itinerary_template_item_team_id();

create or replace function public.sync_packing_list_template_item_team_id()
returns trigger
language plpgsql
as $$
begin
  select team_id into new.team_id from packing_list_templates where id = new.template_id;
  if not found then
    raise exception 'Invalid template_id';
  end if;
  return new;
end;
$$;

create trigger sync_packing_list_template_items_team_id
  before insert or update of template_id on public.packing_list_template_items
  for each row execute function public.sync_packing_list_template_item_team_id();

alter table public.practice_plan_templates enable row level security;
alter table public.practice_plan_template_items enable row level security;
alter table public.itinerary_templates enable row level security;
alter table public.itinerary_template_items enable row level security;
alter table public.packing_list_templates enable row level security;
alter table public.packing_list_template_items enable row level security;

create policy "practice_plan_templates_coaches_all" on public.practice_plan_templates for all to authenticated using ((select is_team_coach(team_id))) with check ((select is_team_coach(team_id)));
create policy "practice_plan_template_items_coaches_all" on public.practice_plan_template_items for all to authenticated using ((select is_team_coach(team_id))) with check ((select is_team_coach(team_id)));
create policy "itinerary_templates_coaches_all" on public.itinerary_templates for all to authenticated using ((select is_team_coach(team_id))) with check ((select is_team_coach(team_id)));
create policy "itinerary_template_items_coaches_all" on public.itinerary_template_items for all to authenticated using ((select is_team_coach(team_id))) with check ((select is_team_coach(team_id)));
create policy "packing_list_templates_coaches_all" on public.packing_list_templates for all to authenticated using ((select is_team_coach(team_id))) with check ((select is_team_coach(team_id)));
create policy "packing_list_template_items_coaches_all" on public.packing_list_template_items for all to authenticated using ((select is_team_coach(team_id))) with check ((select is_team_coach(team_id)));

grant select, insert, update, delete on public.practice_plan_templates to authenticated;
grant select, insert, update, delete on public.practice_plan_template_items to authenticated;
grant select, insert, update, delete on public.itinerary_templates to authenticated;
grant select, insert, update, delete on public.itinerary_template_items to authenticated;
grant select, insert, update, delete on public.packing_list_templates to authenticated;
grant select, insert, update, delete on public.packing_list_template_items to authenticated;

grant select, insert, update, delete on public.practice_plan_templates to service_role;
grant select, insert, update, delete on public.practice_plan_template_items to service_role;
grant select, insert, update, delete on public.itinerary_templates to service_role;
grant select, insert, update, delete on public.itinerary_template_items to service_role;
grant select, insert, update, delete on public.packing_list_templates to service_role;
grant select, insert, update, delete on public.packing_list_template_items to service_role;
