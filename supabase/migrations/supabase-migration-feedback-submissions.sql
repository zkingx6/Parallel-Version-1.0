-- Feedback submissions table for bug reports and product feedback.
-- Used by landing page, owner dashboard, and member dashboard.

create table if not exists public.feedback_submissions (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('bug', 'idea', 'confusing', 'love_it', 'general')),
  source text not null check (source in ('landing_page', 'owner_dashboard', 'member_dashboard')),
  message text not null,
  email text,
  user_id uuid references auth.users(id) on delete set null,
  team_id uuid,
  page_path text,
  created_at timestamptz not null default now()
);

create index if not exists idx_feedback_submissions_created_at on public.feedback_submissions(created_at);
create index if not exists idx_feedback_submissions_source on public.feedback_submissions(source);

alter table public.feedback_submissions enable row level security;

-- Only service role can insert (API route uses service client)
-- No select/update/delete for anon or authenticated - API handles writes
comment on table public.feedback_submissions is 'Product feedback and bug reports from landing, owner, and member dashboards.';
