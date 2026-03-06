# Phase 1 — Input Data Contract (Parallel)

Status legend:
- [ ] TODO
- [x] DONE
- [!] BLOCKED / NOT APPLICABLE

Hard rule:
- Do NOT modify rotation scoring, beam search, or invariant logic unless explicitly stated.

---

## 0) Wiring & Visibility

- [x] **Determinism endpoint:** `GET /api/dev/run-determinism-test`
  - File: `app/api/dev/run-determinism-test/route.ts` (exported `GET` handler)

- [x] **Member fetch source:** Supabase table `member_submissions` (no joins)
  ```ts
const { data: members, error: membersErr } = await supabase
  .from("member_submissions")
  .select("*")
  .eq("meeting_id", MEETING_ID)
  .order("is_owner_participant", { ascending: false })
  .order("created_at")
- [x] **Mapping function:** `dbMemberToTeamMember(s: DbMemberSubmission): TeamMember` — — File: `lib/database.types.ts`
- [x] **TS types:** `TeamMember` in `lib/types.ts`; `DbMemberSubmission` in `lib/database.types.ts`
- [x] **Error response shape:** `NextResponse.json(body, { status })`
    404: non-dev + meeting not found
    500: members fetch failure
    422: input contract violation
    422 body:
    ```ts
{ ok: false, error: { code, message, details } }
```

## 1) Missing Field: timezone (IANA)
Expected:
- Block generation
- Explicit error: Missing/Invalid timezone (no silent default)
Cases:
- [ ] timezone = null
- [x] timezone = "" / whitespace
- [ ] timezone = invalid IANA (typo)

## Phase 1.1 — Evidence
- [x] 1.1-B timezone = "" (empty string)
    Setup: update one non-owner member_submissions.timezone = ''
    Expected: block generation + explicit error
    Actual: 422 JSON with INPUT_CONTRACT_VIOLATION + details (timezone missing/empty)
    Result: PASS

## 2) hardNoRanges normalization consistency

Reality check (DB schema):
- `member_submissions.hard_no_ranges` is **NOT NULL** in the current schema.
- Therefore the system will only receive:
  - `[]`
  - a valid JSON array of ranges

Application contract (defensive normalization):
- `[]` = no hardNo
- `null / undefined` = normalize to `[]` (defensive behavior in `validateTeamInput`, for safety in case of:
  - legacy data
  - partial selects
  - future schema changes)

Expected:
- No crashes
- Same behavior as "no hardNo"

Cases:
- [x] hardNoRanges = []
- [!] hardNoRanges = null (blocked by DB constraint)
- [ ] hardNoRanges = undefined (simulated by missing mapping/select)

## Phase 1.2 — Evidence
- [x] 1.2-A hard_no_ranges = [] ✅ PASS
    Setup: updated one non-owner member hard_no_ranges = []
    Observed:
        rawMemberSubmissions.hard_no_ranges: []
        computedTeamMembers.hardNoRanges: []
    System behavior:
        Treated as no hardNo restrictions
        Feasible UTC hours increased
    Evidence:
        perWeekHardValidCount increased from 14 → 16
- [!] 1.2-B hard_no_ranges = null ⚠️ NOT APPLICABLE
    Attempt: set hard_no_ranges = null
    Result: DB rejects (Postgres not-null constraint)

## 3) workStart >= workEnd (cross-midnight NOT supported in Phase 1)
Expected:
- Block with clear error
Cases:
- [ ] workStart == workEnd
- [ ] workStart > workEnd
Additional rule:
    resolveToStandardTimezone() must NOT be used in fairness input path (display/legacy only)

## Deliverables (Cursor)
- [x] validateTeamInput() utility added (only validation+normalize)
- [x] determinism endpoint calls validateTeamInput before generateRotation
- [ ] /api/dev/phase1-input-contract endpoint or equivalent test runner
- [ ] PHASE1_REPORT.md with PASS/FAIL for all cases

### Phase 1.2 — hard_no_ranges Missing / Boundary Input

#### 1.2-A (hard_no_ranges = []) ✅ PASS

Setup:
- Updated one non-owner member:
  `hard_no_ranges = []`

Observed:
- Endpoint returned `ok: true`
- `rawMemberSubmissions.hard_no_ranges: []`
- `computedTeamMembers.hardNoRanges: []`

System behavior:
- Treated as **no hardNo restrictions**
- Feasible UTC hours increased

Evidence:
- `perWeekHardValidCount` increased from **14 → 16**

Conclusion:
- `[]` correctly interpreted as **no hardNo constraint**
- System remains deterministic and stable


#### 1.2-B (hard_no_ranges = null) ⚠️ NOT APPLICABLE

Attempt:

```sql
update public.member_submissions
set hard_no_ranges = null
...
```

### Phase 1.3 — workStart >= workEnd（反常班次 / 不支持跨午夜）

- [x] 1.3-B workStartHour > workEndHour（cross-midnight attempt）
  - Setup: update Bob (member_submissions) work_start_hour = 18, work_end_hour = 9
  - Expected: block generation + explicit error (no rotation)
  - Actual:
    ```json
    {"ok":false,"error":{"code":"INPUT_CONTRACT_VIOLATION","message":"Input contract violation: invalid or missing member data","details":[{"memberId":"1fb7946a-4a3d-465d-8aab-4aea5caf8d1f","name":"Bob","field":"workHours","reason":"workStartHour must be less than workEndHour (cross-midnight not supported)","value":{"workStartHour":18,"workEndHour":9}}]}}
    ```
  - Result: PASS
  