# Avatar Upload Setup

If you see "Bucket not found" when uploading a profile photo, create the `avatars` storage bucket in Supabase.

For member avatars, run the migration `supabase/migrations/supabase-migration-member-avatar.sql` to add the `avatar_url` column to `member_submissions`.

## Quick fix

1. Open your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **SQL Editor** → New query
4. Paste and run this SQL:

```sql
-- Create avatars bucket
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- RLS: authenticated users can upload to their own folder
create policy "Users can upload own avatar"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can update own avatar"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Avatars are publicly readable"
  on storage.objects for select
  to public
  using (bucket_id = 'avatars');
```

5. Click **Run**
6. Try uploading your profile photo again
