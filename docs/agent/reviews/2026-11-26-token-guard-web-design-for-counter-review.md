# Token Guard Web — Proposed Repair Design for Independent Counter-Review

- Date: 2026-11-26
- Role: Planner (design submission, **not** implementation or approval)
- Repository: `blamag999/agent-workflow-template`
- Branch: `proposal/token-optimization`
- Source: `extras/web-token-guard.user.js` v2.0.0, reviewed on this branch
- Related: `docs/agent/tasks/TG-21.md`; convergence report §5
- Status: **COUNTER-REVIEW REQUESTED / CODE HOLD** (Web portion). **HOLD MERGE** into main.

## 1. Existing behavior and precise risks

- `estimateConversation` tries first nonempty selector set, sums `innerText`, and falls back to all `main.innerText` when none matches. It may count menus/controls, count incomplete Claude messages, or count both container and child nodes if the selector matches nested elements.
- `Math.round(chars / 3.8)` is not a provider token usage count, especially with Vietnamese, code, attachments and unrendered tool context.
- `fillPrompt` replaces `textarea.value` or `contenteditable.textContent` without checking for an unfinished draft. Framework-controlled editors may not accept these writes.
- Clipboard calls are asynchronous but the UI reports success immediately or incorrectly; missing permissions/secure context can silently fail.
- The observer watches the entire document and refresh alters the overlay. No route-change state reset is specified. Persistent interval and mutation observer can duplicate work.
- `pct = estimated_visible_tokens / cfg.crit` currently looks like model context fill percentage; `120k` is only a user-configured reference.

## 2. Proposed minimal design — decisions for challenge

| ID | Proposed decision | Reason / safeguard |
|---|---|---|
| W1 — Message adapters | Use small `getChatGPTMessages()` and `getClaudeMessages()` functions, returning **validated top-level visible user/assistant message nodes**. Prefer semantic or role/data-test attributes; do not rely on broad `main [class*="message"]` when it captures nested messages. | Avoid counting duplicates and site navigation; DOM selectors are provisional until live UAT. |
| W2 — Dedup and fallback | Dedupe by DOM identity and remove nested ancestor/descendant overlaps; ensure text is read once per message. **Do not fallback to `main.innerText`.** If selectors cannot be validated, report `Unavailable / partial` rather than fabricated totals. | Correctness over a misleading number. |
| W3 — Metric semantics | Keep inexpensive character-based heuristic as `Estimated visible-text tokens` (or `~N`, never exact usage). Show messages counted and note excluded files, images, hidden history, tool/context. Rename percent to **% of configurable reference threshold** or remove percent/bar entirely if it cannot be labeled clearly. | No paid tokenizer, no remote telemetry, no claims of context capacity or quota. |
| W4 — Draft-safe actions | Prefer **copy-only** as the reliable default. If retaining Insert, require explicit user click; if composer is nonempty, never overwrite — instead copy prompt and explain. For an empty composer, use site-specific, supported editor events; on failure fall back to clipboard **with honest success/error indication**. No auto-send. | Avoid destructive edits; favor simple UX over brittle editor integrations. |
| W5 — SPA / mutations | Track `location.href`/conversation identity; rescan on route change and streaming updates with debounce. Observe the conversation container when possible; filter own overlay mutations. Maintain one observer/interval per page; avoid refresh-to-observer feedback loops. | Lightweight without a routing framework or persistent database. |
| W6 — Privacy + scope | Local DOM reads only; do not transmit conversation text/attachments to any new endpoint, persist prompt text or conversation bodies, or intercept network traffic. Keep existing Tampermonkey URL matches and updateURL/downloadURL; one userscript, no external library. | Web component remains optional and independent of Antigravity/Lean v2. |

## 3. Concrete acceptance criteria / test plan

- **T6 — DOM extraction:** Synthetic/replayable fixtures for ChatGPT and Claude with user+assistant turns, nested children, overlapping selector candidates, UI/navigation text, attachments and unknown DOM. No double-count, navigation excluded; unknown DOM shows unavailable instead of whole-page count.
- **T7 — SPA/streaming:** Route changes between two conversations refresh estimates and counts without carrying stale values. Mutations during streaming cause throttled update; mutations from Token Guard UI do not start repeated scans or multiple observer loops.
- **T8 — Draft/clipboard/privacy:** Both site editor variants with nonempty draft remain unchanged; empty editor insertion works where supported or explicit copy fallback occurs. Clipboard rejection and editor rejection display failure accurately. Source scan shows no outbound conversation-content network operation; no auto-submit.
- **T9 — Live browser smoke:** Current ChatGPT and Claude Web: load, count, navigation, draft preservation, copy/insert and alert thresholds; record actual browser/site date/version, screenshots or logs without secrets. If host access unavailable, mark **NOT RUN**; do not claim production compatibility without UAT.
- **General:** No source or data from user chats stored in repo. Run JS syntax/fixture tests and `git diff --check`. Keep generated test fixtures synthetic.

## 4. Six questions requiring independent counter-review verdict

1. **W1/W2:** Are site-specific top-level message selectors plus DOM containment dedup sufficient, or should the implementation rely on conversation-turn containers only? Specify safe fallback.
2. **W3:** Is character-based approximation acceptable with explicit disclaimer, or should display switch to *character count* until a tokenizer can be validated? Should the progress bar/percent be retained?
3. **W4:** Should Insert be eliminated entirely in favor of Copy (simplest and safest), or retained only for blank composers with robust fallback? Choose one.
4. **W5:** Is a single 4-second interval plus a debounced mutation observer necessary, or can one event-driven approach suffice while covering SPA navigation?
5. **W6:** Are localStorage settings and clipboard permissions acceptable under current `@grant none`, and what privacy limitations require explicit disclosure?
6. **Release gate:** Can T6–T8 automated fixture tests support implementation approval while T9 is NOT RUN, provided **actual Web compatibility is explicitly unverified and manual UAT is required before release**?

Return **AGREE / MODIFY / DISAGREE (+ exact alternative)** for W1–W6, plus answers to six questions. Prefer the **smallest viable** correction; do not add framework, API, dashboard, persistent telemetry, or Lean v2 coupling.

## 5. Decision boundary

Keep **one unified TG-21 implementation task** for plugin and Web after design review converges. This is a **design review gate**, not a new implementation task, new feature branch, or additional mandatory benchmark. Leave plugin TG01–TG06 previously converged.

**Handoff:** Independent Counter-Reviewer → Planner to finalize Web repair choices → Coder for unified TG-21. No code edits until Web design response is recorded. **HOLD MERGE / NO DEPLOY.**
