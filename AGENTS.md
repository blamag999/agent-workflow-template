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
2. One work item = one branch `work/<ID>-<slug>` = one work file `docs/agent/work/<ID>-<slug>.md`.
   All roles commit on that branch. Do not create extra branches to hand off tasks.
3. Only one role holds the baton at a time (`next_role` in the work file front-matter).
4. One session = one role = one log entry = one handoff. Then stop.
5. Only the Planner merges, and only after the Reviewer's verdict is APPROVE.
6. Nothing stays local. Before a session ends, ALL work (code, docs, work file) must be committed
   AND pushed to the remote work branch. Unpushed work counts as not done.

## Session start (read in this order, nothing else unless told)

1. This file.
2. `docs/agent/roles/<your-role>.md`.
3. The work file: front-matter, Section A (top), and the LAST entry of Section B (tail only for long files).
4. Files listed under "Read next" (max 5, as `path:line`).

Do not scan the whole repo. Use `docs/agent/MAP.md` to locate things.
Review with the diff first: `git diff --stat <base_sha>..HEAD`, then diff only relevant paths.

## Session end (a session is NOT done until all steps are complete)

1. Append ONE new entry to Section B of the work file (never edit old entries).
2. Overwrite Section A (`Next task` — max 25 lines total) and the front-matter (`phase`, `next_role`, `round`).
3. Commit on the work branch with prefix `[<ID>][<role>] message`, then PUSH to `origin`.
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

- Handoffs stay under about 300 words. Link `path:line`; do not paste code.
- Section A stays under 25 lines.
- Max 3 review rounds, then the Planner decides.
- Long session: write a checkpoint entry in Section B before stopping.

## Execution token hygiene

- **Diffs & reads**: Run `git diff --stat` first; exclude lockfiles, generated files, and large bundles (e.g., `*.lock`, `panel.html`, `dist/`). Use `rg` to locate symbols and read targeted line ranges instead of whole large files.
- **Batching**: Issue independent reads/searches/edits in parallel; chain dependent shell checks into one command.
- **Tiered verification**:
  - *Tier 1 (Targeted — default)*: Run only tests for changed files/modules + local lint/typecheck using compact flags (`-q --tb=short`, `--reporter=dot`). Keep ≤50 tail lines on failure; on pass log `PASS (N tests)` only. Run after final edit; never re-run passing tests without new code changes.
  - *Tier 2 (Impacted)*: Expand to direct callers / feature integration tests when touching shared layers (`utils/`, `core/`, `types/`, `config/`, middleware, API contracts) or >1 module.
  - *Tier 3 (Full gate)*: Run the full suite + repo build/typecheck ONLY at gates: (a) once before `APPROVE`/merge on final `HEAD` (skip if CI already passed on `HEAD` or Coder already passed on the exact same `HEAD` with a sound test diff), (b) high-risk changes (DB schema/migrations, auth/security, dependency/lockfile upgrades, build/CI config), (c) milestone/release boundaries, or (d) when Planner marks `Verify (gate)` as required.

## Templates

`docs/agent/templates/work.md` and `docs/agent/templates/next-prompt.md`.
Index of finished work: `docs/agent/INDEX.md`. Repo map: `docs/agent/MAP.md`.
