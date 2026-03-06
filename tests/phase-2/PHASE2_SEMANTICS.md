# Phase 2 verified scheduling semantics

- **Hard vs soft**: `hard_no_ranges` = HARD (blocking); `work_start_hour`/`work_end_hour` = SOFT (burden only).
- **Fixed anchor**: When `useFixedBaseTime=true` and anchor is within all members' work hours with no hard overlap → same anchor for all weeks (no rotation).
- **Hard boundaries**: `hardNoRanges` use half-open interval `[start, end)` — start inclusive, end exclusive.
