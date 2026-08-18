-- Fires a Web Push notification job whenever an announcement is published,
-- by invoking the notify-on-publish edge function (supabase/functions/notify-on-publish).
-- pg_net and supabase_vault are already enabled on this project.
--
-- The vault secrets this reads (edge_functions_url, notify_on_publish_secret)
-- are environment config, not schema — they are seeded once by migration
-- 20260813120000_notify_on_publish.sql and are not declared here.

-- Generic on-publish notifier: any publishable content type can reuse this
-- by passing its own content_type/record_id, mirroring the polymorphic
-- shape read_receipts already uses.
create or replace function public.notify_on_publish(p_content_type text, p_record_id uuid, p_team_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text;
  v_secret text;
begin
  select decrypted_secret into v_url
  from vault.decrypted_secrets where name = 'edge_functions_url';

  select decrypted_secret into v_secret
  from vault.decrypted_secrets where name = 'notify_on_publish_secret';

  if v_url is null or v_secret is null then
    raise warning 'notify_on_publish: edge_functions_url/notify_on_publish_secret not configured in vault, skipping push for % %', p_content_type, p_record_id;
    return;
  end if;

  perform net.http_post(
    url := v_url || '/notify-on-publish',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', v_secret
    ),
    body := jsonb_build_object(
      'content_type', p_content_type,
      'record_id', p_record_id,
      'team_id', p_team_id
    ),
    timeout_milliseconds := 5000
  );
end;
$$;

revoke execute on function public.notify_on_publish(text, uuid, uuid) from public;
grant execute on function public.notify_on_publish(text, uuid, uuid) to service_role;

create or replace function public.notify_announcement_published()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only fire the moment an announcement transitions into "published".
  if new.published_at is null then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.published_at is not null then
    return new;
  end if;

  perform public.notify_on_publish('announcement', new.id, new.team_id);

  return new;
end;
$$;

create trigger on_announcement_published
  after insert or update of published_at on public.announcements
  for each row
  execute function public.notify_announcement_published();
