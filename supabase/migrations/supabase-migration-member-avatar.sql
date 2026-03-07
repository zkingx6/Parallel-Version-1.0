-- Add avatar_url to member_submissions for member profile
alter table public.member_submissions
  add column if not exists avatar_url text;
