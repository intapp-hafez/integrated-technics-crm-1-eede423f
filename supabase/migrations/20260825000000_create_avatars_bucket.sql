insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 1048576, array['image/png', 'image/jpeg', 'image/jpg', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = 1048576, allowed_mime_types = array['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'Avatars Public Access' and tablename = 'objects') then
    create policy "Avatars Public Access" on storage.objects for select using (bucket_id = 'avatars');
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Avatars Auth Insert' and tablename = 'objects') then
    create policy "Avatars Auth Insert" on storage.objects for insert to authenticated with check (bucket_id = 'avatars');
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Avatars Auth Update' and tablename = 'objects') then
    create policy "Avatars Auth Update" on storage.objects for update to authenticated using (bucket_id = 'avatars');
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Avatars Auth Delete' and tablename = 'objects') then
    create policy "Avatars Auth Delete" on storage.objects for delete to authenticated using (bucket_id = 'avatars');
  end if;
end $$;
