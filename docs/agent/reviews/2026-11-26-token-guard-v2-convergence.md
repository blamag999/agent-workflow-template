# Token Guard v2.1 Lite — Convergence Decision and Minimal Code Task

- Date: 2026-11-26
- Role: Reviewer / Planner (convergence only)
- Repository: `blamag999/agent-workflow-template`
- Branch: `proposal/token-optimization`
- Baselines: `2026-11-26-token-guard-v2-review.md` @ `ad156eef`; `2026-11-26-token-guard-v2-counter-review.md` @ `c12979f0`
- Decision: **CONVERGED FOR A MINIMAL IMPLEMENTATION TASK** (5 AGREE, 2 MODIFY, no unresolved architecture blocker)
- **HOLD MERGE. No plugin source was edited in this reconciliation.**
- Independent of approved Lean Agent Workflow v2 pilot.

## 1. Finding-by-finding decisions

| ID | Verdict | Implementation decision |
|---|---|---|
| TG01 | **AGREE** | Default `red_threshold_mode=suggest` in both persisted default config and Python fallback. Do not add Lean-workflow role/task inspection to Token Guard. Any automated mode remains opt-in; threshold alone never starts a conversation in default mode. |
| TG02 | **AGREE** | Lower finding severity to MEDIUM (misleading display). Remove `avg_delta` / `est_turns_left` from tracker payload and UI default display. Retain the factual `delta_tokens` (including negative deltas after compaction). Do not build a new prediction algorithm. |
| TG03 | **MODIFY** | Accept counter-review's reported 3-transcript observations as *supporting evidence*, not a universal schema guarantee. Keep `inp + cache` under the documented disjoint-field assumption. One `_extract_turn_usage` helper shared by session and 5h/7d calculations; handle missing/null/invalid fields. Add fixtures proving the expected semantics. Label `total_tokens` as local gross token volume, not billed tokens, context capacity, or provider quota. No multi-provider schema detector in this patch. |
| TG04 | **AGREE** | Add small in-memory cache keyed by `(path, mtime_ns, size)` for repeated `parse_transcript` calls. No incremental byte-offset parser or new service. Do not promise performance gains without measurements. |
| TG05 | **AGREE** | Text-only changes to status and existing panel: `Ngữ cảnh`, `Ngưỡng cảnh báo`, `Local 5h/7d` and explicit `Tổng phiên (local)` as applicable. The percentage represents a configurable reference threshold, **not** model-window fullness or account quota. No new UI panels. |
| TG06 | **MODIFY** | Existing PowerShell installer preserves nonempty existing `config.json` by default; Bash also preserves nonempty existing config. Empty-file and interrupted-copy cases remain imperfect. Limit v2.1 to README download/inspect/run guidance and T5 smoke checks including nonempty custom config, `--force/-Force`, and clarity on edge cases. Do not introduce installer rollback machinery or `-Ref` unless a specific requirement appears. |
| TG07 | **AGREE** | ChatGPT/Claude Web userscript becomes a distinct follow-up task/PR, excluded from Antigravity plugin v2.1 Lite acceptance/release gate. Its draft-overwrite and whole-main counting issues remain open there. |

## 2. Minimal patch scope (Coder task TG-21)

**In scope**
1. `.agents/plugins/token-guard/config.json` and `scripts/token_tracker.py`: default suggest; remove invalid forecast; normalize usage with one helper; null/invalid-field handling; in-memory file-change cache; minimal truthful status strings.
2. `.agents/plugins/token-guard/ui/panel.html`: remove stale turns-left display/binding, adjust **existing text labels only**. Keep bundled UI changes minimal; avoid unrelated rebuild churn.
3. `.agents/plugins/token-guard/rules/AGENTS.md` and `skills/token-guard/SKILL.md`: make handoff/new conversation opt-in and never automatically triggered under default config; keep instructions host-specific and independent of Lean workflow.
4. `.agents/plugins/token-guard/README.md` and root `README.md` if needed: safe download/inspect/run instructions, clearly identify that automatic mode is optional.
5. Add focused zero-dependency unit tests/fixtures for tracker, hooks and installers; no general benchmark infrastructure.

**Out of scope:** `extras/web-token-guard.user.js`; Lean v2 `AGENTS.md` and workflows; multi-model/provider telemetry support; new UI panel; real usage quota detection; new autocompaction engine; optional `-Ref` installer feature; incremental log parser; forced session handoff; deployment/merge.

**Behavioral constraint:** An explicitly requested handoff must not overwrite an existing task artifact or silently open a new session. If a host-specific conversation API fails, expose a manual fallback. Any use of undocumented host internals should be treated as best-effort, never guaranteed.

## 3. Mandatory test matrix

| Test | Required verification | PASS criterion |
|---|---|---|
| **T1 Default safety (TG01)** | Default persisted config **and** Python fallback; crossing critical threshold in `suggest` mode | No `[TOKEN_GUARD_AUTO_HANDOFF]`, no instruction to call `CreateConversation`, no automatic role/task interruption; explicit opt-in behavior remains separate. |
| **T2 Disjoint cache & malformed input (TG03)** | Synthetic `PLANNER_RESPONSE` transcript: input/cache/output, missing/null/non-int fields, invalid JSON, both direct session and rolling-window calculation | Each supported field counted once consistently; no crash; totals named local gross usage; tests do not claim all undocumented schema variants are validated. |
| **T3 Compaction (TG02)** | Synthetic sequence with increasing then decreasing latest input/context | `delta_tokens` reports signed change; no `avg_delta` or `est_turns_left` in tracker output/default UI. |
| **T4 Parse cache (TG04)** | Mock/count file reads on twice-parsed unchanged file, then mutate file (mtime_ns/size) | Unchanged repeat avoids re-open/reparse; mutation invalidates cache and returns fresh numbers. |
| **T5 Installer preservation (TG06)** | PowerShell and Bash smoke tests using a nonempty customized `config.json` and normal mode, plus force mode | Default installation preserves exact custom config; forced installation replaces it with default. Record any empty/partial failure-case limitations honestly; no OS-specific command falsely marked PASS if not executed. |

**Additional lightweight checks:** syntax/import smoke of Python + JSON; configuration compatibility with MCP server/panel; source check ensuring no default automated-new-chat pathway. Runtime host/Side Pane smoke only where an Antigravity installation is available; otherwise mark **NOT RUN**, not PASS. No required Web-browser smoke for TG-21.

## 4. Handoff / gates

- **Planner:** prepare/authorize a scoped `TG-21` work item; work branch may follow existing repository convention. Keep plugin work independent of Lean v2 pilot.
- **Coder:** implement in-scope patch only, run T1–T5 and provide verification evidence including host limitations.
- **Independent Reviewer:** verify patch against this decision and T1–T5, especially cache semantics and no forced handoff; report APPROVE / REQUEST CHANGES.
- **Release:** follow explicit authorization. **HOLD MERGE into main** until implementation review and approval.
