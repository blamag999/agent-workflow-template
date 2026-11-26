# Review — Token Optimization Proposal

- Date: 2026-11-26
- Role: Reviewer (Mắt)
- Repository: `blamag999/agent-workflow-template`
- Branch: `proposal/token-optimization`
- Proposal baseline: `8cee3ae` (reported by requester; short SHA)
- Reviewed: `docs/agent/PROPOSAL-token-optimization.md` (§9), `AGENTS.md`, `docs/agent/ADOPT.md`, `docs/agent/templates/{work,checkpoint,reuse}.md`, `docs/agent/roles/planner.md`
- Verdict: **REQUEST_CHANGES**
- Scope: documentation review only; no implementation, benchmark execution, or merge.

## Summary

The direction is sound: lightweight checkpoints, targeted context loading, task-local handoffs, and tiered verification can reduce unnecessary context and repeat work. However, an optimization should not increase operational overhead or compromise correctness. Address F01–F04 before approving a pilot protocol; collect actual measurements before broad adoption.

## Assessment of §9

| Question | Verdict | Rationale / adjustment |
|---|---|---|
| Stale checkpoint | Revise | A SHA mismatch indicates a delta, not necessarily an invalid checkpoint. Validate ancestry and scope. |
| Overlap with work file and INDEX | Accept | Checkpoint = repository overview; work file = live task and handoffs; INDEX = completed work only. |
| 300-line module threshold | Accept | Advisory hotspot signal, never a mechanical split requirement. |
| Stale REUSE.md | Accept | Update when genuinely reusable code is introduced or changed. |
| Stack-specific checkpoint script | Accept | Template stays stack-neutral; script is optional and repository-specific. |
| Token counts are estimates | Revise / measure | Distinguish estimates from direct usage data; measure complete task cycles. |
| Maintenance cost ~1–2k tokens | Unverified | Treat as a hypothesis and measure as part of the pilot. |

## Findings

### F01 — HIGH — Checkpoint SHA / delta handling

`AGENTS.md` instructs agents to compare checkpoint SHA and HEAD and read log/diff if different. Clarify that SHA mismatch alone is not corruption and ensure safe handling of divergent/non-ancestor refs.

**Required:** Include `checkpoint_sha`, `branch`, and `generated_at`. Verify the checkpoint commit is an ancestor of the current HEAD before using a range. On divergence or missing commit, fall back to MAP + active work file and an explicitly scoped inspection; never treat a misleading diff as authoritative. Also distinguish committed checkpoint SHA from an in-progress branch HEAD.

### F02 — HIGH — Benchmark must cover total workflow cost

The current proposal compares illustrative context-input token estimates (150k/40k/8k/0.1k) and suggests 3–5 tasks. These do not establish actual end-to-end savings.

**Required:** Define reproducible old-vs-new comparisons on comparable task types. Record measured input, output, total tokens, role handoffs, review/fix rounds, final acceptance, and checkpoint/documentation overhead. Keep tool-derived direct measurements separate from estimates; record provenance, task difficulty, environment/model, and any missing telemetry. Assess cost per accepted task, not just tokens loaded at session start. Avoid claims of percentage savings until supported.

### F03 — MEDIUM — Keep documentation nonduplicative

The checkpoint, active work file, index, map, reuse list, and archived checkpoints risk overlapping.

**Required:** State the source of truth for each: `CHECKPOINT.md` = brief repo-wide status; `work/<ID>.md` = task state and handoff history; `INDEX.md` = completed tasks; `MAP.md` = locations; `REUSE.md` = reusable code. Historical checkpoint snapshots are optional periodic archives, not compulsory on every handoff. Prefer delta updates to repeated status prose.

### F04 — MEDIUM — Reconcile conflicting operating rules

- Proposal suggests a work file ≤60 lines, while `work.md` has an append-only Section B. Limit **Section A** to ≤25 lines; do not impose a total-file cap on append-only history.
- A `git diff --stat` is a navigation aid, not proof that changed code is the only relevant context. Allow targeted surrounding context, contracts, tests and invariants.
- The three-review-round limit is an escalation threshold to Planner, **not** automatic acceptance of unresolved defects.
- For Hybrid adoption, explicitly preserve in-flight legacy work and define a transition boundary for new tasks.
- Operational note: prefer a single consistent branch naming convention per adopting repository; examples in the proposal and SOP should use that chosen convention.

## Proposed minimal operating flow

`Planner → Coder → Reviewer → Planner (APPROVE) / Coder (REQUEST_CHANGES)`.

One task, one work branch, one shared work file, with one append-only handoff entry per role session. Each completed code-mode session commits and pushes the updated artifact before handoff. Planner merges only on a recorded APPROVE, subject to repository-specific authorization gates.

## Acceptance criteria for revision

- [ ] AC1 F01: checkpoint provenance and divergent-ref fallback are specified consistently across proposal and AGENTS.
- [ ] AC2 F02: benchmark protocol and metrics are explicit; claims are labeled estimated vs measured.
- [ ] AC3 F03: documentation responsibilities are mutually exclusive; archive cadence is lightweight.
- [ ] AC4 F04: 25-line Section A rule, review escalation, context exceptions, and Hybrid migration are consistent.
- [ ] AC5 Pilot 3–5 real tasks using direct measurement; quality and handoff counts do not regress.
- [ ] AC6 No broad rollout before a pilot report evaluates cost per accepted task.

AC1–AC4 are prerequisites for agreeing to the pilot plan. AC5–AC6 are prerequisites for broad adoption; a finished benchmark is **not** necessary to approve running the pilot.

## Open questions for Planner

1. Which direct token telemetry does `token-guard` reliably expose for every agent/session? How will missing usage data be marked?
2. What baseline and task matching methodology prevents a misleading old-vs-new comparison?
3. What source-of-truth policy applies when branch HEAD changes after the last checkpoint?
4. Which approval gates must survive Hybrid migration without modification?
5. What is the explicit stop/rollback condition if the pilot increases review rounds or total tokens?

## Handoff

**To Planner (Não):** Revise the proposal and affected templates against F01–F04 on the same proposal branch, document responses to the open questions, and request independent review. **HOLD MERGE** until approval. Do not silently change the existing workflows in active projects.
