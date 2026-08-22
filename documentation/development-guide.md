# Development Guide

Everything you need to set up, run, and develop CoachHub locally. If
something in this guide conflicts with [AGENTS.md](../AGENTS.md) (Expo
version notes) or [supabase/Supabase-README.md](../supabase/Supabase-README.md)
(schema-change workflow), those files win — they're kept close to the
code they describe.

## Table of contents

- [Prerequisites](#prerequisites)
- [First-time setup](#first-time-setup)
- [Environment variables](#environment-variables)
- [Running the app](#running-the-app)
- [Supabase local development](#supabase-local-development)
- [Database schema changes](#database-schema-changes)
- [Testing](#testing)
- [Linting & formatting](#linting--formatting)
- [Coding practices](#coding-practices)
- [Troubleshooting](#troubleshooting)

## Prerequisites

| Tool                   | Version                     | Notes                                                                                                         |
| ---------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Node.js                | 20 LTS or newer             | Matches Expo SDK 57's supported range                                                                         |
| npm                    | bundled with Node           | Repo uses `package-lock.json`, not yarn/pnpm                                                                  |
| Docker Desktop         | latest                      | Required by `supabase start` to run Postgres/Studio locally                                                   |
| Supabase CLI           | `2.x` (installed as devDep) | Invoke via `npx supabase`, don't install a second global copy                                                 |
| Expo CLI               | none to install globally    | Invoke via `npx expo` / `npm run start` (installed as devDep via `expo`)                                      |
| Xcode / Android Studio | optional                    | Only needed for `expo start --ios` / `--android` simulators. The PWA (`--web`) is the primary target for MVP. |

This project targets **Expo SDK 57**. APIs changed meaningfully across
SDK versions — always check [docs.expo.dev/versions/v57.0.0](https://docs.expo.dev/versions/v57.0.0/)
before assuming behavior from older Expo knowledge (see [AGENTS.md](../AGENTS.md)).

## First-time setup

```bash
git clone <repo-url>
cd coachhub
npm install
cp .env.example .env
```

Then fill in `.env` — see [Environment variables](#environment-variables)
below — and start Supabase and Expo (see [Running the app](#running-the-app)).

## Environment variables

The app reads `EXPO_PUBLIC_*` variables at build time (Expo inlines
`EXPO_PUBLIC_` — prefixed vars into the client bundle — **never put a
secret behind that prefix**, it ships to every user's browser/device).

`.env.example` is the source of truth for which variables exist:

```bash
# Get these from your Supabase project dashboard (Settings > API)
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=

# VAPID public key for Web Push (safe to expose client-side). Generate a
# pair with `npx web-push generate-vapid-keys`; the private key goes in
# supabase/functions/.env (VAPID_PRIVATE_KEY), never here.
EXPO_PUBLIC_VAPID_PUBLIC_KEY=
```

Setup steps:

1. `cp .env.example .env`
2. **Supabase URL/anon key** — for local development, run `supabase start`
   first (see below) and use the `API URL` / `anon key` it prints, e.g.:
   ```
   EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
   EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key from `supabase start` output>
   ```
   To point at a hosted Supabase project instead, pull the values from
   **Project Settings → API** in the Supabase dashboard.
   **note** if `supabase start` or `supabase status` does not print
   `API URL` / `anon key`... run `supabase status --output env`. This
   will by-pass the supabase formatted output and give you the necessary
   items.
3. **VAPID key pair** (for Web Push):
   ```bash
   npx web-push generate-vapid-keys
   ```
   Put the **public** key in `.env` as `EXPO_PUBLIC_VAPID_PUBLIC_KEY`. Put
   the **private** key in `supabase/functions/.env` as `VAPID_PRIVATE_KEY`
   — it's read by the `notify-on-publish` edge function and must never be
   exposed client-side.
4. Never commit `.env` — it's already covered by `.gitignore`. If you add
   a new required variable, add the _key name only_ (no value) to
   `.env.example` so other environments know it exists.

## Running the app

```bash
npm run start     # expo start — pick a platform interactively
npm run web       # expo start --web  (primary target for MVP/PWA)
npm run ios       # expo start --ios
npm run android   # expo start --android
```

Requirements before the app will boot:

- `.env` populated (see above) — `lib/supabase.ts` throws at import time
  if `EXPO_PUBLIC_SUPABASE_URL`/`_ANON_KEY` are missing.
- Supabase running locally (`supabase start`) or a valid hosted project
  URL/key in `.env`.

## Supabase local development

The CLI is a dev dependency — always invoke it with `npx` (or the
`gen:types` npm script) so everyone uses the same pinned version.

```bash
npx supabase start       # spin up local Postgres, Studio, Auth, Storage, Realtime via Docker
npx supabase stop        # stop the local stack (add --no-backup to also drop volumes)
npx supabase status      # print local URLs/keys (API, DB, Studio, anon/service_role keys)
npx supabase login       # authenticate the CLI against supabase.com (one-time, for linking)
npx supabase link        # link this repo to a hosted Supabase project
```

Local service ports (from `supabase/config.toml`):

| Service               | Port  |
| --------------------- | ----- |
| API                   | 54321 |
| Database              | 54322 |
| Shadow DB (diff)      | 54320 |
| Connection pooler     | 54329 |
| Studio (dashboard UI) | 54323 |

Open **http://127.0.0.1:54323** for Studio — a local GUI for browsing
tables, running SQL, and inspecting auth users while developing.

Seeding / resetting local data:

```bash
npx supabase db reset     # drop local DB, replay all migrations, then run supabase/seed.sql
```

Run this whenever your local DB drifts from the migration history, or
after pulling new migrations from git.

Generate TypeScript types from the local DB schema (keeps `lib/database.types.ts`
in sync with Postgres):

```bash
npm run gen:types    # supabase gen types typescript --local > lib/database.types.ts
```

Run this after every schema change, local or pulled, before writing
code that touches new/changed tables.

Edge functions (`supabase/functions/`, e.g. `notify-on-publish`):

```bash
npx supabase functions serve             # run all functions locally
npx supabase functions deploy <name>     # deploy one function to the linked project
```

Edge functions run on Deno, not Node — they're lint-excluded from the
root ESLint config (see `eslint.config.mts`) and have their own
`supabase/functions/.env` for secrets like `VAPID_PRIVATE_KEY`.

## Database schema changes

This repo uses Supabase's **declarative schema** workflow. Full detail
lives in [supabase/Supabase-README.md](../supabase/Supabase-README.md);
the short version:

1. **Never hand-edit files in `supabase/migrations/`** — that directory
   is a generated audit trail, not something you author directly.
2. Edit the relevant file under `supabase/schemas/` (or add a new one)
   to describe the schema you want.
3. Diff it against migration history to generate a migration:
   ```bash
   npx supabase db diff -f <description>
   ```
4. Review the generated SQL in `supabase/migrations/`.
5. Test locally: `npx supabase db reset`.
6. Apply to the linked hosted project: `npx supabase db push`.
7. **Before committing**, run the Supabase advisors (security +
   performance) via the Supabase MCP server (`get_advisors`) — this
   project relies heavily on `security definer` functions for RLS, so
   this check is cheap insurance against a subtle policy bug.
8. **One-off data changes** (backfills, seeding vault secrets) don't
   belong in `supabase/schemas/` — author those directly as a migration:
   ```bash
   npx supabase migration new <name>
   ```
9. Commit `supabase/schemas/` and the updated `supabase/config.toml`
   alongside the generated migration.

## Testing

Full detail in [TESTING.md](../TESTING.md) — read it before writing new
tests, it documents five specific gotchas (async `render`/`fireEvent`,
missing browser globals in the RN test environment, `jest.mock` hoisting,
etc.) that have caused real failures in this codebase.

```bash
npm test              # run once
npm run test:watch    # watch mode
npm run test:coverage # run with a coverage report
```

- Stack: `jest-expo` + `@testing-library/react-native` (not
  `react-test-renderer` — it doesn't support React 19).
- Tests mirror the source tree under `__tests__/` (e.g.
  `lib/push/subscription.ts` → `__tests__/lib/push/subscription.test.ts`).
- `__tests__/test-utils/` holds shared mocks/helpers, not tests itself.
- New screen/hook/lib code should ship with tests in the same PR — this
  repo has no legacy untested backlog to blend into; keep it that way.

## Linting & formatting

```bash
npm run lint         # eslint .
npm run lint:fix      # eslint . --fix
npm run format        # prettier --write .
```

- ESLint config (`eslint.config.mts`) is flat-config, TypeScript-aware,
  and includes React/React Hooks rules. `supabase/functions/**` is
  excluded (Deno runtime, lint separately with the Supabase CLI).
- Prettier is **not** run through ESLint (`eslint-config-prettier` only
  disables conflicting stylistic rules) — run `npm run format` on its
  own.
- Run both `npm run lint` and `npm test` before opening a PR.

## Coding practices

Standard, low-ceremony practices this codebase follows — apply them to
new code rather than reinventing conventions per file.

**TypeScript**

- No `any` as an escape hatch; if a type is genuinely unknown, narrow it
  before use. Prefer `unknown` over `any` at boundaries (e.g. catch blocks).
- Use `import type { X }` for type-only imports (`@typescript-eslint/consistent-type-imports`
  is enforced) — keeps the boundary between runtime and type-only code
  explicit and helps bundlers elide type imports.
- Let TypeScript infer prop types from function signatures rather than
  hand-writing redundant `PropTypes` — `react/prop-types` is disabled for
  exactly this reason.

**React / React Native**

- Function components + hooks; no class components.
- Keep Supabase calls out of components — route them through `lib/`
  (see `lib/teams.ts`, `lib/profile.ts`) and expose them to components via
  React Query hooks (`lib/teams-queries.ts`) or context (`lib/auth-context.tsx`,
  `lib/team-context.tsx`). Components should call hooks, not `supabase.from(...)` directly.
- Prefer `testID` over text queries when a visible label could collide
  with other on-screen text (see `TESTING.md` for a concrete example).
- Respect the Rules of Hooks — `eslint-plugin-react-hooks` is enforced,
  don't disable its lint rule to work around a violation; restructure
  the component instead.

**Supabase / data access**

- Authorization is enforced with Postgres **Row Level Security (RLS)**,
  not client-side checks — never treat a hidden UI element as a security
  boundary.
- Schema changes always go through the declarative `schemas/` → `db diff`
  flow (see above), never hand-authored migrations for schema.
- Run the Supabase advisors before committing schema changes, especially
  around `security definer` functions.

**General**

- No unused variables/args except explicitly prefixed with `_`
  (`argsIgnorePattern`/`varsIgnorePattern: "^_"`), which signals "intentionally
  unused" rather than "forgotten."
- Small, focused commits and PRs — one logical change per commit.
- Write comments only for non-obvious _why_ (a workaround, an invariant,
  a constraint from an external system) — not for restating _what_ the
  code already says through naming.
- Don't add abstractions, config flags, or error handling for cases that
  can't occur yet — match the existing codebase's preference for direct,
  minimal implementations over speculative flexibility.
- Before writing new code against an Expo API, check the versioned docs
  at [docs.expo.dev/versions/v57.0.0](https://docs.expo.dev/versions/v57.0.0/)
  rather than relying on memory — SDK 57 changed APIs from earlier
  versions.

## Troubleshooting

**"Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY"**
at app startup — `.env` isn't populated, or Metro was started before
`.env` was created/edited. Stop the dev server, verify `.env`, restart
with `npm run web` (env vars are read at bundle time, not hot-reloaded).

**Expo dev server can't reach Supabase** — confirm `npx supabase status`
shows the stack running, and that `EXPO_PUBLIC_SUPABASE_URL` matches the
`API URL` it reports (`http://127.0.0.1:54321` for local by default).

**Local DB schema looks stale / migration errors** — run
`npx supabase db reset` to rebuild from migrations + seed data, then
`npm run gen:types` to refresh `lib/database.types.ts`.

**Docker not running** — `supabase start` requires Docker Desktop to be
running first; start Docker, then retry.

**Port already in use on `supabase start`** — another local Postgres/Supabase
project is likely running. Run `npx supabase stop` in this repo, and check
`docker ps` for containers from other projects.
