# Independent Review — Token Guard v2.0.0 / v2.1 Lite Proposal

- Date: 2026-11-26
- Role: Reviewer (Mắt)
- Repository: `blamag999/agent-workflow-template`
- Review target: Token Guard plugin and Web userscript on `main` (source inspection; no runtime validation)
- Discussion branch: `proposal/token-optimization`
- Verdict: **REQUEST CHANGES before shipping a Token Guard v2.1 release**
- Impact on Lean Agent Workflow v2 pilot: **NONE — Token Guard remains optional; do not block the approved workflow pilot**
- Scope: **Review report only. No plugin code edits, no installation, no deployment, no merge. HOLD MERGE.**

## 1. Reviewed sources

- `.agents/plugins/token-guard/scripts/token_tracker.py`
- `.agents/plugins/token-guard/scripts/mcp_server.py`
- `.agents/plugins/token-guard/hooks.json`, `config.json`, `plugin.json`
- `.agents/plugins/token-guard/README.md`
- `.agents/plugins/token-guard/skills/token-guard/SKILL.md`
- `.agents/plugins/token-guard/ui/panel.html` (UI shell and partial source inspection; bundled/minified body is large)
- `extras/web-token-guard.user.js`
- `scripts/install-token-guard.ps1`, `scripts/install-token-guard.sh`, `README.md`

The Antigravity plugin reads transcript usage fields; the ChatGPT/Claude userscript estimates *visible page text* using character counts. These are **different sources and must not be represented as comparable provider usage**.

## 2. Positive observations / value

- Local transcript-based usage is more informative than visible-text character estimation when underlying field semantics are known.
- The Side Pane provides a useful low-friction presentation path without requiring full status output in every chat reply.
- A quiet default (`show_every_turn: false`) is good, but warning/spike events can still inject instructions.
- Workspace handoff support in the skill already prefers updating an active work file, which aligns with Lean v2 in principle.

**Measured impact:** None. Claims of token savings, zero AI-token cost, CPU savings, or compatibility are hypotheses until runtime/usage evidence is collected.

## 3. Findings and required corrections

### TG01 — HIGH — Automatic handoff/new conversation is an unsafe default

**Evidence:** `config.json` defaults `red_threshold_mode` to `auto_handoff_and_new_chat`; `token_tracker.py::build_hook_message` injects an auto-handoff instruction on threshold; skill instructs an Antigravity `ConversationService/CreateConversation` call.

**Risk:** In-flight code changes or independent review can be interrupted, extra summaries consume tokens, and conversation creation depends on host-specific internals.

**Recommendation:** Default to `suggest`. Never create a new conversation, commit, compact, or overwrite a draft solely because a threshold was reached. Make any automatic mode opt-in and enforce confirmation/role- and task-state checks. If a Lean work file exists, offer an explicit update to that SSOT rather than requiring another summary.

### TG02 — HIGH — Incorrect turns-left heuristic

**Evidence:** `parse_transcript` computes `avg_delta = round(last_context / turns)`, then `est_turns_left = remaining // avg_delta`.

**Problem:** Context divided by turn count is not the mean incremental context growth, particularly across compacting, cache behavior, or non-monotonic context.

**Recommendation:** Remove `est_turns_left` from the default display. Show latest observed context delta only, with a clear label; any forecast must use valid recent deltas and reset on context shrink/compaction.

### TG03 — HIGH — Cached-token arithmetic requires provider-field verification

**Evidence:** `parse_transcript` computes `current_context = input_tokens + cache_read_tokens`; `total_tokens += input_tokens + cache_read_tokens + output_tokens`. The rolling 5h/7d totals use the same addition.

**Problem:** This is correct *only if* the transcript's `input_tokens` field excludes cached reads. It can double count if cached reads are already included.

**Recommendation:** Verify semantics against real Antigravity transcript examples or documented schema; add tests for distinct-cache and inclusive-cache interpretations, missing fields and cumulative-vs-incremental records. Normalize usage once, reuse the same function for session and rolling totals, and expose `unknown` when provenance is insufficient. Distinguish **latest observed input/context** from **sum of per-turn usage**; never equate either with the provider's official quota.

### TG04 — MEDIUM — Repeated full transcript reads can increase I/O

**Evidence:** `parse_transcript` rescans each transcript; `scan_recent_sessions` parses recent files; `compute_window_usage` rescans transcripts in the 7-day window and uses a 10-second TTL; UI defaults to polling every 2 seconds.

**Recommendation:** Start with file-change-sensitive caching (path, size, mtime) and skip parsing unchanged files; consider incremental offset parsing if measured performance warrants it. Defer 5h/7d aggregation when the details view is closed. Benchmark CPU/I/O before claiming performance gains.

### TG05 — MEDIUM — Usage/context/quota labels are misleading

**Evidence:** UI shows a percentage against configured 120k; tracker exposes rolling 5h/7d token counts and context/turn estimates.

**Recommendation:** Rename fields to `Observed latest input`, `Observed session usage`, `Local usage (5h / 7d)`, and `Configured warning reference` as appropriate after confirming source semantics. Never label locally derived totals as official account quota, model context-window usage, or remaining provider entitlement. Clearly identify data provenance and missing or partial transcript coverage.

### TG06 — MEDIUM — Installation/update safety and reproducibility

**Evidence:** README shows remote PowerShell `irm ... | iex` and shell `curl ... | bash` commands. Installers clone the default branch and copy the plugin tree.

**Recommendation:** Offer download-inspect-run instructions and optionally a pinned release SHA/checksum; preserve existing config; test idempotence and failed-update rollback. Do not broaden into a full installer framework.

### TG07 — MEDIUM — Web userscript compatibility and privacy safeguards

**Evidence:** `extras/web-token-guard.user.js` matches ChatGPT/Claude URLs, uses platform-dependent DOM selectors, counts `innerText.length / 3.8`, falls back to all `main.innerText`, and writes to `contenteditable` via `textContent`.

**Recommendation:** Keep the Web userscript separate from the Antigravity plugin. Add platform-specific message adapters, prevent duplicate counts and fallback-to-navigation counting, label metric `Estimated visible-text tokens`, exclude uncounted attachments and hidden context, and never overwrite user draft text without confirmation. Test SPA navigation, composer change events, DOM selector drift, clipboard failure and accessibility. Keep everything local and avoid outbound conversation-content transmission.

## 4. Minimal proposed release: Token Guard v2.1 Lite

| Priority | Action | Release gate |
|---|---|---|
| P0 | Change default red mode to `suggest`; no involuntary session creation | Confirm no auto-handoff on crossing threshold |
| P0 | Validate provider usage semantics and remove false precision | Fixture tests for cache handling and missing fields |
| P0 | Remove misleading turns-left prediction | No unverified context forecast in default UI |
| P1 | Cache unchanged transcripts and refine polling | No observable UI regression; verify work on unchanged logs |
| P1 | Improve metric labels and optional Lean work-file handoff | Status remains informational, handoff remains opt-in |
| P1 | Improve installer safety and failure handling | Configuration retained; explicit installation flow |
| P2 | Update ChatGPT/Claude Web userscript independently | Browser smoke tests on both sites |
| OUT | Mandatory benchmarking, paid API instrumentation, multi-agent usage dashboard | Not required |

**Architecture:** one Antigravity plugin plus one independent Tampermonkey userscript. No shared token formula, database, telemetry server, or mandatory integration with Lean workflow.

## 5. Acceptance criteria

- [ ] AC1: Warn/critical threshold alone never automatically opens a conversation or alters the task state under default configuration.
- [ ] AC2: Cached input is counted exactly once under verified transcript semantics; unknown schema yields explicit uncertainty.
- [ ] AC3: Latest input/context reference, sum of session usage, and rolling local totals have distinct clear labels.
- [ ] AC4: Forecasting is removed or validated against actual context deltas and compaction behavior.
- [ ] AC5: Idle/no-change polling avoids redundant full-file parsing (if performance optimization included).
- [ ] AC6: Existing Lean work file is preserved; any handoff/summary requires user action or explicit opt-in, and is committed/pushed before role transfer in Code mode.
- [ ] AC7: Web script accurately labels its estimate, never counts whole-page navigation as conversation, and never silently overwrites an unfinished prompt.
- [ ] AC8: Plugin installer keeps user configuration; any remote installation path provides a reviewable/pinnable option.
- [ ] AC9: Runtime smoke tests and source checks cover Antigravity plugin plus ChatGPT/Claude Web *for the respective changed components*; unsupported host capabilities are reported, not assumed.
- [ ] AC10: No source chat content or credentials are sent to additional third-party endpoints by Token Guard.

## 6. Counter-review questions

1. Do the existing Antigravity transcript `input_tokens` and `cache_read_tokens` fields represent disjoint quantities? What authoritative fixture or log proves this?
2. Should the default `red_threshold_mode` be `suggest` with opt-in automation only, or is a narrower safe auto-mode demonstrably possible?
3. Is `est_turns_left` worth salvaging, or should it be removed to avoid ungrounded precision?
4. Is the 2-second UI polling actually expensive? What is the smallest safe cache change, if any?
5. Should the 5h/7d figures remain visible by default, or move to expandable details with explicit local-usage labels?
6. Is the undocumented Antigravity conversation-creation endpoint sufficiently stable to retain as a manually initiated feature, or should it be removed?
7. Should the Web userscript be a separate patch/release and review gate to avoid coupling DOM maintenance to Antigravity token tracking?

## 7. Requested counter-review outcome

Respond **AGREE / MODIFY / DISAGREE** to TG01–TG07 and the v2.1 Lite scope, citing concrete code-level evidence. Distinguish correctness/safety requirements from optional performance refinements. Propose the smallest workable patch and the minimal test matrix; do not claim observed savings without measurements.

**Handoff:** Counter-Reviewer → Planner for a task card only after disagreements are resolved. Keep the Lean Agent Workflow v2 pilot independent. **HOLD MERGE INTO MAIN.**
