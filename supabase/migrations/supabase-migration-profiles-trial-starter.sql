-- Migrate trial → starter. Trial is now a state of Starter, not a separate plan.
-- profiles.plan = 'starter' | 'pro' | 'enterprise'

-- Migrate existing trial users to starter (trial_ends_at preserved)
update public.profiles set plan = 'starter' where plan = 'trial';

-- Update plan constraint
alter table public.profiles drop constraint if exists profiles_plan_check;
alter table public.profiles add constraint profiles_plan_check
  check (plan in ('starter', 'pro', 'enterprise'));

-- Default new rows to starter
alter table public.profiles
  alter column plan set default 'starter';

comment on column public.profiles.plan is
  'User plan: starter | pro | enterprise. Trial applies to Starter only.';

comment on column public.profiles.trial_ends_at is
  'End date of the 14-day Starter trial. Null when not on trial.';

-- Update handle_new_user to set starter + trial for new signups
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (user_id, email, full_name, avatar_url, plan, trial_ends_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'),
    'starter',
    now() + interval '14 days'
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;
