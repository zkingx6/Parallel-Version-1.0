-- Add trial plan and trial_ends_at for 14-day Pro trial.
-- New users get trial automatically; trial expires → starter.

-- Allow 'trial' in plan check
alter table public.profiles drop constraint if exists profiles_plan_check;
alter table public.profiles add constraint profiles_plan_check
  check (plan in ('starter', 'trial', 'pro'));

-- Add trial_ends_at
alter table public.profiles
  add column if not exists trial_ends_at timestamptz;

-- Default new rows to trial (for migrations that create profiles)
alter table public.profiles
  alter column plan set default 'trial';

comment on column public.profiles.plan is
  'User plan: starter | trial | pro';

comment on column public.profiles.trial_ends_at is
  'End date of the 14-day Pro trial. Null when not on trial.';

-- Update handle_new_user to set trial for new signups
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
    'trial',
    now() + interval '14 days'
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;
