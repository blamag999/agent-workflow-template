# TG-21 Final Acceptance & Closure Report

- **Date:** 2026-11-27
- **Repo / Branch:** `blamag999/agent-workflow-template` / `proposal/token-optimization` → `main`
- **Code Candidate:** `5b9eb73325d922c7308193e0f9101dd6140d2f31` (R3)
- **Reviews:**
  - R1 Independent Review: `docs/agent/reviews/2026-11-26-TG-21-4fd27da-independent-review.md` (`e207000`)
  - R2 Independent Review: `docs/agent/reviews/2026-11-26-TG-21-fd21d05-R2-review.md` (`eb0e8d0` — **APPROVE** code review)
  - T9 UAT Report (R2): `docs/agent/reviews/2026-11-27-TG-21-T9-uat-report.md` (`124ff76` — FAIL F02 on ChatGPT App Shell)
  - R3 Independent Review: `docs/agent/reviews/2026-11-27-TG-21-5b9eb73-R3-review.md` (`ee2c9ec` — **APPROVE** source-level F02 fix)
- **Final Disposition:** **CLOSED & MERGED INTO `main`** (authorized by repository owner on 2026-11-27)

---

## 1. Component Acceptance Status

### A. Antigravity Token Guard Plugin v2.1 Lite (TG01–TG06) — **PASS & ACCEPTED**
- **Verification (2026-11-27, Windows, Python 3.12.10, PowerShell 5.1, Git Bash 5.3.15):**
  - `python -m unittest tests/test_token_guard_plugin.py -v`: **PASS (12/12, 0 failed, 0 skipped)** covering:
    - **T1:** Default `red_threshold_mode: "suggest"` safety (no autonomous handoff/session creation on critical threshold; opt-in modes preserved).
    - **T2:** Disjoint cache/token helper and malformed JSONL resilience across latest/session/5h/7d metrics.
    - **T3:** Forecast fields (`avg_delta`, `est_turns_left`) removed; signed `delta_tokens` retained; truthful local/configured-threshold labels in `ui/panel.html`.
    - **T4:** `parse_transcript` cache hit and invalidation by `(path, mtime_ns, size)`.
    - **T5:** PowerShell and Bash installers preserve non-empty `config.json` in normal mode and overwrite in `-Force`/`--force` mode.
    - **MCP Server:** `initialize`, resources, and `open_token_guard` tool compatibility verified.
  - **Lean Agent Workflow v2 isolation:** Confirmed zero changes to Lean v2 files.

### B. Web Userscript (TG07 — `extras/web-token-guard.user.js`) — **EXPERIMENTAL / WAIVED BY OWNER**
- **Automated Verification (2026-11-27, Node v26.13.0):**
  - `node --check` on both copies + `node --test tests/test_web_userscript.mjs`: **PASS (7/7, 0 failed, 0 skipped)** (T6–T8, F01, F02, byte-for-byte copy parity).
- **Live Manual UAT T9 (2026-11-27, Windows, Chrome 158, Tampermonkey v2.1.0):**
  - **Claude Web (`claude.ai/chat/<id>`):** 5/6 **PASS** (T9.1, T9.2 `2 user + 2 assistant = 4 blocks`, T9.4 SPA switch, T9.5 Copy-only & draft immutability, T9.6 console sanity); T9.3 live streaming **NOT RUN** (5h message quota exhausted).
  - **ChatGPT Web (`chatgpt.com/c/<id>`, R3 `5b9eb73`):** App Shell active container matched (`matchedActiveContainer: true`, `hasInsertBtn: false`, `hasCopyBtn: true`), T9.5 Copy-only **PASS**, T9.3 streaming smooth, T9.4 SPA switch updates count — **known limitation (`F03`):** estimated token count severely undercounted (`~21` → `~22` tokens across 6 `[data-conversation-role]` nodes vs 3 `[data-virtualized-turn]` turns) because `[data-conversation-role]` is prioritized over `[data-virtualized-turn]`.
- **Owner Decision (2026-11-27):** Owner explicitly elected to **waive/defer Web userscript accuracy (`TG07`)** to focus on the Antigravity Token Guard plugin, and authorized merging `proposal/token-optimization` into `main`, updating the local plugin, and closing **TG-21**. Live ChatGPT Web token-count accuracy is **not** claimed.

---

## 2. Closure Checklist
- [x] TG01–TG06 verified (12/12 unit & installer tests PASS) and independently reviewed.
- [x] TG07 status and known ChatGPT App Shell undercount honestly recorded (no unverified compatibility claim).
- [x] `docs/agent/tasks/TG-21.md` updated to CLOSED.
- [x] Merged `proposal/token-optimization` into `main` and verified remote SHA.
- [x] Local Antigravity Token Guard plugin updated via `scripts/install-token-guard.ps1` (normal mode, preserving user `config.json`).
