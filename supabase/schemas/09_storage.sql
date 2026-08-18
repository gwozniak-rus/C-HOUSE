-- Team branding: logo images. Public bucket (logos aren't sensitive data,
-- and this avoids signed-URL refresh logic in the app) with write access
-- restricted to that team's coaches. Path convention: {team_id}/logo.<ext>,
-- recorded in teams.logo_path.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('team-logos', 'team-logos', true, 5242880, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

-- Public bucket: reads are served directly via the public URL, no policy
-- needed. Writes still require the caller to be a coach of the team named
-- by the object's top-level folder.
create policy "team_logos_coaches_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'team-logos'
    and (select is_team_coach(((storage.foldername(name))[1])::uuid))
  );

create policy "team_logos_coaches_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'team-logos'
    and (select is_team_coach(((storage.foldername(name))[1])::uuid))
  )
  with check (
    bucket_id = 'team-logos'
    and (select is_team_coach(((storage.foldername(name))[1])::uuid))
  );

create policy "team_logos_coaches_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'team-logos'
    and (select is_team_coach(((storage.foldername(name))[1])::uuid))
  );
