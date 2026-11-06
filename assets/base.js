/* Saving to the repo through the GitHub API: project categories (store/status.js, public)
   and the money data (store/finance.enc.json, encrypted in the browser with our password).
   Each of us signs in once per device with a GitHub token that can write to the repo. */
(() => {
  const { t, esc } = NM;
  const local = /^(localhost|127\.0\.0\.1|\[::1\])$|\.localhost$|\.test$/.test(location.hostname);
  const ls = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} }
  };
  const ss = {
    get(k) { try { return sessionStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { v == null ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, v); } catch {} }
  };

  /* Which repo: from the address on github.io (<owner>.github.io/<repo>/), otherwise ours */
  const gh = location.hostname.match(/^([^.]+)\.github\.io$/i);
  const REPO = {
    owner: gh ? gh[1] : 'Izu83',
    name: gh ? (location.pathname.split('/')[1] || 'nmstudio-devbase') : 'nmstudio-devbase',
    branch: 'main'
  };
  /* A local test server can stand in for GitHub (only on localhost) */
  const API = (local && ls.get('nm-gh-api')) || 'https://api.github.com';

  const STATUS_FILE = 'store/status.js';
  const FINANCE_FILE = 'store/finance.enc.json';

  const token = () => ls.get('nm-gh-token') || '';

  async function api(path, opts = {}) {
    const res = await fetch(API + path, {
      cache: 'no-store',
      ...opts,
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
        ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
        ...(opts.headers || {})
      }
    });
    if (!res.ok) {
      let msg = res.statusText;
      try { msg = (await res.json()).message || msg; } catch {}
      const err = new Error(`${res.status} ${msg}`);
      err.status = res.status;
      throw err;
    }
    return res.status === 204 ? null : res.json();
  }

  /* UTF-8 safe base64 */
  const toB64 = bytes => {
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s);
  };
  const fromB64 = b64 => Uint8Array.from(atob(b64.replace(/\s/g, '')), c => c.charCodeAt(0));
  const enc = new TextEncoder(), dec = new TextDecoder();

  const repoPath = p => `/repos/${REPO.owner}/${REPO.name}/contents/${p}`;

  async function getFile(path) {
    try {
      const f = await api(`${repoPath(path)}?ref=${REPO.branch}&t=${Date.now()}`);
      return { text: dec.decode(fromB64(f.content)), sha: f.sha };
    } catch (e) {
      if (e.status === 404) return null;
      throw e;
    }
  }
  async function putFile(path, text, sha, message) {
    const r = await api(repoPath(path), {
      method: 'PUT',
      body: JSON.stringify({ message, content: toB64(enc.encode(text)), branch: REPO.branch, ...(sha ? { sha } : {}) })
    });
    return r.content.sha;
  }
  const conflict = e => e.status === 409 || (e.status === 422 && /sha/i.test(e.message));

  /* Sign in: the token must be able to push to the repo */
  async function signIn(newToken) {
    const old = token();
    ls.set('nm-gh-token', newToken.trim());
    try {
      const repo = await api(`/repos/${REPO.owner}/${REPO.name}`);
      if (!repo.permissions || !repo.permissions.push) throw Object.assign(new Error('no-push'), { status: 403 });
      let login = '';
      try { login = (await api('/user')).login; } catch {}
      ls.set('nm-gh-login', login);
      return login;
    } catch (e) {
      ls.set('nm-gh-token', old || null);
      throw e;
    }
  }
  function signOut() {
    ls.set('nm-gh-token', null);
    ls.set('nm-gh-login', null);
    ls.set('nm-pass', null);
    ss.set('nm-pass', null);
  }

  /* ---------- Categories ---------- */
  function statusText(map) {
    const ids = Object.keys(map).sort();
    return '/* Written by the base when a project is moved to another category. It wins over `status` in projects.js. */\n' +
      'window.PROJECT_STATUS = {\n' + ids.map(id => `  ${JSON.stringify(id)}: ${JSON.stringify(map[id])}`).join(',\n') + '\n};\n';
  }
  function parseStatus(text) {
    const a = text.indexOf('{'), b = text.lastIndexOf('}');
    try { return a < 0 ? {} : JSON.parse(text.slice(a, b + 1)); } catch { return {}; }
  }
  /* Signed in: read the newest categories straight from the repo (the site lags a minute behind) */
  let moving = 0;      // moves being saved: their category wins over what's read meanwhile
  async function refreshStatus() {
    if (!token()) return false;
    try {
      const f = await getFile(STATUS_FILE);
      if (moving) return false;
      const map = f ? parseStatus(f.text) : {};
      const changed = JSON.stringify(map) !== JSON.stringify(window.PROJECT_STATUS || {});
      window.PROJECT_STATUS = map;
      return changed;
    } catch { return false; }
  }
  async function setStatus(project, status) {
    const before = { ...(window.PROJECT_STATUS || {}) };
    window.PROJECT_STATUS = { ...before, [project.id]: status };
    moving++;
    try {
      for (let i = 0; i < 3; i++) {
        const f = await getFile(STATUS_FILE);
        const map = { ...(f ? parseStatus(f.text) : {}), [project.id]: status };
        try {
          await putFile(STATUS_FILE, statusText(map), f && f.sha, `Move ${project.name} to ${status}`);
          window.PROJECT_STATUS = map;
          return;
        } catch (e) { if (!conflict(e) || i === 2) throw e; }
      }
    } catch (e) {
      window.PROJECT_STATUS = { ...window.PROJECT_STATUS, [project.id]: before[project.id] };
      if (before[project.id] === undefined) delete window.PROJECT_STATUS[project.id];
      throw e;
    } finally { moving--; }
  }

  /* ---------- Encryption: AES-GCM with a key made from our password (PBKDF2, SHA-256) ---------- */
  const ITER = 310000;
  async function deriveKey(pass, salt, iter = ITER) {
    const base = await crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: iter, hash: 'SHA-256' }, base,
      { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }
  async function seal(obj, key, salt) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const data = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(obj))));
    return JSON.stringify({ v: 1, kdf: 'PBKDF2-SHA256', iter: ITER, salt: toB64(salt), iv: toB64(iv), data: toB64(data) }, null, 1) + '\n';
  }
  async function decryptWith(text, key) {
    const f = JSON.parse(text);
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(f.iv) }, key, fromB64(f.data));
    return JSON.parse(dec.decode(plain));
  }
  async function open(text, pass) {
    const f = JSON.parse(text);
    const salt = fromB64(f.salt);
    const key = await deriveKey(pass, salt, f.iter || ITER);
    let plain;
    try {
      plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(f.iv) }, key, fromB64(f.data));
    } catch { throw Object.assign(new Error('wrong-password'), { wrongPassword: true }); }
    return { doc: JSON.parse(dec.decode(plain)), key, salt };
  }

  /* The money data. Changes are applied here at once, then saved together a moment later.
     If the other one saved in between, their version is loaded and our changes are applied on top. */
  function vault() {
    let doc = null, key = null, salt = null, sha = null;
    let pending = [], timer = 0, saving = null;
    const listeners = { change: [], status: [] };
    const emit = (ev, x) => listeners[ev].forEach(fn => fn(x));

    let fetched = null;
    async function exists() {
      fetched = await getFile(FINANCE_FILE);
      return !!fetched;
    }
    async function load(pass) {
      const f = fetched || await getFile(FINANCE_FILE);
      fetched = null;
      if (!f) return false;
      const r = await open(f.text, pass);
      ({ doc, key, salt } = r);
      sha = f.sha;
      return true;
    }
    async function create(pass, initial) {
      salt = crypto.getRandomValues(new Uint8Array(16));
      key = await deriveKey(pass, salt);
      doc = initial;
      sha = await putFile(FINANCE_FILE, await seal(doc, key, salt), null, 'Admin: create the money file [skip ci]');
    }
    function change(fn) {
      fn(doc);
      pending.push(fn);
      emit('change', doc);
      emit('status', 'dirty');
      clearTimeout(timer);
      timer = setTimeout(flush, 700);
    }
    async function flush() {
      clearTimeout(timer);
      if (saving) { await saving; if (pending.length) return flush(); return; }
      if (!pending.length) return;
      const batch = pending;
      pending = [];
      emit('status', 'saving');
      saving = (async () => {
        for (let i = 0; i < 4; i++) {
          try {
            sha = await putFile(FINANCE_FILE, await seal(doc, key, salt), sha, 'Admin: update the money data [skip ci]');
            emit('status', pending.length ? 'dirty' : 'saved');
            return;
          } catch (e) {
            if (!conflict(e) || i === 3) throw e;
            /* Someone else saved first: take theirs and redo our changes on it */
            const f = await getFile(FINANCE_FILE);
            const theirs = await decryptWith(f.text, key);
            [...batch, ...pending].forEach(fn => fn(theirs));
            doc = theirs;
            sha = f.sha;
            emit('change', doc);
          }
        }
      })();
      try { await saving; } catch (e) {
        pending = [...batch, ...pending];
        emit('status', 'error:' + e.message);
      } finally { saving = null; }
      if (pending.length && !timer) timer = setTimeout(flush, 700);
    }
    /* Load the newest version (e.g. after coming back to the tab) */
    async function reload() {
      if (pending.length || saving) return false;
      const f = await getFile(FINANCE_FILE);
      if (!f || f.sha === sha) return false;
      doc = await decryptWith(f.text, key);
      sha = f.sha;
      emit('change', doc);
      return true;
    }
    async function changePassword(pass) {
      await flush();
      salt = crypto.getRandomValues(new Uint8Array(16));
      key = await deriveKey(pass, salt);
      sha = await putFile(FINANCE_FILE, await seal(doc, key, salt), sha, 'Admin: change the money password [skip ci]');
    }
    return {
      exists, load, create, change, flush, reload, changePassword,
      get doc() { return doc; },
      get busy() { return !!(pending.length || saving); },
      on(ev, fn) { listeners[ev].push(fn); }
    };
  }

  /* ---------- Small UI shared by the pages ---------- */
  let toastTimer = 0;
  function toast(msg, bad) {
    let el = document.getElementById('nm-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'nm-toast';
      el.className = 'toast';
      el.setAttribute('role', 'status');
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.toggle('bad', !!bad);
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), bad ? 6000 : 3200);
  }

  /* The "move to another category" menu, opened from a status pill */
  let menu = null;
  function closeMenu() {
    if (!menu) return;
    menu.el.remove();
    menu.anchor.setAttribute('aria-expanded', 'false');
    menu = null;
  }
  function statusMenu(anchor, project, onMoved) {
    if (menu && menu.anchor === anchor) return closeMenu();
    closeMenu();
    const el = document.createElement('div');
    el.className = 'menu';
    el.setAttribute('role', 'menu');
    const cur = NM.status(project);
    if (!token()) {
      el.innerHTML = `<p>${esc(t('move.login'))}</p><a class="menu-btn" href="${esc(new URL('./#money', NM.root).href)}">${esc(t('move.loginBtn'))}</a>`;
      el.querySelector('a').addEventListener('click', closeMenu);
    } else {
      el.innerHTML = `<span class="menu-title">${esc(t('move.title'))}</span>` + NM.STATUSES.map(s =>
        `<button type="button" role="menuitemradio" aria-checked="${s === cur}" data-s="${s}"><span class="status s-${s}">${esc(t('status.' + s))}</span></button>`).join('');
      el.addEventListener('click', async e => {
        const b = e.target.closest('button[data-s]');
        if (!b) return;
        const s = b.dataset.s;
        closeMenu();
        if (s === cur) return;
        const moved = () => { onMoved && onMoved(); document.dispatchEvent(new Event('nm:status')); };
        const run = setStatus(project, s);
        moved();                       // shows the new category right away
        try { await run; toast(t('move.saved')); }
        catch (err) { toast(t('move.error') + err.message, true); }
        moved();
      });
    }
    document.body.appendChild(el);
    const r = anchor.getBoundingClientRect();
    const w = el.offsetWidth;
    el.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.left)) + 'px';
    const below = r.bottom + 8 + el.offsetHeight < innerHeight;
    el.style.top = (below ? r.bottom + 8 : r.top - 8 - el.offsetHeight) + 'px';
    anchor.setAttribute('aria-expanded', 'true');
    menu = { el, anchor };
    const first = el.querySelector('button, a');
    if (first) first.focus({ preventScroll: true });
  }
  document.addEventListener('click', e => {
    if (menu && !menu.el.contains(e.target) && !menu.anchor.contains(e.target)) closeMenu();
  }, true);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && menu) { const a = menu.anchor; closeMenu(); a.focus(); } });
  addEventListener('scroll', closeMenu, { passive: true });
  addEventListener('resize', closeMenu);

  window.Base = {
    REPO, local, token, signIn, signOut, refreshStatus, setStatus, vault, toast, statusMenu, closeMenu,
    get login() { return ls.get('nm-gh-login') || ''; },
    pass: {
      get() { return ss.get('nm-pass') || ls.get('nm-pass') || ''; },
      set(p, remember) { ss.set('nm-pass', p); ls.set('nm-pass', remember ? p : null); }
    }
  };
})();
