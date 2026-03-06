IANA only; offsets not used; UTC→IANA pipeline.

## Fixed base time (anchor mode)

**Rule: Absolute time from anchor offset at selection.**

When the user selects a fixed base time (e.g. 9:00 AM) in the display timezone, we store:
- `base_time_minutes` (e.g. 540 for 9:00 AM)
- `anchor_offset` = offset of display timezone at selection time (e.g. -5 for EST)

The meeting time in UTC is: `baseUtcHour = baseTimeMinutes/60 - anchorOffset`.

This means the same UTC moment is used for all weeks. On DST transition weeks, the local time in the display timezone will shift (e.g. 9 AM EST → 10 AM EDT on Mar 10).
