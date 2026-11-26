# Counter-Review — Lean Agent Workflow v2

- Date: 2026-11-26
- Role: Reviewer (Independent Counter-Review)
- Repository: `blamag999/agent-workflow-template`
- Branch: `proposal/token-optimization`
- Reviewed commit: `6f75148e`
- Reviewed files: `docs/agent/reviews/2026-11-26-token-optimization-review.md` (Addendum — Lean Agent Workflow v2), `docs/agent/PROPOSAL-token-optimization.md`, `AGENTS.md`, `docs/agent/ADOPT.md`
- Verdict: **MODIFY (Accept Lean v2 core, drop P2 S/M/L, resolve must-fix doc contradictions before pilot)**
- Scope: documentation counter-review only. **HOLD MERGE.**

## 1. Verdict on the 5 Lean v2 Improvements

| # | Priority | Improvement | Verdict | Rationale & Contradictions |
|---|---|---|---|---|
| 1 | P0 | Role-scoped progressive context | **ACCEPT** | High token savings at session start with zero extra ops. Safeguard ("never treat diff-only as completeness") fixes the over-strict wording in `AGENTS.md` L29 ("nothing else unless told" / `git diff --stat` only) and `PROPOSAL` §5 ("Chỉ đọc file trong diff"). |
| 2 | P0 | Task work file as single source of truth | **ACCEPT** | Eliminates file sprawl (`DELIVERY`/`REVIEW`/`ACCEPTANCE` per task) and matches `AGENTS.md` Core Rule 2. **Contradictions to fix:** (a) `PROPOSAL` TL;DR & §7 cap the whole work file at `≤60 lines`, conflicting with `AGENTS.md` L40–41 (`Section A ≤25 lines`, `Section B` append-only); (b) Lean v2 uses `STATE / HANDOFF / HISTORY` while `AGENTS.md` uses `front-matter / Section A / Section B` — keep the existing `AGENTS.md` naming to avoid template churn. |
| 3 | P1 | Risk-adaptive verification & evidence reuse | **MODIFY** | T1/T2/T3 is already in `AGENTS.md` L82–85 and saves significant time/tokens. **Contradiction to fix:** `ADOPT.md` L27 hardcodes `Coder (T1/T2) → Reviewer (T3)`, conflicting with `AGENTS.md` L85 (Reviewer may skip T3 if Coder/CI passed on exact `HEAD`). **Addition needed:** define minimal 5-field test-evidence metadata so reuse is auditable. |
| 4 | P1 | Event-based checkpoint | **MODIFY** | Updating `CHECKPOINT.md` on merge / major phase change (instead of every handoff) cuts Planner overhead. **Contradiction to fix:** `AGENTS.md` L29 assumes `git log <sha>..HEAD` always works when `sha ≠ HEAD`, which breaks on rebase/force-push/divergent branches (F01). Make `CHECKPOINT.md` **optional** for small/low-churn repos and drop compulsory periodic archives (`checkpoints/YYYY-MM-DD.md`). |
| 5 | P2 | S/M/L task sizing | **REJECT** | Overlaps with risk-based `T1/T2/T3` and adds classification overhead without changing role separation (S tasks still require an independent Reviewer). Risk + `Section A ≤25 lines` is sufficient. |

## 2. Answers to the 7 Open Questions (Addendum §E)

1. **Does the single shared work file preserve independent review evidence and role accountability?**
   - **Yes**, under three enforceable guardrails: (a) Section B is strictly **append-only** (never edit prior entries), (b) each role commits with `[<ID>][<role>]`, and (c) Reviewer commits touch **only** the work file (never code), verifiable via `git diff --name-only <coder_sha>..HEAD`. Standalone reports remain optional for audit-sensitive tasks.
2. **Should S tasks always need a separate Reviewer session, or bounded exceptions?**
   - **Keep an independent Reviewer** for any code, test, config, or workflow-rule change. **Bounded exception:** strictly non-functional doc/typo/index chores (zero code, config, test, or policy impact) may be closed by Planner with a 1-line note.
3. **Are event-based checkpoint triggers enough to recover across sessions, branches, and divergent HEADs?**
   - **Yes, only if `CHECKPOINT.md` is treated as a convenience cache, not source of truth.** Git (`HEAD`, `git log`), `work/<ID>.md`, and `MAP.md` remain authoritative. Require `checkpoint_sha`, `branch`, `generated_at`, and an ancestry check (`git merge-base --is-ancestor <checkpoint_sha> HEAD`); on failure or missing commit, fall back to `MAP.md` + active work file.
4. **What minimal test-evidence metadata is needed to safely reuse a PASS on the exact same commit?**
   - 5 fields in Section B (1–2 lines): `sha` (exact commit), `command` (exact CLI), `result` (`PASS N/N`), `tier` (`T1/T2/T3`), and `env_note` (only if non-default, e.g., CI URL, Node/DB version). Any change to code, tests, config, or lockfiles invalidates reuse.
5. **Is S/M/L classification worth its overhead? Could risk-based T1/T2/T3 alone suffice?**
   - **Drop S/M/L.** Risk-based `T1/T2/T3` + `Section A ≤25 lines` already governs verification depth and brevity without adding a redundant label.
6. **Can passive token collection be done with zero required extra tool invocations per role?**
   - **Only if external host/provider logs already record usage** (e.g., Codex/API logs). If measuring tokens requires agents to run extra commands or paste stats into handoffs, keep it **out of scope** and mark *unmeasured*.
7. **Which Lean v2 changes add complexity without clear practical benefit and should be dropped?**
   - Drop **P2 (S/M/L sizing)**.
   - Drop **compulsory periodic checkpoint archives** (`checkpoints/YYYY-MM-DD.md`) and **mandatory `checkpoint.mjs`** (keep optional).
   - Keep **`REUSE.md` and `CHECKPOINT.md` optional** for small repos.
   - Drop **in-handoff token-logging rituals**.

## 3. Feasibility, Savings & Risks

| Dimension | Assessment |
|---|---|
| **Feasibility** | **High.** Lean v2 aligns closely with existing `AGENTS.md`; only targeted doc edits are needed (no new tooling or automation required). |
| **Ops & Token Savings** | **Moderate–High (expected, unmeasured).** Biggest real wins come from: (1) single work file per task, (2) progressive context reading, (3) exact-SHA T3 reuse, and (4) merge-only checkpoint updates. |
| **Key Risks** | (1) **Stale/divergent checkpoint** misleading a new session if F01 ancestry check is missing; (2) **Rubber-stamp evidence reuse** if Coder logs `PASS` without exact SHA/command; (3) **Diff-only tunnel vision** missing callers/invariants; (4) **Doc drift** between `AGENTS.md`, `ADOPT.md`, and `PROPOSAL`. |

## 4. Must-Fix Correctness vs Optional Optimizations

### Must-Fix Correctness (Required before pilot)
1. **F01 (Checkpoint safety):** Update `AGENTS.md` L29 and `PROPOSAL` §5 to require `checkpoint_sha`, `branch`, `generated_at`, ancestry check (`git merge-base --is-ancestor`), and fallback to `MAP.md` + `work/<ID>.md` on divergence.
2. **F04 (Rule contradictions):**
   - Replace `≤60 lines` whole-file cap in `PROPOSAL` with `Section A ≤25 lines` + append-only Section B.
   - Soften "diff-only" reading in `AGENTS.md` L29 and `PROPOSAL` §5 to progressive context expansion.
   - Align `ADOPT.md` L27 (`Reviewer (T3)`) with `AGENTS.md` L85 (exact-SHA reuse) and add the 5-field evidence rule.
3. **F03 (Single source of truth & naming):** Keep `front-matter / Section A / Section B` naming consistent across all docs; state mutually exclusive roles for `CHECKPOINT.md`, `work/<ID>.md`, `INDEX.md`, `MAP.md`, `REUSE.md`.
4. **F02 (Methodological honesty):** Mark token numbers in `PROPOSAL` §2 & §9 as *unverified estimates*; accept passive measurement only (or *unmeasured*).

### Optional Optimizations (Adopt per repo need, never mandatory)
- `CHECKPOINT.md` (recommended for medium/large active repos; optional for small repos).
- `REUSE.md` (add only when real shared utilities exist).
- `scripts/checkpoint.mjs` and periodic `checkpoints/` archives.
- Passive token collection from external Codex/API logs.

## 5. Smallest Viable Final Workflow (Lean v2 Minimal)

1. **Flow:** `Planner → Coder → Reviewer → Planner (merge on APPROVE)` (bounded exception: Planner may self-close pure doc/typo chores with zero code/config/test/policy impact).
2. **Single Task SSOT:** `docs/agent/work/<ID>-<slug>.md` (`front-matter` + `Section A ≤25 lines` + append-only `Section B`). No extra per-task reports unless audit-required.
3. **Progressive Context:** Start from `CHECKPOINT.md` (if present & ancestor-valid) + `AGENTS.md` + role file + work file (`Section A` + last `Section B` entry) + `Read next`; expand to callers/contracts/tests whenever needed.
4. **Risk-Based Verification:** `T1/T2/T3` only (no S/M/L). Reuse exact-SHA PASS when 5-field evidence (`sha`, `command`, `result`, `tier`, `env_note`) is present and valid.
5. **Event-Based Checkpoint (Optional):** Update `CHECKPOINT.md` only on task merge or major phase/architecture change, with F01 provenance.

## 6. Round 2 — Deep Critique of Blind Spots & Convergence Proposal

To reach consensus on the cleanest possible workflow, here are 5 subtle blind spots in Addendum — Lean v2 that need explicit agreement before locking the spec:

| # | Blind Spot in Lean v2 | Concrete Risk | Proposed Fix for Consensus |
|---|---|---|---|
| B1 | **Subjective pilot gates (§D.3):** "handoff burden" and "maintainability" have no objective metric when token telemetry is absent. | Pilot ends in subjective debate with no clear pass/fail bar. | Adopt **3 zero-cost Git-native proxy metrics**: (1) `review_rounds` per task (count of `[<ID>][reviewer]` commits; target ≤2), (2) `workflow_files_edited` per task (target = 1: `work/<ID>.md`), (3) `context_miss_rework` (count of `REQUEST_CHANGES` caused by missed callers/contracts). |
| B2 | **Unbounded `Section B` growth (§C):** Append-only history with no per-entry cap + loose `~300 words` rule in `AGENTS.md` L73. | After 2–3 rounds, agents that read the whole work file burn tokens on stale history. | Keep `Section B` append-only, tighten per-entry cap to **≤15 lines / ≤150 words**, and require targeted tail-read (front-matter + Section A + **last Section B entry only**). |
| B3 | **Local vs CI evidence reuse (§B P1):** Exact-SHA PASS reuse does not distinguish Coder's local environment (`.env`, local DB/Wrangler state) from CI. | False-positive PASS on high-risk changes (auth, DB migrations, prod config). | Split reuse rule: **CI PASS on exact `HEAD`** → reusable for T1/T2/T3. **Coder local PASS on exact `HEAD`** → reusable for T1/T2 only; T3 high-risk gates still require CI or independent Reviewer run. |
| B4 | **Parallel-branch merge conflicts on `CHECKPOINT.md` (§B P1):** Neither `AGENTS.md` nor Lean v2 forbids editing `CHECKPOINT.md` on work branches. | Two parallel tasks editing `CHECKPOINT.md` will always conflict on merge. | Add explicit rule: **`CHECKPOINT.md` is integration-branch-only** — updated *only* by Planner on the integration branch after merge, never on `work/<ID>` branches. |
| B5 | **Repo-level file sprawl (§C):** 5 repo-level docs (`AGENTS.md`, `MAP.md`, `REUSE.md`, `CHECKPOINT.md`, `INDEX.md`) is still heavy for small repos. | Small repos abandon the template due to doc maintenance. | Replace per-task S/M/L sizing with a **2-Tier Repo Profile** chosen once at adoption: **Core** (`AGENTS.md` + `MAP.md` + `work/<ID>.md`) vs **Scale-up** (+ optional `CHECKPOINT.md`, `REUSE.md`, `INDEX.md`). |

### Convergence Checklist (For the Other Reviewer to Confirm)

Please reply **AGREE / DISAGREE (+ alternative)** on these 6 points so we can finalize Lean v2:
1. Drop **P2 (S/M/L per-task sizing)** and use **2-Tier Repo Profile (Core vs Scale-up)** + risk-based `T1/T2/T3` instead?
2. Keep existing `AGENTS.md` naming (`front-matter / Section A / Section B`) and tighten `Section B` entries to **≤15 lines / ≤150 words**?
3. Adopt the **3 zero-cost Git-native pilot metrics** (B1) alongside optional passive token logs?
4. Restrict **Coder local PASS reuse** to T1/T2, while T3 high-risk gates require CI PASS or independent Reviewer run (B3)?
5. Enforce **`CHECKPOINT.md` is integration-branch-only** (never edited on work branches) + F01 ancestry check (B4)?
6. Allow **Planner self-close** *only* for pure non-functional doc/typo/index chores (zero code/config/test/policy impact)?

## 7. Final Convergence (6/6 AGREE — 2026-11-26)

- Counter-reviewer response to `docs/agent/reviews/2026-11-26-token-optimization-review.md` (Round 2 at `8db27a9`):
- **Point #3 (Pilot metrics): AGREE.**
  - Rationale: Requiring 3 mandatory proxy metrics or a hard `review_rounds ≤ 2` gate would add unnecessary tracking overhead and risk perverse incentives. Using `review_rounds` (derived opportunistically from tagged Reviewer commits) as the **sole optional lightweight indicator**—without hard thresholds, mandatory `workflow_files_edited` / `context_miss_rework` logging, or manual rituals—is leaner and preserves the core principle that workflow overhead must stay minimal.
- **Consensus Status: 6/6 AGREE.** All 6 convergence items and B1–B5 are settled:
  1. **Repo profile & verification:** Drop per-task S/M/L; use **Core vs Scale-up** once at repo onboarding + risk-based `T1/T2/T3`.
  2. **Work file SSOT:** Keep `front-matter / Section A / Section B`; `Section A ≤25 lines`, `Section B` append-only with each new entry **≤15 lines and ≤150 words**; targeted tail-read (front-matter + Section A + latest Section B entry).
  3. **Pilot evaluation:** Optional `review_rounds` indicator only (no hard gate, no 3-metric collection); optional passive token logs only if zero-overhead; judge on gate integrity, acceptance quality, and low friction; no numerical savings claims without comparable measured data.
  4. **Evidence reuse:** Coder local PASS reusable for T1/T2; high-risk T3 requires trustworthy CI PASS or independent Reviewer run. Record 5 fields (`sha` of tested code/config/test revision, `command`, `result`, `tier`, `env_note`). Doc-only Reviewer commits do not invalidate prior tested-revision evidence.
  5. **Event-based checkpoint (optional):** `CHECKPOINT.md` is Planner-owned, **integration-branch-only** (updated post-merge via commit/PR respecting branch protections; never edited on work branches). Include `checkpoint_sha`, `branch`, `generated_at`, ancestry check (`git merge-base --is-ancestor`), and fallback to `MAP.md` + active work file.
  6. **Planner self-close exception:** Allowed *only* for purely non-functional doc/typo/index chores with zero code, test, config, or policy impact, with a 1-line rationale in the task log.

## Handoff

**To Planner (Não):** Both reviewers have reached **6/6 convergence** on Lean Agent Workflow v2. Apply the agreed edits to `AGENTS.md`, `docs/agent/ADOPT.md`, `docs/agent/PROPOSAL-token-optimization.md`, and affected templates (resolving F01/F03/F04 and F02 wording) on `proposal/token-optimization`, then request final independent review before pilot. **HOLD MERGE** into `main`.
