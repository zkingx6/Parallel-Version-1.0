-- Repair migration: ensure all schedules have valid share_token.
-- Run this if existing schedules have broken or missing share_token.
-- Safe to run multiple times (idempotent).
-- Note: Original migration (supabase-migration-schedule-share-token.sql) already
-- adds the column, backfills nulls, and sets NOT NULL. This repair handles any
-- schedules that ended up with null/empty share_token after the fact.

update public.schedules
set share_token = encode(gen_random_bytes(12), 'hex')
where share_token is null or trim(share_token) = '';
