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

---

## Addendum — Lean Agent Workflow v2 (2026-11-26)

**Purpose:** Submit a simpler alternative for independent challenge. This addendum updates the recommended approach, not the original evidence or the F01–F04 findings above. **Status: PROPOSED / OPEN FOR COUNTER-REVIEW. HOLD MERGE.**

### A. Updated position on token measurement (supersedes F02 severity/rollout interpretation)

- **F02 revised severity: MEDIUM (measurement-method clarity), not HIGH.** A heavyweight benchmark is **not a prerequisite** for adopting a lightweight workflow. AC2 remains relevant only to claims of *measured* token savings; do not block ordinary implementation solely for lack of token telemetry.
- Prefer **passive measurement** from existing Codex/API usage logs, when reliably available, with task ID, role, session ID, model, input/output/total tokens, and provenance; record cached-token semantics carefully to avoid double counting.
- Sample 3–5 *normal* tasks opportunistically. No compulsory artificial reruns, paid API integration, separate backend/database, or token instrumentation inside every handoff.
- Compare total tokens **per accepted task**, review/fix loops, quality and human overhead when comparable baseline exists. Do not report percentage savings if source data/model/task difficulty are not comparable. No log availability => mark *unmeasured*, never estimate as observed.
- `token-guard` may estimate text/context size but **must not be represented as actual agent-session token usage** unless it receives verified provider usage data.
- **Optimization must not cost more than its benefits.** Monitoring must be optional and nonblocking; keep high-risk verification mandatory independently of telemetry.

### B. Proposed Lean v2 process

Retain **Planner (Não) → Coder (Tay) → independent Reviewer (Mắt) → Planner (approve/close)**; Reviewer REQUEST_CHANGES loops to Coder. Keep **one branch + one shared work file per task**. Each code-mode role commits and pushes its handoff before a new role starts. Planner merges only on explicit APPROVE and applicable authorization gates. Do not weaken independent review, safety gates or repo-specific invariants.

Five improvements to debate:

| Priority | Improvement | Proposed rule | Safeguard |
|---|---|---|---|
| P0 | Role-scoped progressive context | Planner reads policy/state/task; Coder reads task/affected code/contracts; Reviewer reads task/diff/tests/evidence; closing Planner reads verdict and merge gates. | Expand to architecture, dependencies, tests, history when needed; never use diff-only reading as a completeness guarantee. |
| P0 | Task work file as single source of truth | `docs/agent/work/<ID>.md` contains STATE (current), HANDOFF (latest), HISTORY (append-only). Avoid mandatory DELIVERY/REVIEW/ACCEPTANCE files per task. | Dedicated reports still allowed for complex, audit-sensitive, or externally required evidence. |
| P1 | Risk-adaptive verification and evidence reuse | T1 targeted for low-risk change, T2 impacted for shared changes, T3 full gate for auth, DB, migrations, release, or merge according to project policy. | Reviewer independently checks provenance and test validity; reusing exact-SHA results is allowed only when tests/config/environment and policy make them applicable. |
| P1 | Event-based checkpoint | Update summary after task merge or consequential architecture/phase change, rather than after each role session. | Checkpoint must carry provenance and safe stale/divergent-branch handling per F01. |
| P2 | S/M/L task sizing | Keep same role separation but vary work-file verbosity, verification and checkpoint granularity by scope/risk. | S tasks still receive an independent Reviewer; risk, not line count alone, governs gates. |

### C. Lean documentation boundaries

- `AGENTS.md`: stable common rules, concise.
- `MAP.md`: module/file location only; `REUSE.md`: actually reusable entry points only (optional for tiny repos).
- `CHECKPOINT.md`: short repository-wide overview, updated by event, with provenance.
- `INDEX.md`: completed work only.
- `work/<ID>.md`: sole required task status/acceptance/handoff history; current STATE ≤25 lines, HISTORY not subject to a total-file line cap.
- `archive/`: finished task records; extra reports are optional based on risk/compliance.

Avoid duplicate status narratives across files. Preserve hybrid adoption for in-flight legacy tasks and never overwrite active work automatically.

### D. Revised decision / gates proposed for counter-review

1. **Approve pilot design** when F01, F03, F04 and the *methodological wording* of F02 are resolved consistently; no numerical token benchmark required.
2. **Allow limited real-task adoption** using existing Git/Codex infrastructure. Passive usage logging only if already accessible without material overhead.
3. **Judge broad adoption primarily on quality, successful acceptance, handoff burden and maintainability**, alongside any trustworthy token data. Do not advertise token reductions as verified without measurements.
4. **Stop or revert the workflow change** if essential reviews/gates are bypassed, task history becomes ambiguous, or overhead materially worsens.

### E. Questions to the counter-reviewer

1. Does the single shared work file preserve enough independent review evidence and role accountability, including when a Reviewer must not alter implementation?
2. Should S tasks always need a separate Reviewer session, or are there carefully bounded exceptions without undermining the three-role contract?
3. Are the proposed event-based checkpoint triggers enough to recover reliably across sessions, branches, and divergent HEADs?
4. What minimal test-evidence metadata is necessary to safely reuse a PASS on the exact same commit (test version, environment, configuration, timestamps)?
5. Is S/M/L classification worth its overhead? Could risk-based T1/T2/T3 alone suffice?
6. Can passive token collection be implemented with **zero required extra tool invocations per role**? If not, should it remain wholly out of scope?
7. Which of the Lean v2 changes adds complexity without clear practical benefit, and should be dropped?

### F. Counter-review expected response

Return **ACCEPT / MODIFY / REJECT** for each of the five improvements, with concrete rationale and any contradictions with `AGENTS.md` / `ADOPT.md`. Distinguish **must-fix correctness** from **optional optimizations**. Propose the *smallest* viable final workflow, not a new automation subsystem. Record unresolved points in this review discussion or a linked follow-up. **No merge into `main` without approval.**

---

## Round 2 — Response to Lean v2 Counter-Review Convergence Checklist (2026-11-26)

- Reviewer: Mắt (original Lean v2 proposer)
- Counter-review baseline: `docs/agent/reviews/2026-11-26-lean-v2-counter-review.md` at `874366a`
- Status: **5 AGREE / 1 DISAGREE WITH ALTERNATIVE**
- Scope: documentation feedback only; **HOLD MERGE**.

| # | Decision | Agreement / concrete alternative |
|---|---|---|
| 1 | **AGREE** | Drop per-task S/M/L; adopt Core vs Scale-up repo profile at onboarding, with risk-based T1/T2/T3. Avoid turning the repo profile into recurring per-task classification. |
| 2 | **AGREE** | Keep `front-matter / Section A / Section B`. Keep Section A ≤25 lines, Section B append-only. Each new Section B entry ≤15 lines **and** ≤150 words. Targeted reads: current front-matter, Section A, latest log entry; older history only on demand. |
| 3 | **DISAGREE** | **Alternative:** Do not require all 3 pilot proxy metrics as mandatory gates. `review_rounds` can be counted from tagged Reviewer commits where cleanly attributable; preserve it as the **only default lightweight indicator**, not a hard ≤2 acceptance criterion. `workflow_files_edited=1` is a design aspiration, not a useful failure gate (legitimate audit documents and repo-level files exist). `context_miss_rework` requires subjective attribution and creates logging overhead; record it only if an existing Reviewer finding identifies the reason without additional work. Optional passive token logs remain optional. Judge adoption on no skipped required gates, successful acceptance, and evident operational friction; if no comparable data, make no numerical savings claims. |
| 4 | **AGREE** | Coder local PASS may be reused for T1/T2 if evidence is valid; high-risk T3 needs trustworthy CI PASS or independent Reviewer execution. Record `sha, command, result, tier, env_note`. Clarify that `sha` identifies the **tested code/config/test revision**: a subsequent documentation-only Reviewer commit need not invalidate evidence, but any change affecting the tested inputs, execution environment or dependencies does. Require independent assessment of coverage and evidence provenance; CI is not automatically sufficient if required external conditions are missing. |
| 5 | **AGREE** | `CHECKPOINT.md` is Planner-owned and updated **only on the integration branch after merge**, never on work branches. It is a convenience cache, not task source of truth. Store `checkpoint_sha` of the represented integration revision, branch, generated_at. Check ancestor relation when using a delta; divergence/missing SHA falls back to MAP + active work. Repository branch protections may require a normal follow-up PR/commit for this post-merge update; do not bypass protection. |
| 6 | **AGREE** | Planner self-close only for purely non-functional doc/typo/index chores with **zero code, test, config, or policy effect**. Document one-line rationale in task log. Any ambiguity or effect on agent rules/workflow triggers independent Reviewer. No exception to required authorization gates. |

### Position on B1–B5

- **B1:** Accept the need for observable evidence, **reject mandatory three-metric collection** as an anti-lean burden. Use existing Git logs opportunistically; no manual tracking rituals or arbitrary thresholds.
- **B2:** Accept caps on each log entry and latest-entry context loading; never truncate historical evidence.
- **B3:** Accept strict high-risk T3 evidence separation, with test-input revision and environment validity explicitly checked.
- **B4:** Accept integration-only checkpoint updates; specify post-merge commit/PR behavior where protection rules apply.
- **B5:** Accept Core/Scale-up **only at repo adoption time**, not a new ongoing classification workflow.

### Remaining decisions for Planner

1. Implement #1, #2, #4, #5, #6 as agreed, including high-risk test evidence provenance and protected-branch handling.
2. For #3, decide whether `review_rounds` should be optional reporting only (recommended); avoid hard gates or additional logging requirements without demonstrated value.
3. Resolve original F01/F03/F04 contradictions across `AGENTS.md`, `ADOPT.md`, proposal and templates; label any token savings as unmeasured unless provider usage exists.
4. Keep the process minimal: no extra tool, no required benchmark, no new mandatory artifact per role.

**Handoff:** Counter-reviewer may accept or challenge point #3. Once settled, hand to Planner for targeted edits on the same branch and request a final independent review. **HOLD MERGE**.
