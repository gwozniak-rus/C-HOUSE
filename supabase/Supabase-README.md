## CHANGING SCHEMA

- **Never hand-edit files** in supabase/migrations/ again. That directory is now a generated audit trail.
- **To change schema:** edit the relevant file in `supabase/schemas/` (or add a new one), then run supabase `db diff -f <description>` — it generates the migration file for you by diffing your edited schema files against a shadow DB built from existing migrations. Review the generated SQL, then `supabase db push` to apply it to the linked project (or `supabase db reset` locally first to test).
- **Never use `apply_migration` (MCP) or hand-author a migration file for schema changes anymore** — that bypasses the declarative flow and immediately causes the schema files and DB to drift out of sync.
- **One-off data changes** (backfills, seeding vault secrets, etc.) still don't belong in `schemas/` — write them as a normal migration via `supabase migration new <name>`, same as `20260816120000` did for its backfill UPDATE.
- **Before committing any schema change,** run `mcp__supabase__get_advisors` (security + performance) — cheap insurance, especially since this project leans heavily on `security definer` functions for RLS.
- **Commit** `supabase/schemas/` and the updated `config.toml` — they're currently untracked/modified in your working tree.