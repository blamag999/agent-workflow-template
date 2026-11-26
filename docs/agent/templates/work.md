---
work: <ID>
title: <short title>
branch: work/<ID>-<slug>
base_sha: <sha>
phase: PLAN          # PLAN | CODE | REVIEW | FIX | CLOSE | DONE
next_role: Coder     # Planner | Coder | Reviewer | none
round: 0/3
---

# A. CURRENT STATE (overwrite each session, <=25 lines)

**Goal:** <1-2 lines>

**Scope:** in: <...> | out: <...>
**Entry points:** `path:line`
**Reuse:** <existing util/component or none>

**Acceptance criteria:**
- [ ] <measurable>

**Verify (task):** `<targeted command>` -> expected `<result>`
**Verify (gate):** `<full command or "none">` (risk-based T3 only; high-risk T3 requires trustworthy CI PASS or independent Reviewer run)

**Next task (3-5 bullets):**
- [ ] <F1 [blocker] ... or next concrete step>

**Read next (max 5):**
- `path:line`

# B. LOG (append only; never edit earlier entries)

## #1 Planner -> Coder · <date>
Requirements, constraints, how to verify.

<!-- Entry format (<=15 lines AND <=150 words; tail-read loads latest entry only):
## #<n> <From> -> <To> · <date>
Did: ... (`path:line`)
Verified: sha=<tested_sha> | cmd=`<command>` | res=<PASS N/N> | tier=<T1|T2|T3> | env=<local|CI url|note>
Risks / points to inspect: ...
Not done / out of scope: ...
Handoff to: <role>
-->
