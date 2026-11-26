// ==UserScript==
// @name         Token Guard Web (ChatGPT & Claude)
// @namespace    https://github.com/blamag999/agent-workflow-template
// @version      2.1.0
// @description  Ước lượng cục bộ văn bản hiển thị trên ChatGPT Web & Claude Web (copy-only, không chèn ô chat, không gửi dữ liệu ra ngoài).
// @author       blamag999
// @match        https://chatgpt.com/*
// @match        https://chat.openai.com/*
// @match        https://claude.ai/*
// @updateURL    https://raw.githubusercontent.com/blamag999/agent-workflow-template/main/extras/web-token-guard.user.js
// @downloadURL  https://raw.githubusercontent.com/blamag999/agent-workflow-template/main/extras/web-token-guard.user.js
// @grant        none
// ==/UserScript==

// Note on privacy & storage (@grant none):
// - localStorage stores only { warn, crit, expanded } per origin (chatgpt.com / claude.ai).
// - Conversation content is read locally from visible DOM text only and never transmitted or stored.
// - Clipboard write runs only on explicit user click; permission denial is reported truthfully.

(function () {
  'use strict';

  const ROOT_ID = 'tg-web-root';
  if (document.getElementById(ROOT_ID)) {
    return;
  }

  const STORAGE_KEY = 'token_guard_web_cfg_v1';
  const DEBOUNCE_MS = 1500;
  const DEFAULT_CFG = { warn: 80000, crit: 120000, expanded: false };
  const HANDOFF_PROMPT =
    'Hãy tóm tắt ngắn gọn (< 1,200 tokens) toàn bộ ngữ cảnh phiên này để tôi dán sang phiên mới: ' +
    '1) Mục tiêu chính, 2) Quyết định & ràng buộc đã chốt, 3) File/code đã sửa, ' +
    '4) Trạng thái hiện tại & việc cần làm tiếp theo, 5) Lưu ý/lỗi đang gặp.';

  function sanitizeCfg(raw) {
    const src = raw && typeof raw === 'object' ? raw : {};
    const warn = Number.isFinite(Number(src.warn)) && Number(src.warn) > 0 ? Math.round(Number(src.warn)) : DEFAULT_CFG.warn;
    const crit = Number.isFinite(Number(src.crit)) && Number(src.crit) > 0 ? Math.round(Number(src.crit)) : DEFAULT_CFG.crit;
    return { warn, crit, expanded: Boolean(src.expanded) };
  }

  function loadCfg() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return sanitizeCfg(JSON.parse(raw));
    } catch (_) {}
    return { ...DEFAULT_CFG };
  }

  function saveCfg(nextCfg) {
    try {
      const clean = sanitizeCfg(nextCfg);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
    } catch (_) {}
  }

  let cfg = loadCfg();
  let lastTokens = 0;

  function isExcludedNode(node) {
    if (!node) return true;
    if (node.id === ROOT_ID) return true;
    if (typeof node.closest === 'function') {
      if (node.closest('#' + ROOT_ID + ', nav, aside, header, footer')) {
        return true;
      }
    }
    return false;
  }

  function dedupeTopLevel(nodes) {
    const unique = [];
    const seen = new Set();
    for (const node of nodes) {
      if (!node || seen.has(node) || isExcludedNode(node)) continue;
      seen.add(node);
      unique.push(node);
    }
    return unique.filter((node) => {
      for (const other of unique) {
        if (other !== node && typeof other.contains === 'function' && other.contains(node)) {
          return false;
        }
      }
      return true;
    });
  }

  function getChatGPTMessages(doc) {
    let found = Array.from(doc.querySelectorAll('[data-message-author-role]'));
    if (found.length === 0) {
      found = Array.from(doc.querySelectorAll('article[data-testid^="conversation-turn"]'));
    }
    return dedupeTopLevel(found);
  }

  function getClaudeMessages(doc) {
    const primarySelectors = [
      '[data-testid="user-message"]',
      '.font-claude-message',
      '[data-testid="assistant-message"]',
    ];
    let found = [];
    for (const sel of primarySelectors) {
      found = found.concat(Array.from(doc.querySelectorAll(sel)));
    }
    if (found.length === 0) {
      found = Array.from(doc.querySelectorAll('main article'));
    }
    return dedupeTopLevel(found);
  }

  function getVisibleTextLength(node) {
    const text = typeof node.innerText === 'string' ? node.innerText : (node.textContent || '');
    return text.trim().length;
  }

  function estimateConversation() {
    const host = (location && location.hostname) || '';
    const isClaude = host.includes('claude.ai');
    const nodes = isClaude ? getClaudeMessages(document) : getChatGPTMessages(document);

    if (nodes.length === 0) {
      return { status: 'unavailable', tokens: null, turns: 0 };
    }

    let chars = 0;
    for (const n of nodes) {
      chars += getVisibleTextLength(n);
    }
    return { status: 'ok', tokens: Math.round(chars / 3.8), turns: nodes.length };
  }

  const root = document.createElement('div');
  root.id = ROOT_ID;
  root.style.cssText =
    'position:fixed;right:16px;bottom:16px;z-index:2147483647;font-family:system-ui,-apple-system,sans-serif;font-size:12px;';

  const shadow = root.attachShadow({ mode: 'open' });
  shadow.innerHTML = `
    <style>
      .pill { display:flex;align-items:center;gap:8px;padding:7px 12px;border-radius:999px;cursor:pointer;
        background:#18181b;color:#f4f4f5;border:1px solid #3f3f46;box-shadow:0 4px 16px rgba(0,0,0,.35);user-select:none; }
      .dot { width:9px;height:9px;border-radius:50%;background:#22c55e;flex-shrink:0; }
      .dot.warn { background:#eab308; }
      .dot.crit { background:#ef4444; }
      .dot.unavailable { background:#71717a; }
      .card { width:285px;background:#18181b;color:#f4f4f5;border:1px solid #3f3f46;border-radius:12px;
        padding:12px;box-shadow:0 8px 28px rgba(0,0,0,.45);display:none; }
      .card.open { display:block; }
      .row { display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;gap:8px; }
      .bar-bg { height:8px;background:#27272a;border-radius:999px;overflow:hidden;margin:6px 0 10px; }
      .bar-fill { height:100%;background:#22c55e;transition:width .3s ease; }
      .bar-fill.warn { background:#eab308; }
      .bar-fill.crit { background:#ef4444; }
      .btn { width:100%;padding:7px 10px;border-radius:8px;border:1px solid #3f3f46;background:#27272a;
        color:#f4f4f5;cursor:pointer;font-size:12px;font-weight:600;margin-top:8px; }
      .btn:hover { background:#3f3f46; }
      .btn.primary { background:#2563eb;border-color:#2563eb;color:#fff; }
      .btn.primary:hover { background:#1d4ed8; }
      .muted { color:#a1a1aa;font-size:11px;line-height:1.4; }
      .close { cursor:pointer;color:#a1a1aa;font-weight:bold;padding:2px 6px; }
    </style>
    <div class="pill" id="pill">
      <span class="dot unavailable" id="pillDot"></span>
      <span id="pillText">Chưa nhận diện DOM</span>
    </div>
    <div class="card" id="card">
      <div class="row">
        <strong>Token Guard Web</strong>
        <span class="close" id="closeBtn">✕</span>
      </div>
      <div class="row muted">
        <span id="cardTokens">Chưa nhận diện DOM</span>
        <span id="cardPct">—</span>
      </div>
      <div class="bar-bg"><div class="bar-fill" id="barFill" style="width:0%"></div></div>
      <div class="muted" id="cardMeta">Ước lượng văn bản hiển thị · chưa gồm file/ảnh/ngữ cảnh ẩn</div>
      <button class="btn primary" id="copyBtn">Copy prompt Handoff</button>
    </div>
  `;

  (document.documentElement || document.body).appendChild(root);

  const pill = shadow.getElementById('pill');
  const card = shadow.getElementById('card');
  const closeBtn = shadow.getElementById('closeBtn');
  const pillDot = shadow.getElementById('pillDot');
  const pillText = shadow.getElementById('pillText');
  const cardTokens = shadow.getElementById('cardTokens');
  const cardPct = shadow.getElementById('cardPct');
  const barFill = shadow.getElementById('barFill');
  const cardMeta = shadow.getElementById('cardMeta');
  const copyBtn = shadow.getElementById('copyBtn');

  function syncVisibility() {
    pill.style.display = cfg.expanded ? 'none' : 'flex';
    card.classList.toggle('open', !!cfg.expanded);
  }

  pill.addEventListener('click', () => {
    cfg.expanded = true;
    saveCfg(cfg);
    syncVisibility();
  });

  closeBtn.addEventListener('click', () => {
    cfg.expanded = false;
    saveCfg(cfg);
    syncVisibility();
  });

  let copyResetTimer = null;
  copyBtn.addEventListener('click', async () => {
    if (copyResetTimer) {
      clearTimeout(copyResetTimer);
      copyResetTimer = null;
    }
    let ok = false;
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(HANDOFF_PROMPT);
        ok = true;
      }
    } catch (_) {
      ok = false;
    }
    copyBtn.textContent = ok ? 'Đã copy!' : 'Copy thất bại — hãy copy thủ công';
    copyResetTimer = setTimeout(() => {
      copyResetTimer = null;
      copyBtn.textContent = 'Copy prompt Handoff';
    }, 2000);
  });

  function refresh() {
    if (document.hidden) return;
    const res = estimateConversation();
    if (res.status !== 'ok' || res.tokens === null) {
      lastTokens = 0;
      pillDot.className = 'dot unavailable';
      barFill.className = 'bar-fill';
      barFill.style.width = '0%';
      pillText.textContent = 'Chưa nhận diện DOM';
      cardTokens.textContent = 'Chưa nhận diện DOM';
      cardPct.textContent = '—';
      cardMeta.textContent = 'Chưa nhận diện DOM hội thoại · không ước lượng từ toàn trang';
      return;
    }

    const { tokens, turns } = res;
    lastTokens = tokens;
    const pct = cfg.crit > 0 ? Math.min(100, Math.round((tokens / cfg.crit) * 100)) : 0;
    const level = tokens >= cfg.crit ? 'crit' : tokens >= cfg.warn ? 'warn' : '';

    pillDot.className = level ? 'dot ' + level : 'dot';
    barFill.className = level ? 'bar-fill ' + level : 'bar-fill';
    barFill.style.width = pct + '%';

    const kVal = tokens >= 1000 ? (tokens / 1000).toFixed(1) + 'k' : String(tokens);
    const kCrit = Math.round(cfg.crit / 1000) + 'k';
    pillText.textContent = `~${kVal} / ngưỡng ${kCrit} (${pct}%)`;
    cardTokens.textContent = `~${tokens.toLocaleString()} / ngưỡng ${cfg.crit.toLocaleString()}`;
    cardPct.textContent = `${pct}% ngưỡng cảnh báo`;
    cardMeta.textContent = `Ước lượng văn bản hiển thị · ${turns} khối · chưa gồm file/ảnh/ngữ cảnh ẩn`;
  }

  let debounceTimer = null;
  let lastHref = location.href;
  let observedTarget = null;

  function scheduleRefresh() {
    if (document.hidden || debounceTimer) return;
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      if (!document.hidden) {
        refresh();
      }
    }, DEBOUNCE_MS);
  }

  function isOverlayMutation(record) {
    const target = record && record.target;
    if (!target) return false;
    return target === root || (typeof root.contains === 'function' && root.contains(target));
  }

  const obs = new MutationObserver((records) => {
    if (location.href !== lastHref) {
      handleRouteChange();
      return;
    }
    if (document.hidden) return;
    if (Array.isArray(records) && records.length > 0 && records.every(isOverlayMutation)) {
      return;
    }
    scheduleRefresh();
  });

  function attachObserver() {
    const target = document.querySelector('main') || document.body || document.documentElement;
    if (!target || target === observedTarget) return;
    obs.disconnect();
    obs.observe(target, { childList: true, subtree: true, characterData: true });
    observedTarget = target;
  }

  function handleRouteChange() {
    if (location.href === lastHref) return;
    lastHref = location.href;
    lastTokens = 0;
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    attachObserver();
    if (!document.hidden) {
      refresh();
    }
  }

  if (typeof history !== 'undefined' && history && !history.__tgWebHooked) {
    history.__tgWebHooked = true;
    for (const fnName of ['pushState', 'replaceState']) {
      const orig = history[fnName];
      if (typeof orig === 'function') {
        history[fnName] = function (...args) {
          const ret = orig.apply(this, args);
          handleRouteChange();
          return ret;
        };
      }
    }
  }

  window.addEventListener('popstate', handleRouteChange);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      handleRouteChange();
      attachObserver();
      refresh();
    }
  });

  syncVisibility();
  attachObserver();
  if (!document.hidden) {
    refresh();
  }
})();
