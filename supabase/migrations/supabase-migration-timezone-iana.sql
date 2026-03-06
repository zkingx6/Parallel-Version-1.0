-- Migration: Add IANA timezone columns for DST-aware display
-- Run in Supabase SQL Editor

-- meetings: display timezone (IANA)
alter table public.meetings
  add column if not exists display_timezone text;

comment on column public.meetings.display_timezone is 'IANA timezone for display (e.g. America/New_York). When set, used for DST-aware header. Falls back to anchor_offset when null.';

-- member_submissions: member timezone (IANA)
alter table public.member_submissions
  add column if not exists timezone text;

comment on column public.member_submissions.timezone is 'IANA timezone (e.g. America/New_York). When set, used for DST-aware conversion. Falls back to timezone_offset when null.';
