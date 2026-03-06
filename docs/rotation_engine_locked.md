# Parallel Rotation Engine
# Locked Algorithm Specification

Status: LOCKED

This document defines the stable behavior of the Parallel rotation
solver after completing full algorithm verification.

The rotation engine is considered production-stable.

---

# Core Problem

Global teams operate across incompatible time zones.

A meeting time that is convenient for one region may be
late-night or early-morning for another.

Parallel does not attempt to eliminate inconvenience.

Instead it distributes inconvenience **fairly over time**.

---

# Algorithm Overview

The solver generates recurring meeting schedules using
a fairness-aware beam search algorithm.

The algorithm evaluates candidate meeting times and attempts
to minimize cumulative burden across participants.

---

# Scheduling Pipeline

1. Candidate Generation

For each week the engine enumerates valid time slots.

Constraints applied:

• meeting cadence
• duration
• timezone conversions
• hard boundaries

Result:

hardValidCandidatesCount

---

2. Fairness Scoring

Each candidate time receives a penalty score based on:

• early meetings
• late meetings
• deviation from normal working hours
• cumulative burden

Penalty accumulation is tracked per participant.

---

3. Beam Search Planning

The solver builds multi-week schedules using beam search.

At each step:

candidate schedules are expanded
top scoring schedules are kept
lower scoring schedules are pruned

Beam width is controlled by:

FAIRNESS_BEAM_WIDTH

Current value:

200

---

4. Strict Fairness Mode

The solver first attempts to produce a schedule where
burden distribution satisfies fairness limits.

If successful:

modeUsed = STRICT

---

5. Relaxed Mode

If strict fairness is impossible, fairness constraints
are softened.

modeUsed = RELAXED

---

6. Fallback Mode

If the solver cannot produce a shareable plan
even after relaxed constraints:

modeUsed = FALLBACK

forcedReason = BEAM_EXHAUSTED

The engine still returns the best possible schedule.

---

# Explain System

The solver returns diagnostic information including:

weeks[]
candidate counts
rejection reasons
failure modes

This allows debugging and transparency.

---

# Determinism

The solver must produce identical outputs for identical inputs.

No randomness is allowed in the search process.

---

# Verified Test Coverage

The algorithm has passed the following verification packs:

Phase 0 — Determinism  
Phase 1 — Input Contracts  
Phase 2 — Hard Constraints  
Phase 3 — Fairness Scoring  
Phase 4 — Boundary Guards  
Phase 5 — Explain Layer  
Phase 6 — Strict / Relaxed Pipeline  
Phase 7 — Explain Validation  
Phase 8 — Fairness Metrics

Additional stress tests:

Pack I — 20 Member Load Test  
Pack J — Candidate Density Stability

---

# Performance Envelope

The solver remains stable with:

• up to 20 participants
• global timezone distribution
• 8-week rotation horizon

Typical generation time:

2–3 seconds.

---

# Engineering Rule

The rotation engine is now considered **core infrastructure**.

Any change affecting:

• fairness scoring
• beam search
• candidate enumeration
• fallback behavior

must pass the full rotation test suite.

---

End of Locked Specification