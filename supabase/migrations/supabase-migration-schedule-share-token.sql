-- Add share_token for public read-only schedule links.
-- Enables owners to share schedules without requiring login.

alter table public.schedules
  add column if not exists share_token text;

-- Backfill existing schedules with random tokens
update public.schedules
set share_token = encode(gen_random_bytes(12), 'hex')
where share_token is null;

-- Ensure not null and default for future inserts
alter table public.schedules
  alter column share_token set default encode(gen_random_bytes(12), 'hex');

alter table public.schedules
  alter column share_token set not null;

create unique index if not exists idx_schedules_share_token
  on public.schedules (share_token);

comment on column public.schedules.share_token is
  'Unique token for public share links. Used in /s/[shareToken] for unauthenticated read-only access.';
