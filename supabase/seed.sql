-- Local development seed, referenced by [db.seed] sql_paths in config.toml.
-- Only ever runs via `supabase db reset`, which is local-only.
--
-- Creates one coach who already owns a team with a known invite code, plus two
-- unattached player accounts, so the create-team / share-code / join-by-code
-- flow can be exercised without three manual signups and three inbox trips.
--
--   coach@example.com    password123   coach of "Riverside Rays"
--   player1@example.com  password123   no team yet
--   player2@example.com  password123   no team yet
--   invite code:         HJKM2345
--
-- Passwords are hashed with pgcrypto, which lives in the `extensions` schema
-- (see 20260809224933_extensions_and_helpers.sql), hence the qualified calls.

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-1111-1111-111111111111',
    'authenticated',
    'authenticated',
    'coach@example.com',
    extensions.crypt('password123', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"Dana","last_name":"Whitfield"}',
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '22222222-2222-2222-2222-222222222222',
    'authenticated',
    'authenticated',
    'player1@example.com',
    extensions.crypt('password123', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"Marcus","last_name":"Ellery"}',
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '33333333-3333-3333-3333-333333333333',
    'authenticated',
    'authenticated',
    'player2@example.com',
    extensions.crypt('password123', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"Tobias","last_name":"Renn"}',
    now(),
    now()
  );

-- GoTrue requires a matching identity row before email/password sign-in works.
insert into auth.identities (
  id,
  user_id,
  provider_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
select
  gen_random_uuid(),
  u.id,
  u.id::text,
  jsonb_build_object('sub', u.id::text, 'email', u.email),
  'email',
  now(),
  now(),
  now()
from auth.users u
where u.email in ('coach@example.com', 'player1@example.com', 'player2@example.com');

-- profiles rows are created by the on_auth_user_created trigger above.

-- created_by must be explicit: its default is auth.uid(), which is null here.
-- The on_team_created trigger then enrolls Dana as the team's first coach.
insert into public.teams (id, name, primary_color, secondary_color, created_by)
values (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Riverside Rays',
  '#1d4ed8',
  '#f8fafc',
  '11111111-1111-1111-1111-111111111111'
);

-- Fixed code so the join flow is testable without reading it out of the UI.
insert into public.team_invite_codes (team_id, code, role, created_by)
values (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'HJKM2345',
  'player',
  '11111111-1111-1111-1111-111111111111'
);
