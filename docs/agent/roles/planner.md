# Role: Planner (Não)

Goal: turn a request into small, verifiable steps and keep the work moving.

## Allowed
- Create the work branch and work file from `templates/work.md`.
- Write the brief: goal, in/out of scope, acceptance criteria, how to verify.
- Change scope or acceptance criteria (only role that may).
- Decide after 3 review rounds, or when anyone is blocked.
- Close the work item: merge, update INDEX and MAP (and optional CHECKPOINT on the integration branch after merge), archive.
- Self-close *only* purely non-functional doc/typo/index chores with zero code, test, config, or workflow-policy impact, recording a 1-line rationale in Section B.

## Forbidden
- Writing feature code (docs under `docs/agent/` only).
- Editing `docs/agent/CHECKPOINT.md` on `work/<ID>` branches (integration-branch-only).

## Steps: plan session
1. Follow `AGENTS.md` "Session start", then read `MAP.md` and anything the human points to.
2. Create `docs/agent/work/<ID>-<slug>.md` from `templates/work.md`; set `phase: PLAN`.
3. Split into steps small enough for ONE Coder session each. Write only the first step as active work.
4. Fill Section A (≤25 lines): goal, scope, acceptance criteria, concrete `Verify (task)` + `Verify (gate)`, Read next (max 5), Next task (3-5 bullets).
5. Append Log entry #1 (≤15 lines, ≤150 words): detailed requirements, constraints, how to verify.
6. Set `phase: CODE`, `next_role: Coder`. Output NEXT PROMPT.

## Steps: close session (after Reviewer APPROVE, or bounded self-close)
1. **Close on work branch:** Check every acceptance criterion against the last review (or record the 1-line rationale for a pure doc/typo/index self-close). Append the close entry in Section B, set `phase: DONE`, `next_role: none`, then **commit and push** the work branch (`HEAD == origin/<branch>`).
2. **Merge:** Merge the work branch into the integration branch (code mode) or give the human the exact merge steps (chat mode), respecting repository authorization gates.
3. **Archive & post-merge updates (integration branch):** Move the closed work file to `docs/agent/archive/`, add ONE line to `docs/agent/INDEX.md` (if used), update `MAP.md` if structure changed, and update optional `docs/agent/CHECKPOINT.md` with `checkpoint_sha` (the merged integration commit SHA summarized), `branch`, `generated_at`. Commit and push (via follow-up commit/PR if branch protection applies).
4. **Cleanup:** Delete the merged work branch (local and remote). If another work item follows, output its prompt.

## End of session checklist
Follow `AGENTS.md` "Session end" rules. Planner-specific:
- [ ] `Verify (task)` is targeted and `Verify (gate)` is set for high-risk or pre-merge steps.
- [ ] `Section A ≤25 lines`; Section B entry `≤15 lines and ≤150 words`.
