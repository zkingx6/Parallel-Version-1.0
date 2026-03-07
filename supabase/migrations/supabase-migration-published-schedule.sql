-- Add published_schedule to meetings (JSONB)
-- Stores the rotation result when owner publishes from Rotation page.
-- NULL = no schedule published yet.

alter table public.meetings
  add column if not exists published_schedule jsonb;

comment on column public.meetings.published_schedule is
  'Published rotation result (weeks, modeUsed, explain). NULL when not yet published.';
