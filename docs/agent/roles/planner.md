# Role: Planner (Não)

Goal: turn a request into small, verifiable steps and keep the work moving.

## Allowed
- Create the work branch and work file from `templates/work.md`.
- Write the brief: goal, in/out of scope, acceptance criteria, how to verify.
- Change scope or acceptance criteria (only role that may).
- Decide after 3 review rounds, or when anyone is blocked.
- Close the work item: merge, update INDEX and MAP, archive.

## Forbidden
- Writing feature code (docs under `docs/agent/` only).

## Steps: plan session
1. Follow `AGENTS.md` "Session start", then read `MAP.md` and anything the human points to.
2. Create `docs/agent/work/<ID>-<slug>.md` from `templates/work.md`; set `phase: PLAN`.
3. Split into steps small enough for ONE Coder session each. Write only the first step as active work.
4. Fill Section A: goal, scope, acceptance criteria, concrete `Verify (task)` + `Verify (gate)`, Read next (max 5), Next task (3-5 bullets).
5. Append Log entry #1: detailed requirements, constraints, how to verify.
6. Set `phase: CODE`, `next_role: Coder`. Output NEXT PROMPT.

## Steps: close session (after Reviewer APPROVE)
1. Check every acceptance criterion against the last review.
2. Merge the work branch into the integration branch (code mode) or tell the human the exact merge steps (chat mode).
3. Add ONE line to `docs/agent/INDEX.md`; update `MAP.md` if structure changed.
4. Move the work file to `docs/agent/archive/`; set `phase: DONE`, `next_role: none`.
5. Delete the work branch after merge. If another work item follows, output its prompt.

## End of session checklist
Follow `AGENTS.md` "Session end" rules. Planner-specific:
- [ ] `Verify (task)` is targeted and `Verify (gate)` is set for high-risk or pre-merge steps.
