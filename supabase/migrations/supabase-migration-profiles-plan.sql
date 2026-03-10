-- Add plan column to profiles for manual Pro testing (pre-Stripe).
-- plan: 'starter' | 'pro' | null. null = starter (default).

alter table public.profiles
  add column if not exists plan text check (plan in ('starter', 'pro'));

comment on column public.profiles.plan is
  'User plan for feature gating. null = starter. Used for manual Pro testing before Stripe.';
