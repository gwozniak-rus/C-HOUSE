-- Push subscriptions: Web Push for MVP, with an Expo push token column
-- included now so native (Phase 2) doesn't require a schema rewrite.
-- User/device-scoped, not team-scoped — the future notify-on-publish edge
-- function joins team_members -> push_subscriptions at send time via
-- service_role.

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  platform text not null check (platform in ('web', 'expo')),
  endpoint text,
  p256dh text,
  -- Named web_push_auth_key (not "auth") to avoid confusion with the auth
  -- schema; maps from the Web Push subscription's `keys.auth` field.
  web_push_auth_key text,
  expo_push_token text,
  device_name text,
  user_agent text,
  is_active boolean not null default true,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (platform = 'web' and endpoint is not null and p256dh is not null and web_push_auth_key is not null)
    or (platform = 'expo' and expo_push_token is not null)
  )
);

create unique index push_subscriptions_endpoint_idx
  on public.push_subscriptions (endpoint)
  where platform = 'web' and endpoint is not null;

create unique index push_subscriptions_expo_push_token_idx
  on public.push_subscriptions (expo_push_token)
  where platform = 'expo' and expo_push_token is not null;

create index push_subscriptions_user_id_idx on public.push_subscriptions (user_id);

create trigger set_push_subscriptions_updated_at
  before update on public.push_subscriptions
  for each row
  execute function public.set_updated_at();

alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions_own"
  on public.push_subscriptions for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update, delete on public.push_subscriptions to authenticated;
grant select, insert, update, delete on public.push_subscriptions to service_role;
