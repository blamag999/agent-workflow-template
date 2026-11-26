# TG-21 Manual UAT Report (T9) — Candidate `fd21d05`

- **Date:** 2026-11-27
- **Repo / Branch:** `blamag999/agent-workflow-template` / `proposal/token-optimization`
- **Code Candidate:** `fd21d05cdd2511f22d0caeb241633d9813eb620f`
- **R2 Code Review Commit:** `eb0e8d022fd3924d5f6955f81fdf359be5aca5d0` (APPROVE for code review)
- **Test Environment:** Windows, Chrome 158, Tampermonkey running `Token Guard Web` v2.1.0 (`extras/web-token-guard.user.js`)
- **Overall T9 Verdict:** **FAIL — HOLD MERGE into `main`**

---

## 1. Per-Platform UAT Matrix (T9.1–T9.6)

### A. Claude Web (`https://claude.ai/chat/<id>`) — **PARTIAL PASS (5/6 PASS, 1/6 NOT RUN)**

| Check | Result | Privacy-Safe Evidence |
|---|---|---|
| **T9.1** Estimated token display & honest warning-threshold label | **PASS** | `pillText`: `"~1.1k / ngưỡng 120k (1%)"`; `cardTokens`: `"~1.146 / ngưỡng 120.000"`; `cardPct`: `"1% ngưỡng cảnh báo"`; `cardMeta`: `"Ước lượng văn bản hiển thị · 4 khối · chưa gồm file/ảnh/ngữ cảnh ẩn"` |
| **T9.2** User + Assistant message detection | **PASS** | `[data-testid="user-message"]` = 2, `[data-testid="assistant-message"]` = 2, `.font-claude-message` = 0 → **4 blocks detected** (confirms TG-21 fix resolves the v2.0.0 missing-Claude-reply defect). |
| **T9.3** Live streaming smoothness | **NOT RUN** | Deferred: tester hit 5-hour Claude message quota; tested on existing conversations (read-only). |
| **T9.4** SPA conversation switch | **PASS** | Switching between conversations in sidebar updated pill token estimate dynamically without stuck counts. |
| **T9.5** Copy-only Handoff & draft immutability | **PASS** | `hasInsertBtn: false`, `hasCopyBtn: true`; clicking Copy updated button feedback state and left chat input untouched. |
| **T9.6** Console / privacy sanity | **PASS** | No userscript errors or unexpected network requests. |

### B. ChatGPT Web (`https://chatgpt.com/c/<id>`) — **FAIL (Blocker F02)**

| Check | Result | Privacy-Safe Evidence |
|---|---|---|
| **T9.1** Estimated token display & honest warning-threshold label | **FAIL** | On live conversation `/c/<id>`, widget stayed at `pillText: "Chưa nhận diện DOM"` (`unavailable`). Fail-safe worked as designed (did not fall back to `main.innerText`), but live conversation messages were not detected. |
| **T9.2** User + Assistant message detection | **FAIL** | Legacy selectors all returned `0`: `[data-message-author-role]` = 0, `article[data-testid^="conversation-turn"]` = 0, `[data-testid^="conversation-turn"]` = 0, `[data-turn]` = 0, `[data-message-id]` = 0, `main article` = 0. |
| **T9.3** Live streaming smoothness | **NOT RUN** | Blocked by F02 (DOM not detected). |
| **T9.4** SPA conversation switch | **NOT RUN** | Blocked by F02 (DOM not detected). |
| **T9.5** Copy-only Handoff & draft immutability | **PASS (UI check)** | `hasInsertBtn: false`; copy-only UI confirmed on v2.1.0. Full click verification to be re-run after F02 fix. |
| **T9.6** Console / privacy sanity | **PASS** | No userscript errors (only blocked Datadog RUM/Statsig calls from user's adblocker). |

---

## 2. Defect Summary — F02 (Major / Release Blocker for TG07)

- **ID:** `F02`
- **Component:** `extras/web-token-guard.user.js` & `.agents/plugins/token-guard/extras/web-token-guard.user.js` (`getChatGPTMessages`)
- **Observed Live DOM on `chatgpt.com/c/<id>` (App Shell UI):**
  1. ChatGPT's App Shell UI no longer renders `[data-message-author-role]` or `article[data-testid^="conversation-turn"]` in the tested live session.
  2. Instead, conversation transcripts are rendered inside containers with:
     - `[data-thread-find-target="conversation"]` and `[data-rail-chat-transcript="true"]`
     - Conversation identifier attribute: `data-chatgpt-conversation-selection-target="<conversation-id>"`
  3. **Critical Multi-Transcript Keep-Alive Behavior:** The live DOM mounted **4** `[data-thread-find-target="conversation"]` containers simultaneously (3 with distinct `data-chatgpt-conversation-selection-target` UUIDs + 1 local/cached transcript), containing 9 `[data-virtualized-turn]` elements in total.
  4. Inside each transcript container, turns are rendered as `div[data-virtualized-turn]` containing child elements with `data-conversation-role`, `data-user-message-bubble`, and `data-response-body` (`inExcluded: false`).

### Required Fix Constraints (TG-21 R3)
1. **Preserve legacy ChatGPT selectors** (`[data-message-author-role]`, `article[data-testid^="conversation-turn"]`) so classic ChatGPT DOM continues to work.
2. **Add ChatGPT App Shell DOM support with strict active-conversation scoping:**
   - Do **NOT** query `[data-virtualized-turn]` or `[data-conversation-role]` globally across `document`, as that would sum all hidden/cached keep-alive transcripts together.
   - Extract the active conversation ID from `location.pathname` (e.g. `/c/<id>` or `/g/<gpt-id>/c/<id>`).
   - If a container matching `[data-chatgpt-conversation-selection-target="<id>"]` exists, scope extraction strictly to that container.
   - If no ID-matched container exists (e.g., `/local/...` or `/g/.../project`), check only a **single clearly active/visible** transcript container (excluding hidden/inert/aria-hidden/offscreen keep-alive containers) — and if ambiguous or absent, return `unavailable` (`Chưa nhận diện DOM`) rather than summing multiple cached transcripts or falling back to `main.innerText`.
   - Inside the scoped active container, extract message blocks via `[data-conversation-role]` (fallback `[data-virtualized-turn]`), deduped with `dedupeTopLevel()`.
3. **Keep both userscript copies byte-identical** (`extras/web-token-guard.user.js` and `.agents/plugins/token-guard/extras/web-token-guard.user.js`).
4. **Add automated regression tests** in `tests/test_web_userscript.mjs` covering:
   - ChatGPT App Shell DOM with **multiple simultaneous** `[data-thread-find-target="conversation"]` containers (verifying only the active `/c/<id>` transcript is counted, never cached siblings).
   - Switching URL via `pushState` from `/c/<id-1>` to `/c/<id-2>` updates the count to `<id-2>` only.
   - Non-conversation pages (`/g/g-p-.../project`) without an active conversation still return `Chưa nhận diện DOM` (`unavailable`).
5. **Scope guardrails:**
   - **TG01–TG06 remain CLOSED** — do not modify plugin/MCP/installer files.
   - **Lean Agent Workflow v2 untouched.**

---

## 3. Release Gate Decision

- **HOLD MERGE into `main`. No deploy.**
- Hand back to **Coder (TG-21 R3)** for targeted `F02` fix → **Independent Reviewer R3** incremental check → re-run **T9** on ChatGPT Web (and Claude Web T9.3 streaming once quota resets, if required before merge).
