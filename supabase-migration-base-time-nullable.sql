-- Migration: Make base_time_minutes optional (auto fair mode)
-- Run after supabase-migration-base-time.sql if you have it.
-- Allows null = auto mode; number = anchor mode.

alter table public.meetings
  alter column base_time_minutes drop not null,
  alter column base_time_minutes set default null;
