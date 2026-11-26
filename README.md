# agent-workflow-template

A reusable repo workflow for AI agents with three roles: Planner (Não), Coder (Tay), Reviewer (Mắt).
Work moves between roles through one shared work file per branch.

## Use it
1. Copy `AGENTS.md` and `docs/agent/` into your repo (keep `work/` and `archive/` empty).
2. Start a Planner session: "You are the Planner. Read AGENTS.md. Task: <request>."
3. Each session ends with a NEXT PROMPT (in the work file and in chat). Give it to the next agent.

## Flow
```
PLAN (Planner) -> CODE (Coder) -> REVIEW (Reviewer)
                                     |- REQUEST CHANGES -> FIX (Coder) -> REVIEW ...
                                     '- APPROVE -> CLOSE and merge (Planner) -> DONE
```

## Conventions
- One work item = one branch `work/<ID>-<slug>` = one file `docs/agent/work/<ID>-<slug>.md`.
- One session = one role = one log entry = one handoff.
- Only the Planner merges, after the Reviewer approves. Max 3 review rounds.
- Nothing stays local: every session ends with all work committed AND pushed to the remote branch.
- Works in code mode (repo access) and chat mode (paste files, commit the returned work file).

See `AGENTS.md` for the full rules.
