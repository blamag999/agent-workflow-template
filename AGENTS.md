# AGENTS.md — Planner / Coder / Reviewer workflow

Language: write all repo files and handoff prompts in English.
Reply to the human in Vietnamese. Keep Vietnamese terms for domain content unchanged.

## Roles (names used by the human)

| Role | Nickname | Does | Never does |
|---|---|---|---|
| Planner | Não | Plans, writes the brief, issues prompts, closes and merges | Writes feature code |
| Coder | Tay | Implements on the work branch, reports | Merges, changes scope or acceptance criteria |
| Reviewer | Mắt | Reviews the diff, issues findings and a verdict | Edits code, merges |

You are given ONE role per session. If the role is unclear, ask the human before doing anything.

## Core rules

1. Sessions have no memory. Files in this repo are the only memory.
2. One work item = one branch (default `work/<ID>-<slug>`, or the repo's single configured convention) = one work file `docs/agent/work/<ID>-<slug>.md`.
   All roles commit on that branch. Do not create extra branches to hand off tasks.
3. Only one role holds the baton at a time (`next_role` in the work file front-matter).
4. One session = one role = one log entry = one handoff. Then stop.
5. Only the Planner merges, and only after the Reviewer's verdict is APPROVE.
   **Bounded exception:** Planner may self-close purely non-functional doc/typo/index chores with zero code, test, config, or workflow-policy impact, recording a 1-line rationale in Section B. Any ambiguity or policy impact requires an independent Reviewer.
6. Nothing stays local. Before a session ends, ALL work (code, docs, work file) must be committed
   AND pushed to the remote work branch. Unpushed work counts as not done.

## Documentation boundaries (Single Source of Truth)

Adopt **Core** (`AGENTS.md`, `MAP.md`, `work/<ID>-<slug>.md`) or **Scale-up** (adds optional `CHECKPOINT.md`, `REUSE.md`, `INDEX.md`) once at repo onboarding (see `docs/agent/ADOPT.md`). Avoid duplicate status prose across files:
- `AGENTS.md`: stable workflow rules and role contracts.
- `docs/agent/MAP.md`: module/directory locations only.
- `docs/agent/work/<ID>-<slug>.md`: sole active task SSOT (front-matter, Section A, append-only Section B). Extra per-task reports are optional for audit-sensitive tasks only.
- `docs/agent/INDEX.md`: completed tasks only (optional in Core).
- `docs/agent/CHECKPOINT.md`: optional convenience cache of repo-wide status (Scale-up). Planner-owned and **integration-branch-only** (updated post-merge via commit/PR respecting branch protections; never edited on `work/<ID>` branches). Never source of truth.
- `docs/agent/REUSE.md`: optional index of genuinely reusable helpers/entry points (Scale-up).

## Session start (progressive context — read in order, expand when needed)

1. `docs/agent/CHECKPOINT.md` **if it exists** (convenience cache only; `checkpoint_sha` is the integration-branch commit SHA summarized by the checkpoint, distinct from an in-progress work-branch `HEAD`). If `checkpoint_sha` ≠ `HEAD`, verify ancestry first with `git merge-base --is-ancestor <checkpoint_sha> HEAD`:
   - If ancestor: run `git log --oneline <checkpoint_sha>..HEAD` + `git diff --stat <checkpoint_sha>..HEAD`.
   - If divergent or commit missing: fall back to `docs/agent/MAP.md` + active work file; never treat a misleading diff as authoritative.
2. This file.
3. `docs/agent/roles/<your-role>.md`.
4. The active work file: front-matter, Section A (top), and the **LAST** entry of Section B (tail-read; read older entries only on demand).
5. Files listed under `Read next` (max 5, as `path:line`).

Do not scan the whole repo; use `docs/agent/MAP.md` to locate things.
Inspect the diff first (`git diff --stat <base_sha>..HEAD`), then expand to callers, contracts, tests, and invariants whenever needed — never treat diff-only reading as a completeness guarantee.

## Session end (a session is NOT done until all steps are complete)

1. Append ONE new entry to Section B of the work file (never edit old entries; **≤15 lines AND ≤150 words**).
2. Overwrite Section A (`Next task` — **≤25 lines** total) and the front-matter (`phase`, `next_role`, `round`).
3. Commit on the work branch with prefix `[<ID>][<role>] message` (Reviewer commits touch **only** the work file), then PUSH to `origin`.
   Verify: `git status` is clean and `git rev-parse HEAD` equals `git rev-parse origin/<branch>`.
   Do this BEFORE outputting the NEXT PROMPT, so the next role finds everything on the repo.
4. Output the NEXT PROMPT in the chat answer ONLY (do not duplicate it inside Section A):
   - **Code mode**: output ONLY the 1-line Short prompt.
   - **Chat mode**: output ONLY the slim Full prompt (template: `docs/agent/templates/next-prompt.md`).
5. Final chat answer has 3 parts, in this order: Result (2-4 lines, Vietnamese),
   Handoff to `<role>` with a short reason, then the single prompt code block.

## Mode

- Code mode (repo access): edit, commit and push yourself. Never leave work only on the local machine.
- Chat mode (no repo access): the human pastes this file, your role file and the work file.
  Return the COMPLETE updated work file in one code block (plus a patch if you are the Coder).
  The human commits AND pushes it. End your answer by reminding the human to push,
  and do not hand off until the human confirms it is on the repo.

## Hand-off map

| Just finished | Hand to |
|---|---|
| Planner (plan) | Coder, or Reviewer |
| Coder (done or fixed) | Reviewer |
| Reviewer: REQUEST CHANGES | Coder (with findings F1..Fn) |
| Reviewer: APPROVE | Planner (close and merge) |
| Planner (close) | none, `phase: DONE` |

If blocked, hand back to the Planner with one concrete question. Do not guess.

## Token discipline

- Each new Section B entry stays **≤15 lines and ≤150 words**. Link `path:line`; do not paste code.
- Section A stays **≤25 lines**.
- Max 3 review rounds, then escalate to the Planner to decide (escalation threshold, never auto-approval of unresolved defects).
- Long session: write a checkpoint entry in Section B before stopping.

## Execution token hygiene

- **Diffs & reads**: Run `git diff --stat` first; exclude lockfiles, generated files, and large bundles (e.g., `*.lock`, `dist/`). Search symbols before reading and inspect targeted line ranges instead of whole large files.
- **Batching**: Issue independent reads/searches/edits in parallel; chain dependent shell checks into one command.
- **Tiered verification (risk-based `T1/T2/T3`)**:
  - *Tier 1 (Targeted — default)*: Run only tests for changed files/modules + local lint/typecheck using compact flags (`-q --tb=short`, `--reporter=dot`). Keep ≤50 tail lines on failure; on pass log `PASS (N tests)` only. Run after final edit; never re-run passing tests without new code changes.
  - *Tier 2 (Impacted)*: Expand to direct callers / feature integration tests when touching shared layers (`utils/`, `core/`, `types/`, `config/`, middleware, API contracts) or >1 module.
  - *Tier 3 (Full gate — risk-based only)*: Run the full suite + repo build/typecheck ONLY when a gate applies: (a) high-risk changes (DB schema/migrations, auth/security, dependency/lockfile upgrades, build/CI config), (b) milestone/release boundaries, (c) repo merge policy requires a full gate, or (d) Planner explicitly sets `Verify (gate)` as required. Low-risk tasks with no T3 gate stay on T1/T2.
- **Test evidence & reuse**:
  - Record verification in Section B using 5 fields (1–2 lines): `sha` (tested code/config/test revision), `command`, `result`, `tier` (`T1|T2|T3`), `env_note` (`local`, `CI <url>`, or non-default env/DB).
  - Coder `local` PASS on exact `sha` may be reused for **T1 / T2**. High-risk **T3** gates require a **trustworthy CI PASS** (verifying required env/external conditions) OR an **independent Reviewer run**.
  - Doc-only Reviewer commits (touching only `work/<ID>-<slug>.md`) do not invalidate prior tested-revision `sha` evidence; any change to code, tests, config, lockfiles, or execution environment invalidates reuse.

## Templates

`docs/agent/templates/work.md`, `docs/agent/templates/next-prompt.md`, `docs/agent/templates/checkpoint.md`, and `docs/agent/templates/reuse.md`.
Index of finished work: `docs/agent/INDEX.md`. Repo map: `docs/agent/MAP.md`.
