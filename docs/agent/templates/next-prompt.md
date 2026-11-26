# NEXT PROMPT template

Every session ends by producing this prompt for the next role. Save it in Section A of the
work file (`NEXT PROMPT`) and output it in the chat answer in two forms.

## Full form (self-contained, for chat-only AIs: paste the work file below it)

```
[ROLE] You are the <PLANNER (Não) | CODER (Tay) | REVIEWER (Mắt)> of this repo.
[CONTEXT] Repo <owner/repo>, branch work/<ID>-<slug>, base_sha <sha>, head_sha <sha>, round <n>/3.
[READ] AGENTS.md, docs/agent/roles/<role>.md, work file (front-matter, Section A,
       last Section B entry), then at most 5 files: <path:line, ...>.
[TASK]
- <3-7 bullets, each verifiable>
[SCOPE] Allowed: <...> | Not allowed: <...>
[DONE WHEN] <verification command and expected result / criteria>
[END OF SESSION] Append one log entry, overwrite Section A and front-matter, commit
  `[<ID>][<role>] ...`, then output the NEXT PROMPT for the next role (full + short),
  following AGENTS.md. Reply to the human in Vietnamese.
[MODE] Code mode: commit and push yourself. Chat mode: return the complete updated
  work file in one code block (and a patch if you are the Coder).
```

## Short form (for AIs with repo access)

```
You are the <ROLE>. Read AGENTS.md and docs/agent/work/<ID>-<slug>.md (Section A, NEXT PROMPT), then do it.
```

## Rules
- Both forms carry the same intent. If they differ, the work file wins.
- Name exactly one next role. Never leave the next step implicit.
