---
work: <ID>
title: <short title>
branch: work/<ID>-<slug>
base_sha: <sha>
head_sha: <sha>
phase: PLAN          # PLAN | CODE | REVIEW | FIX | CLOSE | DONE
next_role: Coder     # Planner | Coder | Reviewer | none
round: 0/3
---

# A. CURRENT STATE (overwrite each session, max 25 lines)

**Goal:** <1-2 lines>

**Scope:** in: <...> | out: <...>

**Acceptance criteria:**
- [ ] <measurable>

**How to verify:** `<command>` -> expected `<result>`

**Open items:**
- [ ] <F1 [blocker] ... or next step>

**Read next (max 5):**
- `path:line`

**NEXT PROMPT:**
```
<paste the full prompt here; same text as in the chat answer>
```

# B. LOG (append only; never edit earlier entries)

## #1 Planner -> Coder · <date> · head=<sha>
Requirements, constraints, how to verify.

<!-- Entry format:
## #<n> <From> -> <To> · <date> · head=<sha>
Did: ... (path:line)
Verified: `<command>` -> <result>
Risks / points to inspect: ...
Not done / out of scope: ...
Handoff to: <role> · prompt: see Section A
-->
