# NEXT PROMPT template

Every session ends by outputting this prompt in the chat answer ONLY (do not duplicate it inside Section A):
- **Code mode**: output ONLY the Short form.
- **Chat mode**: output ONLY the slim Full form.

## Short form (Code mode — repo access)

```
You are the <ROLE>. Read AGENTS.md and docs/agent/work/<ID>-<slug>.md (front-matter, Section A, last Section B entry), then execute "Next task".
```

## Slim Full form (Chat mode — paste the work file below it)

```
[ROLE] You are the <PLANNER (Não) | CODER (Tay) | REVIEWER (Mắt)> of this repo.
[CONTEXT] Repo <owner/repo>, branch work/<ID>-<slug>, base_sha <sha>, round <n>/3.
[TASK]
- <3-5 bullets, each verifiable>
[SCOPE] Allowed: <...> | Not allowed: <...>
[VERIFY] Task: `<targeted command>` -> <result> | Gate: `<full command or CI / none>`
[READ NEXT] <max 5 path:line>
```

## Rules
- Name exactly one next role. Never leave the next step implicit.
