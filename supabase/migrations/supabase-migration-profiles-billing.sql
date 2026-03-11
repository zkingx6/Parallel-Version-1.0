-- Add billing metadata to profiles for Manage Billing UI.
-- All columns nullable; Starter users have none.

alter table public.profiles
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists billing_interval text check (billing_interval in ('monthly', 'yearly')),
  add column if not exists billing_amount_cents integer,
  add column if not exists billing_status text check (billing_status in ('active', 'cancel_at_period_end', 'canceled', 'past_due')),
  add column if not exists current_period_end timestamptz,
  add column if not exists plan_started_at timestamptz,
  add column if not exists cancel_at_period_end boolean default false;

create index if not exists idx_profiles_stripe_customer on public.profiles(stripe_customer_id) where stripe_customer_id is not null;

comment on column public.profiles.stripe_customer_id is 'Stripe customer ID for billing portal';
comment on column public.profiles.stripe_subscription_id is 'Stripe subscription ID';
comment on column public.profiles.billing_interval is 'monthly or yearly';
comment on column public.profiles.billing_amount_cents is 'Amount in cents (e.g. 3900 = $39)';
comment on column public.profiles.billing_status is 'Resolved billing status';
comment on column public.profiles.current_period_end is 'When current period ends (renewal date)';
comment on column public.profiles.plan_started_at is 'When subscription started';
comment on column public.profiles.cancel_at_period_end is 'True if subscription cancels at period end';
