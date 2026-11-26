# Independent Reviewer — TG-21 Unified Token Guard v2.1 Lite

- Date: 2026-11-26
- Role: Independent Reviewer (Mắt)
- Repo / branch: `blamag999/agent-workflow-template` / `proposal/token-optimization`
- Base: `429b954142f7f1af210e41b069303af959aded3d`
- Candidate: `4fd27da09018179da0b85199ebe3a7c92c99023b`
- Remote branch verified at candidate before review.
- Scope: TG01–TG07, task `docs/agent/tasks/TG-21.md`, plugin T1–T5, Web T6–T9.
- **Verdict: REQUEST CHANGES (one MAJOR SPA robustness finding).**
- **HOLD MERGE into main; NO DEPLOY; T9 manual UAT remains required before release.**

## Evidence / methods

Compared `429b954..4fd27da`: one commit, 13 changed/added files, including both userscript copies, plugin tracker and UI, and new `tests/test_token_guard_plugin.py` / `tests/test_web_userscript.mjs`. Reviewed code and test assertions from candidate via GitHub connector. Attempted to clone and run tests independently, but the execution container could not resolve `github.com` (network/DNS); therefore **no independent T1–T9 test execution is claimed**. The existence of tests and source-level inspection do not prove PASS. Did not modify plugin or userscript code.

## Findings

### F01 — MAJOR — SPA navigation can detach the only MutationObserver (AC7 / T7)

**Location:** `extras/web-token-guard.user.js`, `attachObserver()`, `handleRouteChange()`, `history.pushState/replaceState` wrappers. Identical copy in `.agents/plugins/token-guard/extras/web-token-guard.user.js`.

**Observed implementation:** `attachObserver()` disconnects the observer and observes `document.querySelector('main')`; it returns early when the selected target equals `observedTarget`. The history wrapper calls `handleRouteChange()` *synchronously after the history call*, potentially **before** the SPA renders the new conversation. If the app later replaces the entire `main` element, the observer can remain attached to detached old `main`, with no interval or persistent parent observer to detect the replacement. Subsequent messages may not update the display. `popstate` may also run before the replacement is committed.

**Current test gap:** `tests/test_web_userscript.mjs` T7 tests route changes while updating nodes within the same observed DOM; it does not simulate detaching and replacing `main` after the route event.

**Required fix:** Keep a lightweight route-safe observation/re-attachment path (e.g., observe a stable ancestor for `main` replacement or re-attach on a post-render scheduled refresh), avoiding a 4-second full DOM scan or multiple observers. Add a regression fixture: change route, replace old `main` with a new `main` *after* route callback, stream a message in new `main`, and assert the displayed count reflects new content. Ensure original and plugin userscript copies are byte-identical. No new framework.

### F02 — RELEASE GATE (not an implementation defect) — T9 real-browser UAT unverified

**Location:** TG-21 `Verify` / counter-review §4.

**Status:** **NOT RUN / UNVERIFIED** in this independent review. Static fixture tests do not prove current ChatGPT/Claude DOM compatibility. Record actual browser, date, both sites, user+assistant extraction, route change, copy and threshold labels before claiming real-world compatibility or authorizing main merge/deployment. Do not change code-review verdict based solely on absent hosted credentials; keep release gate separate.

### F03 — VERIFICATION LIMITATION — T1–T8 and platform-specific installer smoke not independently executed

`tests/test_token_guard_plugin.py` includes PowerShell-only T5 guarded by `os.name == 'nt'`; it is skipped on non-Windows systems. Evidence must report T5 Windows PASS or NOT RUN honestly. GitHub source review found focused fixture tests for T1–T8 but no trusted independent execution logs in this review. Provide exact command, environment, exit code, pass/skip counts and candidate SHA for each, with PowerShell and Bash results individually. This is an evidence request, not a claim of test failure.

## Acceptance criteria: static review status

| AC | Status | Basis |
|---|---|---|
| AC1 | SOURCE PASS / execution unverified | Default `suggest` in plugin; hook opt-in branch retained. |
| AC2 | SOURCE PASS / execution unverified | Shared `_extract_turn_usage` helper used for current and window usage. Real Antigravity schema evidence from earlier counter-review not reproduced here. |
| AC3 | SOURCE PASS / execution unverified | No forecast in tracker payload; signed `delta_tokens` and local labels retained. |
| AC4 | SOURCE PASS / execution unverified | Cache key includes path/mtime_ns/size; T4 mock checks re-read behavior. |
| AC5 | EVIDENCE PENDING | Scripts left intact; T5 platform-specific results required. |
| AC6 | SOURCE PASS / live unverified | Separate adapters, no whole-main fallback, dedup, copy-only. |
| AC7 | **FAIL (F01)** | Detached `main` can strand observer after SPA navigation. |
| AC8 | SOURCE PASS / execution unverified | Copy-only button; async clipboard result; no editor writes. |
| AC9 | SOURCE PASS / runtime unverified | Local DOM text estimate separate from Antigravity transcript usage, no newly added content transmission. |
| AC10 | PARTIAL | T9 requires honest NOT RUN until manual UAT; independent tests not executed due DNS limitation. |

## Required next action

**Coder:** fix F01 in both userscript copies with a minimal route-safe observer approach; expand T7 fixture for *replacement of main after history navigation*. Run tests T1–T8 and T5 per-platform where available, record PASS/FAIL/SKIP/NOT RUN honestly with SHA. Commit/push and hand back for independent incremental review. Do not merge/deploy. **Planner:** keep T9 manual UAT a release gate after code-review acceptance. Lean Agent Workflow v2 pilot remains separate.
