// ==UserScript==
// @name         Token Guard Web (ChatGPT & Claude)
// @namespace    https://github.com/blamag999/agent-workflow-template
// @version      2.0.0
// @description  Theo dõi ước lượng token realtime trên ChatGPT Web & Claude Web, cảnh báo ngưỡng và chèn nhanh prompt Lưu ngữ cảnh.
// @author       blamag999
// @match        https://chatgpt.com/*
// @match        https://chat.openai.com/*
// @match        https://claude.ai/*
// @updateURL    https://raw.githubusercontent.com/blamag999/agent-workflow-template/main/extras/web-token-guard.user.js
// @downloadURL  https://raw.githubusercontent.com/blamag999/agent-workflow-template/main/extras/web-token-guard.user.js
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const STORAGE_KEY = 'token_guard_web_cfg_v1';
  const HANDOFF_PROMPT =
    'Hãy tóm tắt ngắn gọn (< 1,200 tokens) toàn bộ ngữ cảnh phiên này để tôi dán sang phiên mới: ' +
    '1) Mục tiêu chính, 2) Quyết định & ràng buộc đã chốt, 3) File/code đã sửa, ' +
    '4) Trạng thái hiện tại & việc cần làm tiếp theo, 5) Lưu ý/lỗi đang gặp.';

  function loadCfg() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return Object.assign({ warn: 80000, crit: 120000, expanded: false }, JSON.parse(raw));
    } catch (_) {}
    return { warn: 80000, crit: 120000, expanded: false };
  }

  function saveCfg(cfg) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
    } catch (_) {}
  }

  let cfg = loadCfg();
  let lastTokens = 0;

  function estimateConversation() {
    const isClaude = location.hostname.includes('claude.ai');
    const selectors = isClaude
      ? ['[data-testid="user-message"]', '.font-claude-message', 'main article', 'main [class*="message"]']
      : ['[data-message-author-role]', 'article[data-testid^="conversation-turn"]'];

    let nodes = [];
    for (const sel of selectors) {
      const found = document.querySelectorAll(sel);
      if (found.length > 0) {
        nodes = Array.from(found);
        break;
      }
    }

    if (nodes.length === 0) {
      const main = document.querySelector('main');
      const chars = main ? (main.innerText || '').length : 0;
      return { tokens: Math.round(chars / 3.8), turns: 0 };
    }

    let chars = 0;
    for (const n of nodes) chars += (n.innerText || '').length;
    return { tokens: Math.round(chars / 3.8), turns: nodes.length };
  }

  function fillPrompt(text) {
    const isClaude = location.hostname.includes('claude.ai');
    const input = isClaude
      ? document.querySelector('div[contenteditable="true"].ProseMirror, div[contenteditable="true"]')
      : document.querySelector('#prompt-textarea, textarea[data-id], div[contenteditable="true"]#prompt-textarea');

    if (input) {
      input.focus();
      if (input.tagName === 'TEXTAREA') {
        input.value = text;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      } else {
        input.textContent = text;
        input.dispatchEvent(new InputEvent('input', { bubbles: true, data: text }));
      }
      return true;
    }
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    return false;
  }

  const root = document.createElement('div');
  root.id = 'tg-web-root';
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
      .card { width:270px;background:#18181b;color:#f4f4f5;border:1px solid #3f3f46;border-radius:12px;
        padding:12px;box-shadow:0 8px 28px rgba(0,0,0,.45);display:none; }
      .card.open { display:block; }
      .row { display:flex;justify-content:space-between;align-items:center;margin-bottom:8px; }
      .bar-bg { height:8px;background:#27272a;border-radius:999px;overflow:hidden;margin:6px 0 10px; }
      .bar-fill { height:100%;background:#22c55e;transition:width .3s ease; }
      .bar-fill.warn { background:#eab308; }
      .bar-fill.crit { background:#ef4444; }
      .btn { width:100%;padding:7px 10px;border-radius:8px;border:1px solid #3f3f46;background:#27272a;
        color:#f4f4f5;cursor:pointer;font-size:12px;font-weight:600;margin-top:6px; }
      .btn:hover { background:#3f3f46; }
      .btn.primary { background:#2563eb;border-color:#2563eb;color:#fff; }
      .btn.primary:hover { background:#1d4ed8; }
      .muted { color:#a1a1aa;font-size:11px; }
      .close { cursor:pointer;color:#a1a1aa;font-weight:bold;padding:2px 6px; }
    </style>
    <div class="pill" id="pill">
      <span class="dot" id="pillDot"></span>
      <span id="pillText">0 / 120k</span>
    </div>
    <div class="card" id="card">
      <div class="row">
        <strong>Token Guard Web</strong>
        <span class="close" id="closeBtn">✕</span>
      </div>
      <div class="row muted">
        <span id="cardTokens">~0 / 120,000</span>
        <span id="cardPct">0%</span>
      </div>
      <div class="bar-bg"><div class="bar-fill" id="barFill" style="width:0%"></div></div>
      <div class="muted" id="cardMeta">Ước lượng realtime · 0 tin nhắn</div>
      <button class="btn primary" id="handoffBtn">Chèn prompt Lưu ngữ cảnh</button>
      <button class="btn" id="copyBtn">Copy prompt Handoff</button>
    </div>
  `;

  document.documentElement.appendChild(root);

  const pill = shadow.getElementById('pill');
  const card = shadow.getElementById('card');
  const closeBtn = shadow.getElementById('closeBtn');
  const pillDot = shadow.getElementById('pillDot');
  const pillText = shadow.getElementById('pillText');
  const cardTokens = shadow.getElementById('cardTokens');
  const cardPct = shadow.getElementById('cardPct');
  const barFill = shadow.getElementById('barFill');
  const cardMeta = shadow.getElementById('cardMeta');
  const handoffBtn = shadow.getElementById('handoffBtn');
  const copyBtn = shadow.getElementById('copyBtn');

  function syncVisibility() {
    pill.style.display = cfg.expanded ? 'none' : 'flex';
    card.classList.toggle('open', !!cfg.expanded);
  }

  pill.addEventListener('click', () => { cfg.expanded = true; saveCfg(cfg); syncVisibility(); });
  closeBtn.addEventListener('click', () => { cfg.expanded = false; saveCfg(cfg); syncVisibility(); });

  handoffBtn.addEventListener('click', () => {
    const ok = fillPrompt(HANDOFF_PROMPT);
    handoffBtn.textContent = ok ? 'Đã điền vào ô chat!' : 'Đã copy vào clipboard!';
    setTimeout(() => { handoffBtn.textContent = 'Chèn prompt Lưu ngữ cảnh'; }, 2000);
  });

  copyBtn.addEventListener('click', () => {
    navigator.clipboard?.writeText(HANDOFF_PROMPT).catch(() => {});
    copyBtn.textContent = 'Đã copy!';
    setTimeout(() => { copyBtn.textContent = 'Copy prompt Handoff'; }, 1800);
  });

  function refresh() {
    const { tokens, turns } = estimateConversation();
    lastTokens = tokens;
    const pct = Math.min(100, Math.round((tokens / cfg.crit) * 100));
    const level = tokens >= cfg.crit ? 'crit' : tokens >= cfg.warn ? 'warn' : '';

    pillDot.className = 'dot ' + level;
    barFill.className = 'bar-fill ' + level;
    barFill.style.width = pct + '%';

    const kVal = tokens >= 1000 ? (tokens / 1000).toFixed(1) + 'k' : String(tokens);
    const kCrit = Math.round(cfg.crit / 1000) + 'k';
    pillText.textContent = `${kVal} / ${kCrit} (${pct}%)`;
    cardTokens.textContent = `~${tokens.toLocaleString()} / ${cfg.crit.toLocaleString()}`;
    cardPct.textContent = `${pct}%`;
    cardMeta.textContent = `Ước lượng realtime · ${turns} khối tin nhắn`;
  }

  syncVisibility();
  refresh();

  let timer = null;
  const obs = new MutationObserver(() => {
    if (timer) return;
    timer = setTimeout(() => {
      timer = null;
      refresh();
    }, 1500);
  });
  obs.observe(document.body || document.documentElement, { childList: true, subtree: true });
  setInterval(refresh, 4000);
})();
