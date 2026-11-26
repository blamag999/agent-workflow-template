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
3. The work file: front-matter, Section A, and the LAST entry of Section B.
4. Files listed under "Read next" (max 5, as `path:line`).

Do not scan the whole repo. Use `docs/agent/MAP.md` to locate things.
Review with the diff first: `git diff <base_sha>..<head_sha>`.

## Session end (a session is NOT done until all steps are complete)

1. Append ONE new entry to Section B of the work file (never edit old entries).
2. Overwrite Section A (current state, open items, Read next, NEXT PROMPT) and the front-matter
   (`phase`, `next_role`, `round`, `head_sha`).
3. Commit on the work branch with prefix `[<ID>][<role>] message`, then PUSH to `origin`.
   Verify: `git status` is clean and `git log origin/<branch> -1` equals your `head_sha`.
   Do this BEFORE outputting the NEXT PROMPT, so the next role finds everything on the repo.
4. Output the NEXT PROMPT for the next role, in BOTH forms, in the chat answer:
   - full prompt (self-contained, for chat-only AIs)
   - short prompt (one line pointing to the work file, for AIs with repo access)
   The same text must be saved in Section A under `NEXT PROMPT`. If they differ, the file wins.
   Template: `docs/agent/templates/next-prompt.md`.
5. Final chat answer has 3 parts, in this order: Result (2-4 lines, Vietnamese),
   Handoff to <role> with a short reason, then the two prompt code blocks.

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

## Templates

`docs/agent/templates/work.md` and `docs/agent/templates/next-prompt.md`.
Index of finished work: `docs/agent/INDEX.md`. Repo map: `docs/agent/MAP.md`.
