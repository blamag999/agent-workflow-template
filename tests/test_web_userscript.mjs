import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const ROOT_SCRIPT = path.join(REPO_ROOT, 'extras', 'web-token-guard.user.js');
const PLUGIN_SCRIPT = path.join(REPO_ROOT, '.agents', 'plugins', 'token-guard', 'extras', 'web-token-guard.user.js');

const USERSCRIPT_SRC = fs.readFileSync(ROOT_SCRIPT, 'utf8');

class FakeClassList {
  constructor(el) {
    this.el = el;
    this.set = new Set();
  }
  toggle(cls, force) {
    if (force === undefined) {
      if (this.set.has(cls)) this.set.delete(cls);
      else this.set.add(cls);
    } else if (force) {
      this.set.add(cls);
    } else {
      this.set.delete(cls);
    }
    this.el.className = Array.from(this.set).join(' ');
  }
  contains(cls) {
    return this.set.has(cls);
  }
}

class FakeElement {
  constructor(tagName, attrs = {}, text = '') {
    this.tagName = tagName.toUpperCase();
    this.attrs = { ...attrs };
    this.id = attrs.id || '';
    this.className = attrs.class || '';
    this.children = [];
    this.parentNode = null;
    this._text = text;
    this.style = { cssText: '' };
    this.listeners = new Map();
    this.classList = new FakeClassList(this);
    this.shadowRoot = null;
    this.value = attrs.value || '';
  }

  get innerText() {
    if (this.children.length === 0) return this._text;
    return [this._text, ...this.children.map((c) => c.innerText)].filter(Boolean).join('\n');
  }

  set innerText(v) {
    this._text = String(v);
  }

  get textContent() {
    return this.innerText;
  }

  set textContent(v) {
    this._text = String(v);
  }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  contains(other) {
    let cur = other;
    while (cur) {
      if (cur === this) return true;
      cur = cur.parentNode;
    }
    return false;
  }

  getAttribute(name) {
    if (name === 'id') return this.id || null;
    if (name === 'class') return this.className || null;
    return Object.prototype.hasOwnProperty.call(this.attrs, name) ? this.attrs[name] : null;
  }

  matchesSingle(sel) {
    const s = sel.trim();
    if (!s) return false;
    if (s.startsWith('#')) return this.id === s.slice(1);
    if (s.startsWith('.')) return this.className.split(/\s+/).includes(s.slice(1));
    const attrPrefix = s.match(/^([a-z0-9]+)?\[([a-z0-9_-]+)\^="([^"]+)"\]$/i);
    if (attrPrefix) {
      const [, tag, attr, val] = attrPrefix;
      if (tag && this.tagName !== tag.toUpperCase()) return false;
      const actual = this.getAttribute(attr);
      return typeof actual === 'string' && actual.startsWith(val);
    }
    const attrEq = s.match(/^([a-z0-9]+)?\[([a-z0-9_-]+)="([^"]+)"\]$/i);
    if (attrEq) {
      const [, tag, attr, val] = attrEq;
      if (tag && this.tagName !== tag.toUpperCase()) return false;
      return this.getAttribute(attr) === val;
    }
    const attrHas = s.match(/^([a-z0-9]+)?\[([a-z0-9_-]+)\]$/i);
    if (attrHas) {
      const [, tag, attr] = attrHas;
      if (tag && this.tagName !== tag.toUpperCase()) return false;
      return this.getAttribute(attr) !== null;
    }
    return this.tagName === s.toUpperCase();
  }

  matches(selectorList) {
    return selectorList.split(',').some((part) => {
      const tokens = part.trim().split(/\s+/);
      if (tokens.length === 1) return this.matchesSingle(tokens[0]);
      if (tokens.length === 2) {
        if (!this.matchesSingle(tokens[1])) return false;
        let p = this.parentNode;
        while (p) {
          if (p.matchesSingle(tokens[0])) return true;
          p = p.parentNode;
        }
        return false;
      }
      return false;
    });
  }

  closest(selectorList) {
    let cur = this;
    while (cur) {
      if (cur.matches(selectorList)) return cur;
      cur = cur.parentNode;
    }
    return null;
  }

  querySelectorAll(selectorList) {
    const out = [];
    const walk = (node) => {
      for (const child of node.children) {
        if (child.matches(selectorList)) out.push(child);
        walk(child);
      }
    };
    walk(this);
    return out;
  }

  querySelector(selectorList) {
    return this.querySelectorAll(selectorList)[0] || null;
  }

  getElementById(id) {
    return this.querySelector('#' + id);
  }

  addEventListener(type, fn) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(fn);
  }

  async click() {
    const fns = this.listeners.get('click') || [];
    for (const fn of fns) {
      await fn({ target: this });
    }
  }

  attachShadow() {
    const shadow = new FakeShadowRoot();
    this.shadowRoot = shadow;
    return shadow;
  }
}

class FakeShadowRoot {
  constructor() {
    this.elements = new Map();
    this._html = '';
  }

  set innerHTML(html) {
    this._html = html;
    this.elements.clear();
    const idRegex = /<([a-z0-9]+)[^>]*\bid="([^"]+)"[^>]*>([^<]*)/gi;
    let m;
    while ((m = idRegex.exec(html)) !== null) {
      const el = new FakeElement(m[1], { id: m[2] }, m[3] || '');
      this.elements.set(m[2], el);
    }
  }

  get innerHTML() {
    return this._html;
  }

  getElementById(id) {
    return this.elements.get(id) || null;
  }
}

function createHarness({ url = 'https://claude.ai/chat/c1', clipboard = undefined, hidden = false } = {}) {
  const parsed = new URL(url);
  const documentElement = new FakeElement('html');
  const body = new FakeElement('body');
  documentElement.appendChild(body);

  const docListeners = new Map();
  const winListeners = new Map();
  const storage = new Map();
  const observers = [];
  const timers = [];
  let nextTimerId = 1;
  let setIntervalCalls = 0;

  const location = {
    href: parsed.href,
    hostname: parsed.hostname,
  };

  const document = {
    documentElement,
    body,
    hidden,
    createElement: (tag) => new FakeElement(tag),
    getElementById: (id) => documentElement.getElementById(id),
    querySelector: (sel) => documentElement.querySelector(sel),
    querySelectorAll: (sel) => documentElement.querySelectorAll(sel),
    addEventListener: (type, fn) => {
      if (!docListeners.has(type)) docListeners.set(type, []);
      docListeners.get(type).push(fn);
    },
    dispatchEvent: (type) => {
      for (const fn of docListeners.get(type) || []) fn({});
    },
  };

  class FakeMutationObserver {
    constructor(cb) {
      this.cb = cb;
      this.target = null;
      this.disconnected = false;
      observers.push(this);
    }
    observe(target) {
      this.target = target;
      this.disconnected = false;
    }
    disconnect() {
      this.disconnected = true;
    }
    trigger(records) {
      if (!this.disconnected) this.cb(records, this);
    }
  }

  const history = {
    pushState(_state, _title, nextUrl) {
      const u = new URL(nextUrl, location.href);
      location.href = u.href;
      location.hostname = u.hostname;
    },
    replaceState(_state, _title, nextUrl) {
      const u = new URL(nextUrl, location.href);
      location.href = u.href;
      location.hostname = u.hostname;
    },
  };

  const localStorage = {
    getItem: (k) => (storage.has(k) ? storage.get(k) : null),
    setItem: (k, v) => storage.set(k, String(v)),
    _raw: storage,
  };

  const windowObj = {
    location,
    history,
    document,
    localStorage,
    addEventListener: (type, fn) => {
      if (!winListeners.has(type)) winListeners.set(type, []);
      winListeners.get(type).push(fn);
    },
    dispatchEvent: (type) => {
      for (const fn of winListeners.get(type) || []) fn({});
    },
  };

  const navigator = clipboard === undefined ? {} : { clipboard };

  const setTimeoutMock = (fn, delay) => {
    const id = nextTimerId++;
    timers.push({ id, fn, delay, cleared: false, ran: false });
    return id;
  };
  const clearTimeoutMock = (id) => {
    const t = timers.find((x) => x.id === id);
    if (t) t.cleared = true;
  };
  const setIntervalMock = () => {
    setIntervalCalls += 1;
    return 999;
  };

  const sandbox = {
    window: windowObj,
    document,
    location,
    history,
    localStorage,
    navigator,
    MutationObserver: FakeMutationObserver,
    setTimeout: setTimeoutMock,
    clearTimeout: clearTimeoutMock,
    setInterval: setIntervalMock,
    console,
  };
  vm.createContext(sandbox);

  return {
    sandbox,
    document,
    body,
    location,
    history,
    windowObj,
    storage,
    observers,
    timers,
    getSetIntervalCalls: () => setIntervalCalls,
    runScript: () => vm.runInContext(USERSCRIPT_SRC, sandbox),
    flushTimers: () => {
      const pending = timers.filter((t) => !t.cleared && !t.ran);
      for (const t of pending) {
        t.ran = true;
        t.fn();
      }
      return pending.length;
    },
  };
}

test('Both userscript copies are byte-for-byte identical', () => {
  const pluginSrc = fs.readFileSync(PLUGIN_SCRIPT, 'utf8');
  assert.equal(USERSCRIPT_SRC, pluginSrc);
});

test('T6: Claude user+assistant regression, dedup, nav exclusion, and unavailable fallback', () => {
  const h = createHarness({ url: 'https://claude.ai/chat/123' });

  // Navigation & sidebar noise that MUST be excluded
  const nav = new FakeElement('nav');
  nav.appendChild(new FakeElement('div', { 'data-testid': 'user-message' }, 'A'.repeat(3800)));
  h.body.appendChild(nav);

  const main = new FakeElement('main');
  const userMsg = new FakeElement('div', { 'data-testid': 'user-message' }, 'U'.repeat(380)); // 100 tokens
  const assistantMsg = new FakeElement('div', { class: 'font-claude-message' }, 'A'.repeat(760)); // 200 tokens
  // Nested overlapping selector inside assistantMsg -> must NOT double count
  const nested = new FakeElement('div', { 'data-testid': 'assistant-message' }, 'N'.repeat(380)); // +100 tokens inside parent
  assistantMsg.appendChild(nested);
  main.appendChild(userMsg);
  main.appendChild(assistantMsg);
  h.body.appendChild(main);

  h.runScript();

  const root = h.document.getElementById('tg-web-root');
  assert.ok(root, 'overlay root should be mounted');
  const shadow = root.shadowRoot;
  // Total chars: 380 + (760 + 1 newline + 380) = 1521 -> round(1521/3.8) = 400 tokens, 2 top-level blocks
  assert.match(shadow.getElementById('cardMeta').textContent, /2 khối/);
  assert.match(shadow.getElementById('cardMeta').textContent, /chưa gồm file\/ảnh\/ngữ cảnh ẩn/);
  assert.match(shadow.getElementById('cardTokens').textContent, /~400 \/ ngưỡng 120,000/);
  assert.match(shadow.getElementById('cardPct').textContent, /% ngưỡng cảnh báo/);

  // Unknown DOM -> unavailable, never counts main.innerText
  const hUnknown = createHarness({ url: 'https://claude.ai/chat/unknown' });
  const unknownMain = new FakeElement('main', {}, 'X'.repeat(50000));
  hUnknown.body.appendChild(unknownMain);
  hUnknown.runScript();
  const s2 = hUnknown.document.getElementById('tg-web-root').shadowRoot;
  assert.equal(s2.getElementById('pillText').textContent, 'Chưa nhận diện DOM');
  assert.equal(s2.getElementById('cardTokens').textContent, 'Chưa nhận diện DOM');
  assert.equal(s2.getElementById('barFill').style.width, '0%');
});

test('T6: ChatGPT adapter counts user+assistant and supports fallback', () => {
  const h = createHarness({ url: 'https://chatgpt.com/c/abc' });
  const main = new FakeElement('main');
  main.appendChild(new FakeElement('div', { 'data-message-author-role': 'user' }, 'Q'.repeat(380)));
  main.appendChild(new FakeElement('div', { 'data-message-author-role': 'assistant' }, 'R'.repeat(760)));
  h.body.appendChild(main);

  h.runScript();
  const shadow = h.document.getElementById('tg-web-root').shadowRoot;
  assert.match(shadow.getElementById('cardMeta').textContent, /2 khối/);
  assert.match(shadow.getElementById('cardTokens').textContent, /~300 \/ ngưỡng 120,000/);
});

test('T7: SPA route change, streaming debounce, overlay exclusion, hidden pause, singleton, no setInterval', () => {
  const h = createHarness({ url: 'https://chatgpt.com/c/chat-1' });
  const main = new FakeElement('main');
  const m1 = new FakeElement('div', { 'data-message-author-role': 'user' }, 'A'.repeat(3800)); // 1000 tok
  main.appendChild(m1);
  h.body.appendChild(main);

  h.runScript();
  assert.equal(h.getSetIntervalCalls(), 0, 'must not use setInterval');
  assert.equal(h.observers.length, 1, 'must create exactly 1 MutationObserver');

  // Singleton guard: running script a second time must not add another observer
  h.runScript();
  assert.equal(h.observers.length, 1, 'singleton guard prevents duplicate observer');

  const root = h.document.getElementById('tg-web-root');
  const shadow = root.shadowRoot;
  assert.match(shadow.getElementById('cardTokens').textContent, /~1,000/);

  // Overlay mutation must be ignored (0 debounce timers scheduled)
  h.observers[0].trigger([{ target: root }]);
  assert.equal(h.timers.filter((t) => !t.cleared && !t.ran).length, 0);

  // Streaming rapid mutations -> debounced to 1 timer
  main.appendChild(new FakeElement('div', { 'data-message-author-role': 'assistant' }, 'B'.repeat(3800)));
  h.observers[0].trigger([{ target: main }]);
  h.observers[0].trigger([{ target: main }]);
  h.observers[0].trigger([{ target: main }]);
  const pendingStreaming = h.timers.filter((t) => !t.cleared && !t.ran);
  assert.equal(pendingStreaming.length, 1);
  assert.equal(pendingStreaming[0].delay, 1500);
  h.flushTimers();
  assert.match(shadow.getElementById('cardTokens').textContent, /~2,000/);

  // Hidden tab pauses scanning
  h.document.hidden = true;
  main.appendChild(new FakeElement('div', { 'data-message-author-role': 'user' }, 'C'.repeat(3800)));
  h.observers[0].trigger([{ target: main }]);
  assert.equal(h.timers.filter((t) => !t.cleared && !t.ran).length, 0);
  assert.match(shadow.getElementById('cardTokens').textContent, /~2,000/);

  // Becoming visible refreshes
  h.document.hidden = false;
  h.document.dispatchEvent('visibilitychange');
  assert.match(shadow.getElementById('cardTokens').textContent, /~3,000/);

  // SPA navigation resets and recalculates for new conversation
  main.children = [];
  main.appendChild(new FakeElement('div', { 'data-message-author-role': 'user' }, 'D'.repeat(380))); // 100 tok
  h.history.pushState({}, '', '/c/chat-2');
  assert.match(shadow.getElementById('cardTokens').textContent, /~100/);
});

test('T8: Copy-only clipboard resolve/reject/missing, draft immutability, privacy source check', async () => {
  // 1) Resolve case + draft immutability
  let copiedText = null;
  const hOk = createHarness({
    url: 'https://chatgpt.com/c/draft-test',
    clipboard: {
      writeText: async (txt) => {
        copiedText = txt;
      },
    },
  });
  const composer = new FakeElement('textarea', { id: 'prompt-textarea', value: 'My important draft' }, 'My important draft');
  hOk.body.appendChild(composer);
  hOk.runScript();

  const shadowOk = hOk.document.getElementById('tg-web-root').shadowRoot;
  assert.equal(shadowOk.getElementById('handoffBtn'), null, 'Insert button must be removed');
  const copyBtnOk = shadowOk.getElementById('copyBtn');
  await copyBtnOk.click();
  assert.ok(copiedText && copiedText.includes('Mục tiêu chính'));
  assert.equal(copyBtnOk.textContent, 'Đã copy!');
  assert.equal(composer.value, 'My important draft', 'User draft must remain 100% immutable');

  // 2) Reject case
  const hErr = createHarness({
    url: 'https://claude.ai/chat/err',
    clipboard: {
      writeText: async () => {
        throw new Error('Permission denied');
      },
    },
  });
  hErr.runScript();
  const copyBtnErr = hErr.document.getElementById('tg-web-root').shadowRoot.getElementById('copyBtn');
  await copyBtnErr.click();
  assert.equal(copyBtnErr.textContent, 'Copy thất bại — hãy copy thủ công');

  // 3) Missing navigator.clipboard
  const hNoClip = createHarness({ url: 'https://claude.ai/chat/noclip', clipboard: undefined });
  hNoClip.runScript();
  const copyBtnNoClip = hNoClip.document.getElementById('tg-web-root').shadowRoot.getElementById('copyBtn');
  await copyBtnNoClip.click();
  assert.equal(copyBtnNoClip.textContent, 'Copy thất bại — hãy copy thủ công');

  // 4) Privacy & scope source scan
  assert.doesNotMatch(USERSCRIPT_SRC, /\bfetch\s*\(/);
  assert.doesNotMatch(USERSCRIPT_SRC, /\bXMLHttpRequest\b/);
  assert.doesNotMatch(USERSCRIPT_SRC, /\bsendBeacon\b/);
  assert.doesNotMatch(USERSCRIPT_SRC, /\bWebSocket\b/);
  assert.doesNotMatch(USERSCRIPT_SRC, /\bfillPrompt\b/);
  assert.doesNotMatch(USERSCRIPT_SRC, /\bsetInterval\b/);
  assert.doesNotMatch(USERSCRIPT_SRC, /main\.innerText/);

  // localStorage stores only config keys
  await hOk.document.getElementById('tg-web-root').shadowRoot.getElementById('pill').click();
  const saved = JSON.parse(hOk.storage.get('token_guard_web_cfg_v1'));
  assert.deepEqual(Object.keys(saved).sort(), ['crit', 'expanded', 'warn']);
});
