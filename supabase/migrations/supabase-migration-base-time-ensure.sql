-- Ensure base_time_minutes exists on meetings (for fixed base time / anchor mode).
-- Idempotent: safe to run on any schema. Fixes "Could not find base_time_minutes" error.
-- null = auto fair mode; number = anchor mode (e.g. 540 = 9:00).

alter table public.meetings
  add column if not exists base_time_minutes int default null;

alter table public.meetings
  alter column base_time_minutes drop not null,
  alter column base_time_minutes set default null;
