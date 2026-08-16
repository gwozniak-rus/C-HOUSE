-- Travel itineraries and packing lists, both instantiable from templates.
-- Packing lists support two modes via a single `mode` flag: 'per_player'
-- (each player has their own checked state) or 'shared' (one reference
-- list, no per-player tracking) — served by the same underlying tables.

create table public.travel_itineraries (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  title text not null,
  start_date date not null,
  end_date date,
  source_template_id uuid references public.itinerary_templates (id) on delete set null,
  published_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index travel_itineraries_team_id_start_date_idx on public.travel_itineraries (team_id, start_date);

create table public.itinerary_items (
  id uuid primary key default gen_random_uuid(),
  itinerary_id uuid not null references public.travel_itineraries (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete cascade,
  position integer not null,
  event_date date,
  start_time time,
  title text not null,
  location text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index itinerary_items_itinerary_id_position_idx on public.itinerary_items (itinerary_id, position);

create table public.packing_lists (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  itinerary_id uuid references public.travel_itineraries (id) on delete set null,
  title text not null,
  mode text not null check (mode in ('per_player', 'shared')),
  source_template_id uuid references public.packing_list_templates (id) on delete set null,
  published_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index packing_lists_team_id_idx on public.packing_lists (team_id);
create index packing_lists_itinerary_id_idx on public.packing_lists (itinerary_id);

create table public.packing_list_items (
  id uuid primary key default gen_random_uuid(),
  packing_list_id uuid not null references public.packing_lists (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete cascade,
  position integer not null,
  item_name text not null,
  quantity integer default 1 check (quantity is null or quantity > 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index packing_list_items_packing_list_id_position_idx on public.packing_list_items (packing_list_id, position);

create table public.packing_list_item_status (
  packing_list_item_id uuid not null references public.packing_list_items (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete cascade,
  is_checked boolean not null default false,
  checked_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (packing_list_item_id, user_id)
);

create index packing_list_item_status_team_id_idx on public.packing_list_item_status (team_id);

create trigger set_travel_itineraries_updated_at before update on public.travel_itineraries for each row execute function public.set_updated_at();
create trigger set_itinerary_items_updated_at before update on public.itinerary_items for each row execute function public.set_updated_at();
create trigger set_packing_lists_updated_at before update on public.packing_lists for each row execute function public.set_updated_at();
create trigger set_packing_list_items_updated_at before update on public.packing_list_items for each row execute function public.set_updated_at();
create trigger set_packing_list_item_status_updated_at before update on public.packing_list_item_status for each row execute function public.set_updated_at();

create or replace function public.sync_itinerary_item_team_id()
returns trigger
language plpgsql
as $$
begin
  select team_id into new.team_id from travel_itineraries where id = new.itinerary_id;
  if not found then
    raise exception 'Invalid itinerary_id';
  end if;
  return new;
end;
$$;

create trigger sync_itinerary_items_team_id
  before insert or update of itinerary_id on public.itinerary_items
  for each row execute function public.sync_itinerary_item_team_id();

create or replace function public.sync_packing_list_item_team_id()
returns trigger
language plpgsql
as $$
begin
  select team_id into new.team_id from packing_lists where id = new.packing_list_id;
  if not found then
    raise exception 'Invalid packing_list_id';
  end if;
  return new;
end;
$$;

create trigger sync_packing_list_items_team_id
  before insert or update of packing_list_id on public.packing_list_items
  for each row execute function public.sync_packing_list_item_team_id();

create or replace function public.sync_packing_list_item_status_team_id()
returns trigger
language plpgsql
as $$
begin
  select team_id into new.team_id from packing_list_items where id = new.packing_list_item_id;
  if not found then
    raise exception 'Invalid packing_list_item_id';
  end if;
  return new;
end;
$$;

create trigger sync_packing_list_item_status_team_id
  before insert or update of packing_list_item_id on public.packing_list_item_status
  for each row execute function public.sync_packing_list_item_status_team_id();

-- Lets the packing_list_item_status write policy reject writes against
-- 'shared'-mode lists (which have no per-player tracking).
create or replace function public.packing_list_item_mode(p_item_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select pl.mode
  from packing_list_items pli
  join packing_lists pl on pl.id = pli.packing_list_id
  where pli.id = p_item_id;
$$;

revoke execute on function public.packing_list_item_mode(uuid) from public;
grant execute on function public.packing_list_item_mode(uuid) to authenticated, service_role;

alter table public.travel_itineraries enable row level security;
alter table public.itinerary_items enable row level security;
alter table public.packing_lists enable row level security;
alter table public.packing_list_items enable row level security;
alter table public.packing_list_item_status enable row level security;

create policy "travel_itineraries_select"
  on public.travel_itineraries for select
  to authenticated
  using (
    (select is_team_coach(team_id))
    or ((select is_team_member(team_id)) and published_at is not null)
  );

create policy "travel_itineraries_coaches_write"
  on public.travel_itineraries for all
  to authenticated
  using ((select is_team_coach(team_id)))
  with check ((select is_team_coach(team_id)));

create policy "itinerary_items_select"
  on public.itinerary_items for select
  to authenticated
  using (
    (select is_team_coach(team_id))
    or (
      (select is_team_member(team_id))
      and exists (
        select 1 from travel_itineraries ti
        where ti.id = itinerary_id and ti.published_at is not null
      )
    )
  );

create policy "itinerary_items_coaches_write"
  on public.itinerary_items for all
  to authenticated
  using ((select is_team_coach(team_id)))
  with check ((select is_team_coach(team_id)));

create policy "packing_lists_select"
  on public.packing_lists for select
  to authenticated
  using (
    (select is_team_coach(team_id))
    or ((select is_team_member(team_id)) and published_at is not null)
  );

create policy "packing_lists_coaches_write"
  on public.packing_lists for all
  to authenticated
  using ((select is_team_coach(team_id)))
  with check ((select is_team_coach(team_id)));

create policy "packing_list_items_select"
  on public.packing_list_items for select
  to authenticated
  using (
    (select is_team_coach(team_id))
    or (
      (select is_team_member(team_id))
      and exists (
        select 1 from packing_lists pl
        where pl.id = packing_list_id and pl.published_at is not null
      )
    )
  );

create policy "packing_list_items_coaches_write"
  on public.packing_list_items for all
  to authenticated
  using ((select is_team_coach(team_id)))
  with check ((select is_team_coach(team_id)));

-- Read-receipt-style visibility: any team member can see everyone's
-- checked state, not just their own (matches read_receipts visibility).
create policy "packing_list_item_status_select"
  on public.packing_list_item_status for select
  to authenticated
  using ((select is_team_member(team_id)));

create policy "packing_list_item_status_insert"
  on public.packing_list_item_status for insert
  to authenticated
  with check (
    (
      user_id = auth.uid()
      and (select is_team_member(team_id))
      and packing_list_item_mode(packing_list_item_id) = 'per_player'
    )
    or (select is_team_coach(team_id))
  );

create policy "packing_list_item_status_update"
  on public.packing_list_item_status for update
  to authenticated
  using (
    (
      user_id = auth.uid()
      and (select is_team_member(team_id))
      and packing_list_item_mode(packing_list_item_id) = 'per_player'
    )
    or (select is_team_coach(team_id))
  )
  with check (
    (
      user_id = auth.uid()
      and (select is_team_member(team_id))
      and packing_list_item_mode(packing_list_item_id) = 'per_player'
    )
    or (select is_team_coach(team_id))
  );

create policy "packing_list_item_status_delete"
  on public.packing_list_item_status for delete
  to authenticated
  using ((select is_team_coach(team_id)));

grant select, insert, update, delete on public.travel_itineraries to authenticated;
grant select, insert, update, delete on public.itinerary_items to authenticated;
grant select, insert, update, delete on public.packing_lists to authenticated;
grant select, insert, update, delete on public.packing_list_items to authenticated;
grant select, insert, update, delete on public.packing_list_item_status to authenticated;

grant select, insert, update, delete on public.travel_itineraries to service_role;
grant select, insert, update, delete on public.itinerary_items to service_role;
grant select, insert, update, delete on public.packing_lists to service_role;
grant select, insert, update, delete on public.packing_list_items to service_role;
grant select, insert, update, delete on public.packing_list_item_status to service_role;
