-- Real, auto-tracked read receipts for practice plans and announcements.
-- Two nullable FKs + a CHECK (rather than a bare tagged-union) preserve
-- real FK integrity and cascade-delete for exactly these two MVP content
-- types; a third publishable type later is one additive nullable column.

create table public.read_receipts (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  practice_plan_id uuid references public.practice_plans (id) on delete cascade,
  announcement_id uuid references public.announcements (id) on delete cascade,
  content_type text generated always as (
    case when practice_plan_id is not null then 'practice_plan' else 'announcement' end
  ) stored,
  user_id uuid not null references public.profiles (id) on delete cascade,
  viewed_at timestamptz not null default now(),
  check (num_nonnulls(practice_plan_id, announcement_id) = 1)
);

create unique index read_receipts_practice_plan_user_idx
  on public.read_receipts (practice_plan_id, user_id)
  where practice_plan_id is not null;

create unique index read_receipts_announcement_user_idx
  on public.read_receipts (announcement_id, user_id)
  where announcement_id is not null;

create index read_receipts_team_id_idx on public.read_receipts (team_id);

-- team_id is denormalized from whichever parent is set, so RLS/aggregate
-- queries never need a join back to practice_plans/announcements.
create or replace function public.sync_read_receipt_team_id()
returns trigger
language plpgsql
as $$
begin
  if new.practice_plan_id is not null then
    select team_id into new.team_id from practice_plans where id = new.practice_plan_id;
  elsif new.announcement_id is not null then
    select team_id into new.team_id from announcements where id = new.announcement_id;
  end if;

  if new.team_id is null then
    raise exception 'Invalid practice_plan_id/announcement_id';
  end if;

  return new;
end;
$$;

create trigger sync_read_receipts_team_id
  before insert or update of practice_plan_id, announcement_id on public.read_receipts
  for each row
  execute function public.sync_read_receipt_team_id();

alter table public.read_receipts enable row level security;

-- Visible to every team member, not just the coach — read-receipt counts
-- ("14/18 have seen this") are part of the shared team view.
create policy "read_receipts_select"
  on public.read_receipts for select
  to authenticated
  using ((select is_team_member(team_id)));

create policy "read_receipts_insert_own"
  on public.read_receipts for insert
  to authenticated
  with check (user_id = auth.uid() and (select is_team_member(team_id)));

-- Supports upserting viewed_at on a repeat view.
create policy "read_receipts_update_own"
  on public.read_receipts for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update on public.read_receipts to authenticated;
grant select, insert, update, delete on public.read_receipts to service_role;
