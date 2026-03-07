-- Add user_id to member_submissions to link auth users to their membership
-- Enables team members (not just owners) to see published schedules

alter table public.member_submissions
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create index if not exists idx_member_submissions_user_id on public.member_submissions(user_id);

comment on column public.member_submissions.user_id is
  'Auth user ID when member is logged in. Enables schedule visibility for team members.';
