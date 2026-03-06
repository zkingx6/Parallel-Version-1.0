-- Add start_date to meetings (optional; NULL = use next occurrence of day_of_week)
-- Backward compatible: existing meetings with NULL start_date behave exactly as before.

alter table public.meetings
  add column if not exists start_date date;

comment on column public.meetings.start_date is
  'Week 1 calendar date (YYYY-MM-DD). NULL = next occurrence of day_of_week.';
