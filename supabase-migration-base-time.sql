-- Migration: Base time (start time) preference for meetings
-- Run in Supabase SQL Editor if you have the base schema applied.

alter table public.meetings
  add column if not exists base_time_minutes int not null default 540;
