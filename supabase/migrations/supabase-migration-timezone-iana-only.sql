-- Migration: Timezone IANA-only (no dual-track)
-- Run in Supabase SQL Editor after supabase-migration-timezone-iana.sql
--
-- 1) Ensure timezone column exists
-- 2) Backfill NULL timezone from timezone_offset (deterministic mapping)
-- 3) Make timezone NOT NULL
-- 4) Drop timezone_offset (legacy removed)

-- Add timezone if not exists (idempotent)
alter table public.member_submissions
  add column if not exists timezone text;

-- Deterministic offset → IANA mapping (same as OFFSET_TO_IANA in lib/timezone.ts)
-- Used ONLY for one-time backfill. No code infers IANA from offset after this.
update public.member_submissions
set timezone = case
  when timezone_offset <= -10.5 then 'Pacific/Honolulu'
  when timezone_offset <= -9.5 then 'America/Anchorage'
  when timezone_offset <= -8.5 then 'America/Los_Angeles'
  when timezone_offset <= -7.5 then 'America/Denver'
  when timezone_offset <= -6.5 then 'America/Chicago'
  when timezone_offset <= -5.5 then 'America/New_York'
  when timezone_offset <= -4.5 then 'America/Halifax'
  when timezone_offset <= -3.5 then 'America/Sao_Paulo'
  when timezone_offset <= -1.5 then 'Atlantic/Azores'
  when timezone_offset <= 0.5 then 'Europe/London'
  when timezone_offset <= 1.5 then 'Europe/Berlin'
  when timezone_offset <= 2.5 then 'Africa/Cairo'
  when timezone_offset <= 3.5 then 'Europe/Moscow'
  when timezone_offset <= 4.5 then 'Asia/Dubai'
  when timezone_offset <= 5.25 then 'Asia/Karachi'
  when timezone_offset <= 5.75 then 'Asia/Kolkata'
  when timezone_offset <= 6.5 then 'Asia/Dhaka'
  when timezone_offset <= 7.5 then 'Asia/Bangkok'
  when timezone_offset <= 8.5 then 'Asia/Singapore'
  when timezone_offset <= 9.25 then 'Asia/Tokyo'
  when timezone_offset <= 9.75 then 'Australia/Adelaide'
  when timezone_offset <= 10.5 then 'Australia/Sydney'
  when timezone_offset <= 11.5 then 'Pacific/Noumea'
  else 'Pacific/Auckland'
end
where timezone is null or timezone = '';

-- Final fallback for any remaining nulls (e.g. timezone_offset was null)
update public.member_submissions set timezone = 'America/New_York' where timezone is null or timezone = '';

-- Make NOT NULL
alter table public.member_submissions
  alter column timezone set not null;

-- Drop legacy column
alter table public.member_submissions
  drop column if exists timezone_offset;

comment on column public.member_submissions.timezone is 'IANA timezone (e.g. America/New_York). Required. No offset fallback.';
