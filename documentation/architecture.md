# Architecture

How CoachHub is put together, and why. For setup/run instructions, see
[development-guide.md](./development-guide.md). For product scope, see
[goals.md](./goals.md).

## Tech stack

| Layer                            | Choice                                    |
| --------------------------------- | ------------------------------------------ |
| UI (mobile, coach desktop, web)   | React Native + Expo (SDK 57)               |
| Navigation                        | React Navigation (native-stack)            |
| Server state / caching            | TanStack Query (`@tanstack/react-query`)   |
| Database / Auth / Realtime / Storage | Supabase (Postgres)                     |
| Frontend hosting                  | Vercel                                     |
| Backend hosting                   | Supabase managed infrastructure            |
| Push notifications                | Web Push API (Expo Push planned, Phase 2)  |
| Distribution                      | Progressive Web App (PWA) for MVP          |

**Why a single Expo codebase:** the same UI ships as the mobile app, the
coach's desktop view, and the installable PWA. This is why the app
targets `expo start --web` as the primary dev loop rather than a
simulator.

**Why PWA first:** shipping as a PWA removes the App Store review
timeline and Apple Developer account as launch dependencies. Native
distribution (App Store / Play Store) is scoped for Phase 2, once the
product is validated with real coaching staffs.

**Why Supabase over Firebase:** the data model is inherently relational
(Team → PracticePlan → ReadReceipt), which Postgres fits better than a
NoSQL document store. Supabase also bundles auth, Row Level Security
(for team-scoped data isolation), and realtime updates (live
read-receipt counts) without separate infrastructure.

## Project structure

```
App.tsx                    # root component — providers, navigation entry
index.ts                   # Expo entry point

navigation/
  AppNavigator.tsx          # authenticated app navigator
  ...                        # (auth vs. authenticated stacks)

screens/
  auth/                     # sign in / sign up
  ...                        # feature screens (practice plans, teams, etc.)

components/                 # shared, presentational UI components

lib/                        # all business logic and external integrations
  supabase.ts                # Supabase client singleton (throws without env vars)
  auth-context.tsx            # session/auth React context
  team-context.tsx            # active-team React context
  teams.ts / teams-queries.ts # team data access + React Query hooks
  profile.ts                  # profile data access
  push/                        # Web Push subscription/registration logic
  database.types.ts            # generated from Postgres schema — do not hand-edit
  queryClient.ts                # TanStack Query client config
  theme.ts / types.ts           # shared design tokens / shared types

supabase/
  schemas/                   # declarative schema — the source of truth for DB structure
  migrations/                 # generated audit trail — never hand-edited
  functions/                   # Deno edge functions (e.g. notify-on-publish)
  seed.sql                     # local dev seed data
  config.toml                  # local stack config (ports, auth settings, etc.)

__tests__/                  # mirrors the source tree; see TESTING.md
```

Key rule embedded in this layout: **components don't call Supabase
directly.** Data access lives in `lib/`, exposed to screens/components
via context (`auth-context`, `team-context`) or React Query hooks
(`teams-queries.ts`). This keeps authorization logic, caching, and
error handling in one place instead of scattered across screens.

## Data model (conceptual)

The core relationship driving the schema and RLS design:

```
Team ──< PracticePlan ──< ReadReceipt
  │
  ├──< Announcement
  ├──< TravelItinerary / PackingList (templated, reusable)
  └──< TeamMembership (coach | player, scoped to a team)
```

- **Team-scoping** is the primary authorization boundary — nearly every
  table's RLS policy checks the requesting user's membership in the
  team that owns the row.
- **Read receipts** are auto-tracked on view (a row is written when a
  player opens a plan/announcement), not simulated via a "like" as
  GroupMe does.
- **Templates** (practice plans, itineraries, packing lists) are
  reusable records coaches create once and instantiate repeatedly,
  rather than rebuilding content from scratch each time.

Authoritative schema definitions live in `supabase/schemas/` — treat
that directory, not this document, as the source of truth for exact
columns/constraints, since schema evolves independently of this file.

## Authentication & authorization

- Supabase Auth issues sessions; the client (`lib/supabase.ts`) persists
  them via `AsyncStorage` with `autoRefreshToken` enabled.
- Session refresh is tied to `AppState` — refresh timers pause while the
  app is backgrounded (native/PWA backgrounding can stall JS timers) and
  force an immediate refresh on foreground, avoiding silently-expired
  sessions.
- All row-level authorization is enforced in Postgres via **Row Level
  Security**, largely through `security definer` functions (see
  `supabase/Supabase-README.md` for the schema-change workflow this
  implies). The client never assumes a hidden UI element is a security
  boundary — every query is safe to run with only the user's own
  privileges.

## Push notifications

- MVP uses the **Web Push API** (works within the PWA model without app
  store distribution). Native Expo Push is planned for Phase 2 once the
  app ships to app stores.
- Subscription/registration logic lives in `lib/push/` (`register.ts`,
  `subscription.ts`, `usePushNotifications.ts`).
- The `notify-on-publish` Supabase edge function (`supabase/functions/`)
  sends notifications when a coach publishes a plan/announcement, using
  a VAPID key pair — the public key is safe client-side
  (`EXPO_PUBLIC_VAPID_PUBLIC_KEY`), the private key lives only in
  `supabase/functions/.env` (`VAPID_PRIVATE_KEY`), never in the client
  bundle.

## Testing architecture

See [TESTING.md](../TESTING.md) for full detail. In short: `jest-expo` +
`@testing-library/react-native`, tests mirror the source tree, and
Supabase/auth/query-hook dependencies are mocked at the module boundary
(`lib/supabase`, `lib/auth-context`, `lib/teams-queries`) rather than
hitting real network calls.

## Deployment

- **Frontend:** Vercel, building the Expo web/PWA target.
- **Backend:** Supabase-managed Postgres, Auth, Realtime, Storage, and
  edge functions — no separately hosted backend service.
- Schema changes reach the hosted project via `supabase db push` after
  being generated locally through the declarative `db diff` workflow
  (see [development-guide.md](./development-guide.md#database-schema-changes)).
