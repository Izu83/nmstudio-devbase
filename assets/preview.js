/* The preview: one project running in a desktop, tablet or phone frame. */
(() => {
  const { projects, t, pick, esc } = NM;
  const $ = id => document.getElementById(id);

  const DEVICES = {
    desktop: { w: 1440, h: 900, pad: 0, top: 34 },
    tablet: { w: 820, h: 1180, pad: 14, top: 0 },
    mobile: { w: 390, h: 844, pad: 12, top: 30 }
  };

  const params = new URLSearchParams(location.search);
  let project = projects.find(p => p.id === params.get('p')) || null;
  let device = DEVICES[params.get('d')] ? params.get('d') : (innerWidth < 560 ? 'mobile' : innerWidth < 1000 ? 'tablet' : 'desktop');
  let page = params.get('page') || '';
  let current = '';   // the address the frame is showing now

  const frame = $('frame');

  function saveUrl() {
    const q = new URLSearchParams();
    if (project) q.set('p', project.id);
    if (page) q.set('page', page);
    q.set('d', device);
    history.replaceState(null, '', `?${q}`);
  }

  /* The path inside the project (e.g. "menu/") for an address the frame is on, or null if it left the project */
  function relPath(href) {
    const base = NM.siteUrl(project);
    if (!href.startsWith(base)) return null;
    return href.slice(base.length).replace(/[?#].*$/, '').replace(/^index\.html$/, '');
  }

  function showAddress(href) {
    current = href;
    const rel = relPath(href);
    const shown = NM.shownDomain(project) + (rel ? '/' + rel.replace(/\/$/, '') : '');
    $('addr').textContent = shown;
    $('devAddr').textContent = shown;
    $('newtab').href = href;
    const sel = $('page');
    const i = (project.pages || []).findIndex(pg => pg.path === rel);
    sel.selectedIndex = i;
    if (rel !== null) { page = rel; saveUrl(); }
  }

  function loadSite() {
    $('spinner').classList.remove('done');
    const src = NM.siteUrl(project, page);
    frame.src = src;
    showAddress(src);
  }

  frame.addEventListener('load', () => {
    $('spinner').classList.add('done');
    try {
      const href = frame.contentWindow.location.href;
      if (href && href !== 'about:blank') showAddress(href);
      const title = frame.contentDocument.title;
      if (title) frame.title = title;
    } catch { /* a site on another domain: its address can't be read */ }
  });

  /* Size the frame to the device and scale it down to fit the stage */
  function layout() {
    const d = DEVICES[device];
    const el = $('device');
    const full = document.body.classList.contains('full');
    const w = full ? $('stage').clientWidth : d.w + d.pad * 2;
    const h = full ? $('stage').clientHeight : d.h + d.pad * 2 + d.top;
    el.className = `device is-${full ? 'full' : device}`;
    el.style.width = w + 'px';
    el.style.height = h + 'px';

    const st = getComputedStyle($('stage'));
    const availW = $('stage').clientWidth - parseFloat(st.paddingLeft) - parseFloat(st.paddingRight);
    const availH = $('stage').clientHeight - parseFloat(st.paddingTop) - parseFloat(st.paddingBottom);
    const scale = full ? 1 : Math.min(1, availW / w, availH / h);
    el.style.transform = `translate(-50%, -50%) scale(${scale})`;
    $('size').textContent = full ? '' : `${d.w} × ${d.h}${scale < .995 ? ` · ${Math.round(scale * 100)}%` : ''}`;

    document.querySelectorAll('#devices button').forEach(b => b.setAttribute('aria-pressed', b.dataset.d === device));
  }

  function renderPages() {
    const pages = project.pages || [];
    $('pageWrap').hidden = pages.length < 2;
    $('page').innerHTML = pages.map(pg => `<option value="${esc(pg.path)}">${esc(pick(pg.label) || pg.path || '/')}</option>`).join('');
    $('page').selectedIndex = pages.findIndex(pg => pg.path === relPath(current || NM.siteUrl(project, page)));
  }

  function renderInfo() {
    $('name').textContent = project.name;
    document.title = `${project.name} | NMStudio Devbase`;
    $('dName').textContent = project.name;
    const st = NM.status(project);
    $('dMeta').innerHTML = `<button class="status s-${st} move" type="button" aria-haspopup="menu" aria-expanded="false" title="${esc(t('move.title'))}">` +
      `${esc(t('status.' + st))}<svg class="icon" viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg></button>${esc(pick(project.category))}`;
    $('dDesc').textContent = pick(project.description);
    const facts = [
      ['d.client', pick(project.client)],
      ['d.by', (project.by || []).join(', ')],
      ['d.started', NM.date(project.started)],
      ['d.updated', NM.date(project.updated)]
    ].filter(([, v]) => v);
    $('dFacts').innerHTML = facts.map(([k, v]) => `<div><dt>${esc(t(k))}</dt><dd>${esc(v)}</dd></div>`).join('');
    $('dFacts').hidden = !facts.length;
    const note = pick(project.notes);
    $('dNotesWrap').hidden = !note;
    $('dNote').textContent = note;
    $('dRunWrap').hidden = !project.run;
    $('dRun').textContent = project.run || '';
    $('dTech').innerHTML = (project.tech || []).map(x => `<span class="chip">${esc(x)}</span>`).join('');
    const arrow = '<svg class="icon" viewBox="0 0 16 16"><path d="M4 12 12 4M6 4h6v6"/></svg>';
    $('dLinks').innerHTML = [
      project.live && `<a href="${esc(project.live)}" target="_blank" rel="noopener">${esc(t('pv.live'))}${arrow}</a>`,
      project.repo && `<a href="${esc(project.repo)}" target="_blank" rel="noopener">${esc(t('pv.repo'))}${arrow}</a>`
    ].filter(Boolean).join('');
  }

  function setInfo(open) {
    $('drawer').hidden = !open;
    $('infoBtn').setAttribute('aria-expanded', open);
  }

  function go(step) {
    const i = projects.indexOf(project);
    project = projects[(i + step + projects.length) % projects.length];
    page = '';
    current = '';
    renderInfo();
    renderPages();
    loadSite();
    saveUrl();
  }

  function setFull(on) {
    document.body.classList.toggle('full', on);
    if (on && document.documentElement.requestFullscreen && !document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else if (!on && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    requestAnimationFrame(layout);
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (!project) {
      $('device').hidden = true;
      $('size').hidden = true;
      $('missing').hidden = false;
      document.querySelectorAll('.pv-center, .pv-right > :not(.lang)').forEach(el => { el.hidden = true; el.style.display = 'none'; });
      return;
    }

    renderInfo();
    renderPages();
    /* First size without the resize animation */
    $('device').style.transition = 'none';
    layout();
    requestAnimationFrame(() => requestAnimationFrame(() => { $('device').style.transition = ''; }));
    loadSite();
    saveUrl();

    if (projects.length > 1) { $('prev').hidden = false; $('next').hidden = false; }

    $('dCopy').addEventListener('click', async () => {
      const b = $('dCopy');
      try { await navigator.clipboard.writeText(project.run || ''); } catch { return; }
      b.textContent = t('d.copied');
      b.classList.add('done');
      setTimeout(() => { b.textContent = t('d.copy'); b.classList.remove('done'); }, 1600);
    });

    /* Show the project's notes once per visit on wide screens */
    if (pick(project.notes) && innerWidth >= 1200 && !sessionStorageGet(`nm-seen-${project.id}`)) {
      setInfo(true);
      sessionStorageSet(`nm-seen-${project.id}`);
    }

    NM.onLang(() => { renderInfo(); renderPages(); });
    $('dMeta').addEventListener('click', e => {
      const b = e.target.closest('.move');
      if (b) Base.statusMenu(b, project, renderInfo);
    });
    Base.refreshStatus().then(changed => { if (changed) renderInfo(); });
    addEventListener('resize', layout);
    if ('ResizeObserver' in window) new ResizeObserver(layout).observe($('stage'));

    $('devices').addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b) return;
      device = b.dataset.d;
      layout();
      saveUrl();
    });
    $('page').addEventListener('change', e => { page = e.target.value; loadSite(); saveUrl(); });
    $('reload').addEventListener('click', () => {
      $('spinner').classList.remove('done');
      try { frame.contentWindow.location.reload(); } catch { frame.src = current || frame.src; }
    });
    $('infoBtn').addEventListener('click', () => setInfo($('drawer').hidden));
    $('closeInfo').addEventListener('click', () => setInfo(false));
    $('prev').addEventListener('click', () => go(-1));
    $('next').addEventListener('click', () => go(1));
    $('full').addEventListener('click', () => setFull(true));
    $('exitFull').addEventListener('click', () => setFull(false));
    document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement) setFull(false); });
    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape') return;
      if (!$('drawer').hidden) setInfo(false);
      else if (document.body.classList.contains('full')) setFull(false);
    });
  });

  function sessionStorageGet(k) { try { return sessionStorage.getItem(k); } catch { return '1'; } }
  function sessionStorageSet(k) { try { sessionStorage.setItem(k, '1'); } catch {} }
})();
