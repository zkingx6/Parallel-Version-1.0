-- Reset corrupted hard_no_ranges for meeting 363b08dc-3b9f-4914-bc78-02c1c470ccd4
--
-- Symptom: All members had hard_no_ranges = [{start:0,end:9.25},{start:10,end:24}]
-- which is the complement of overlap (9.25–10), leaving only 9:15–10:00 available.
--
-- Fix: Set hard_no_ranges to [] (user-defined only). The application will compute
-- effective hard_no at read time as [0, work_start) + [work_end, 24) + user_defined.
--
-- Run: psql $DATABASE_URL -f scripts/reset-hard-no-ranges-corrupted.sql

-- Option A: Reset only rows matching the known corrupt pattern
UPDATE member_submissions
SET
  hard_no_ranges = '[]'::jsonb,
  updated_at = now()
WHERE meeting_id = '363b08dc-3b9f-4914-bc78-02c1c470ccd4'
  AND jsonb_array_length(hard_no_ranges) = 2
  AND (hard_no_ranges->0->>'start')::numeric = 0
  AND (hard_no_ranges->0->>'end')::numeric = 9.25
  AND (hard_no_ranges->1->>'start')::numeric = 10
  AND (hard_no_ranges->1->>'end')::numeric = 24;

-- Option B: Reset ALL members of this meeting (uncomment if Option A matches 0 rows)
-- UPDATE member_submissions
-- SET hard_no_ranges = '[]'::jsonb, updated_at = now()
-- WHERE meeting_id = '363b08dc-3b9f-4914-bc78-02c1c470ccd4';
