---
work: <ID>
title: <short title>
branch: work/<ID>-<slug>
base_sha: <sha>
phase: PLAN          # PLAN | CODE | REVIEW | FIX | CLOSE | DONE
next_role: Coder     # Planner | Coder | Reviewer | none
round: 0/3
---

# A. CURRENT STATE (overwrite each session, max 25 lines)

**Goal:** <1-2 lines>

**Scope:** in: <...> | out: <...>
**Entry points:** `path:line`
**Reuse:** <util/component có sẵn>

**Acceptance criteria:**
- [ ] <measurable>

**Verify (task):** `<targeted command>` -> expected `<result>`
**Verify (gate):** `<full command or "CI / none">` (run before APPROVE/merge or high-risk changes)

**Next task (3-5 bullets):**
- [ ] <F1 [blocker] ... or next concrete step>

**Read next (max 5):**
- `path:line`

# B. LOG (append only; never edit earlier entries)

## #1 Planner -> Coder · <date>
Requirements, constraints, how to verify.

<!-- Entry format:
## #<n> <From> -> <To> · <date>
Did: ... (path:line)
Verified: `<command>` -> <result>
Risks / points to inspect: ...
Not done / out of scope: ...
Handoff to: <role>
-->
