Phase 5 Pack A found a DST inconsistency in fixed base time rendering.

Observed behavior:
- Meeting display zone at the top shows New York (UTC-05:00)
- Week 1 is Tue, Mar 10, which is already New York DST (UTC-04:00)

Expected rule:
If fixed base time is interpreted using the displayed anchor zone offset (-05:00), then when rendered for Week 1 on Mar 10, every selected base time should shift by +1 hour in New York local time.

So:
- 9:00 AM should render as 10:00 AM on Mar 10
- 12:00 PM should render as 1:00 PM on Mar 10
- 6:00 PM should render as 7:00 PM on Mar 10

Actual behavior:
- 9:00 AM renders as 10:00 AM (appears correct)
- 12:00 PM renders as 12:00 PM (inconsistent)
- 6:00 PM renders as 6:00 PM (inconsistent)

Non-integer offsets still appear correct:
- India shows :30
- Nepal shows :45
- Cross-day labeling appears correct

Task:
1. Trace how fixed base time is converted from the displayed anchor timezone to the actual week date timezone.
2. Ensure one consistent conversion rule is used for all selected hours.
3. Decide and enforce one clear product rule:
   - either fixed base time means fixed wall-clock local time on the scheduled week date
   - or fixed base time means absolute time derived from the anchor offset at selection time
4. Make rendering, preview, and generated schedule all follow the same rule.
5. Add a deterministic regression check for DST week:
   - selecting 9 AM / 12 PM / 6 PM before DST transition
   - rendering Week 1 on Mar 10 in New York
   - all three must follow the same offset rule# Phase 2 Final Verification — READ ONLY

All steps are read-only. No code changes. No database writes.

---

## A) Phase 2 Final Checklist (UI steps)

### Prerequisites
- Dev server running (`npm run dev`)
- `NODE_ENV=development` (determinism endpoint only works in dev)
- Meeting `363b08dc-3b9f-4914-bc78-02c1c470ccd4` exists with ≥2 members

---

### 1) Feasible cases generate a plan (ok: true)

| Step | Action | Expected |
|------|--------|----------|
| 1.1 | Open `/rotation/363b08dc-3b9f-4914-bc78-02c1c470ccd4` | Rotation page loads |
| 1.2 | Ensure "Use a fixed base time" is unchecked (or set to a feasible time) | No "Blocked by hard boundaries" |
| 1.3 | Click "Plan" / Generate | Rotation table appears with weeks and times |
| 1.4 | Call `GET /api/dev/run-determinism-test` | `ok: true`, `runs` array with 10 entries |

---

### 2) Infeasible duration case fails clearly (ok: false / reason)

| Step | Action | Expected |
|------|--------|----------|
| 2.1 | Run unit test: `npx vitest run lib/rotation.test.ts` (covers "when NO shareable plan exists") | Test passes; result has `shareablePlanExists: false`, `forcedReason` |
| 2.2 | If a meeting already exists with no overlap (e.g. all members have `hard_no_ranges` covering full day), open its rotation page and click "Plan" | "No viable time" or similar error message |

*Note: Do NOT run any UPDATE to create infeasible data. Use existing data or unit tests only.*

---

### 3) hardNoRanges semantics [start, end) — 12 blocked, 13 allowed

| Step | Action | Expected |
|------|--------|----------|
| 3.1 | Run `npx vitest run lib/hard-no-boundary.test.ts` | All tests pass |
| 3.2 | If you have a meeting with 1 member: work 9–18, `hard_no_ranges = '[{"start":12,"end":13}]'`, open rotation page | — |
| 3.3 | Enable "Use a fixed base time", select **12:00** | "Blocked by hard boundaries — choose a different time." |
| 3.4 | Change to **13:00** | No "Blocked" message; may show "Outside working hours" or "burden will increase" if outside work window |

---

### 4) hardNoRanges are the only hard constraints; working hours never block

| Step | Action | Expected |
|------|--------|----------|
| 4.1 | Meeting with members work 9–18, `hard_no_ranges = []` | — |
| 4.2 | Enable "Use a fixed base time", select **7:00 PM** (19:00) | No "Blocked by hard boundaries" |
| 4.3 | UI shows | "Outside working hours for N member(s) — burden will increase." |
| 4.4 | Click "Plan" | Plan generates successfully (7 PM is allowed) |

---

### 5) useFixedBaseTime=true schedules exactly at baseTimeMinutes unless blocked by hardNo

| Step | Action | Expected |
|------|--------|----------|
| 5.1 | Meeting with members work 9–18, `hard_no_ranges = []` | — |
| 5.2 | Enable "Use a fixed base time", select **10:30 AM** | No "Blocked" message |
| 5.3 | Click "Plan" | All weeks show 10:30 AM (no rotation to 8:30, etc.) |
| 5.4 | Determinism endpoint | `modeUsed: "FIXED_ANCHOR"` in runs; `selectedTimes` all same value |

---

### 6) Determinism endpoint returns identical outputs across 10 runs

| Step | Action | Expected |
|------|--------|----------|
| 6.1 | Call `GET /api/dev/run-determinism-test` | `ok: true` |
| 6.2 | Check `differingFields` | Absent or `[]` |
| 6.3 | Check `violations` | Absent or `[]` |
| 6.4 | Run 10-curl loop and compare hashes (see C) | All hashes identical |

---

## B) Supabase SQL (READ-ONLY)

Run in Supabase SQL Editor. **SELECT only — no UPDATE/INSERT/DELETE.**

### B1) Member settings for meeting 363b08dc-3b9f-4914-bc78-02c1c470ccd4

```sql
SELECT
  id,
  name,
  timezone,
  work_start_hour,
  work_end_hour,
  hard_no_ranges,
  is_owner_participant
FROM member_submissions
WHERE meeting_id = '363b08dc-3b9f-4914-bc78-02c1c470ccd4'
ORDER BY is_owner_participant DESC, created_at;
```

### B2) hard_no_ranges format and values

```sql
SELECT
  name,
  hard_no_ranges,
  jsonb_typeof(hard_no_ranges) AS type,
  jsonb_array_length(hard_no_ranges) AS range_count
FROM member_submissions
WHERE meeting_id = '363b08dc-3b9f-4914-bc78-02c1c470ccd4';
```

### B3) work_start_hour / work_end_hour values

```sql
SELECT
  name,
  work_start_hour,
  work_end_hour
FROM member_submissions
WHERE meeting_id = '363b08dc-3b9f-4914-bc78-02c1c470ccd4';
```

### B4) Meeting base_time_minutes and timezone

```sql
SELECT
  id,
  title,
  day_of_week,
  duration_minutes,
  base_time_minutes,
  display_timezone,
  anchor_offset,
  start_date
FROM meetings
WHERE id = '363b08dc-3b9f-4914-bc78-02c1c470ccd4';
```

---

## C) Determinism test 10× and hash comparison

**Prerequisite:** Dev server running. No DB writes.

### Single run (manual check)

```bash
curl -s http://localhost:3000/api/dev/run-determinism-test | jq '.ok, .differingFields, .violations'
```

Expected: `true`, `null` or `[]`, `null` or `[]`.

### 10 runs + hash comparison

```bash
for i in {1..10}; do
  curl -s http://localhost:3000/api/dev/run-determinism-test | jq -cS '{ok, differingFields, violations, runs: [.runs[] | {runIndex, modeUsed, selectedTimes, status}]}' > /tmp/det-$i.json
done

for i in {1..10}; do
  echo -n "Run $i: "
  sha256sum /tmp/det-$i.json | cut -d' ' -f1
done
```

All 10 hashes must be identical.

### One-liner (expect 1 unique hash)

```bash
for i in {1..10}; do curl -s http://localhost:3000/api/dev/run-determinism-test | jq -cS '{ok, differingFields, violations, runs: [.runs[] | {runIndex, modeUsed, selectedTimes, status}]}' | sha256sum; done | sort -u | wc -l
```

Expected: `1`.

---

## D) PASS/FAIL summary template

```markdown
# Phase 2 Final Verification — [DATE]

## Checklist

| # | Item | Result |
|---|------|--------|
| 1 | Feasible cases generate plan (ok:true) | ☐ PASS / ☐ FAIL |
| 2 | Infeasible duration fails clearly | ☐ PASS / ☐ FAIL |
| 3 | hardNoRanges [start,end): 12 blocked, 13 allowed | ☐ PASS / ☐ FAIL |
| 4 | Working hours never block (soft only) | ☐ PASS / ☐ FAIL |
| 5 | useFixedBaseTime schedules at baseTimeMinutes unless hardNo | ☐ PASS / ☐ FAIL |
| 6 | Determinism 10 runs identical | ☐ PASS / ☐ FAIL |

## SQL verification (meeting 363b08dc...)

- Members: ___ rows
- hard_no_ranges: ___ (expect [] or valid JSONB)
- work_start_hour/work_end_hour: ___
- base_time_minutes: ___ (or null)
- display_timezone: ___

## Determinism hash test

- 10-run hash comparison: ☐ All identical / ☐ Mismatch

## Overall

**Phase 2: ☐ PASS / ☐ FAIL**
```
