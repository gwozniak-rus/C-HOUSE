-- Extensions and generic helpers shared by every later migration.

create extension if not exists pgcrypto with schema extensions;

-- Generic updated_at maintenance trigger, reused by every mutable table.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
