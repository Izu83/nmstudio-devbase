/* The showcase grid: stats, filters, cards with live thumbnails. */
(() => {
  const { projects, t, pick, esc } = NM;
  const $ = id => document.getElementById(id);
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const TABS = ['all', 'live', 'progress', 'demo'];
  const fromUrl = new URLSearchParams(location.search).get('cat');
  let filter = TABS.includes(fromUrl) ? fromUrl : 'all';
  let query = '';

  const status = p => NM.status(p);
  const lastChange = p => p.updated || p.started || '';
  /* In progress first, then by last change, newest first */
  const sorted = () => [...projects].sort((a, b) =>
    (status(a) === 'progress' ? 0 : 1) - (status(b) === 'progress' ? 0 : 1) || lastChange(b).localeCompare(lastChange(a)));

  const arrow = '<svg class="icon" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 12 12 4M6 4h6v6"/></svg>';

  function renderStats() {
    const n = projects.length;
    const count = s => projects.filter(p => status(p) === s).length;
    const latest = projects.map(lastChange).filter(Boolean).sort().pop();
    const items = [
      [n, n === 1 ? t('stats.project') : t('stats.projects')],
      [count('live'), t('stats.live')],
      [count('progress'), t('stats.progress')],
      [count('demo'), t('stats.demo')]
    ];
    if (latest) items.push([NM.date(latest), t('stats.updated')]);
    $('stats').innerHTML = items.map(([b, s]) => `<li><b>${esc(b)}</b><span>${esc(s)}</span></li>`).join('');
  }

  /* Проекти · Завършени · В работа · Демо */
  function renderFilters() {
    const box = $('filters');
    $('search').hidden = projects.length <= 6;
    const count = k => k === 'all' ? projects.length : projects.filter(p => status(p) === k).length;
    box.innerHTML = TABS.map(k =>
      `<button class="filter${k === 'all' ? '' : ' f-' + k}" type="button" role="tab" data-k="${k}" aria-selected="${k === filter}">` +
      `${esc(t('tab.' + k))}<span class="n">${count(k)}</span></button>`).join('');
  }

  function matches(p) {
    if (filter !== 'all' && status(p) !== filter) return false;
    if (!query) return true;
    const hay = [p.name, p.client, pick(p.category), pick(p.description), pick(p.notes), ...(p.tech || []), ...(p.by || []), NM.shownDomain(p)]
      .join(' ').toLowerCase();
    return hay.includes(query);
  }

  function card(p, i) {
    const thumb = p.cover
      ? `<img src="${esc(p.cover)}" alt="" loading="lazy">`
      : `<div class="loading"></div><iframe tabindex="-1" aria-hidden="true" title="" data-src="${esc(NM.siteUrl(p))}"></iframe>`;
    const st = status(p);
    const meta = `<button class="status s-${st} move" type="button" aria-haspopup="menu" aria-expanded="false" title="${esc(t('move.title'))}">` +
      `${esc(t('status.' + st))}<svg class="icon" viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg></button>` +
      [pick(p.category), NM.date(lastChange(p))].filter(Boolean).map(x => `<span>${esc(x)}</span>`).join('<span aria-hidden="true">·</span>');
    return `
      <article class="card reveal" style="--d:${(i % 2) * 90}ms" data-id="${esc(p.id)}">
        <div class="shot">
          <div class="bar"><i></i><i></i><i></i><span class="url">${esc(NM.shownDomain(p))}</span></div>
          <div class="view${p.cover ? ' ready' : ''}">${thumb}</div>
        </div>
        <div class="card-body">
          <span class="meta">${meta}</span>
          <h3><a class="stretch" href="${esc(NM.previewUrl(p))}">${esc(p.name)}</a></h3>
          <button class="card-money" type="button" data-id="${esc(p.id)}" hidden></button>
          ${p.description ? `<p>${esc(pick(p.description))}</p>` : ''}
          ${(p.tech || []).length ? `<div class="tech">${p.tech.map(x => `<span class="chip">${esc(x)}</span>`).join('')}</div>` : ''}
          <span class="visit" aria-hidden="true">${esc(t('work.open'))}<span class="badge">${arrow}</span></span>
        </div>
      </article>`;
  }

  function renderCards() {
    const list = sorted().filter(matches);
    const box = $('cards');
    box.classList.toggle('single', list.length === 1);
    box.innerHTML = list.map(card).join('');
    $('empty').hidden = list.length > 0;
    NM.observeReveal(box);
    box.querySelectorAll('.card').forEach(setupThumb);
    fillMoney();
  }

  /* Once the money is unlocked, each card shows what the project brought in */
  function fillMoney() {
    document.querySelectorAll('.card-money').forEach(b => {
      const m = window.Money && Money.project(b.dataset.id);
      b.hidden = !m;
      if (!m) return;
      const part = (v, k, cls) => `<span class="${cls}"><b>${esc(NM.money(v))}</b> ${esc(t(k))}</span>`;
      b.innerHTML = m.any
        ? [part(m.collected, 'p.collected', ''), part(m.profit, 'p.profit', 'pos'),
           m.pending ? part(m.pending, 'p.pending', 'neg') : '',
           m.monthly ? `<span><b>${esc(NM.money(m.monthly))}</b>${esc(t('p.month'))}</span>` : ''].join('')
        : `<span>${esc(t('card.nomoney'))}</span>`;
    });
  }

  /* Live thumbnails: a 1440×900 page scaled down to the card, loaded when it comes near the screen */
  const sizer = 'ResizeObserver' in window ? new ResizeObserver(entries => entries.forEach(e => fit(e.target))) : null;
  function fit(view) {
    const f = view.querySelector('iframe');
    if (f) f.style.transform = `scale(${view.clientWidth / 1440})`;
  }
  const loader = 'IntersectionObserver' in window
    ? new IntersectionObserver(entries => entries.forEach(e => {
        if (!e.isIntersecting) return;
        loader.unobserve(e.target);
        load(e.target);
      }), { rootMargin: '400px 0px' })
    : null;
  function load(view) {
    const f = view.querySelector('iframe');
    if (!f || f.src) return;
    f.addEventListener('load', () => {
      /* No scrollbar in the thumbnail (same-origin sites only) */
      try {
        const s = f.contentDocument.createElement('style');
        s.textContent = 'html{scrollbar-width:none}html::-webkit-scrollbar{display:none}';
        f.contentDocument.head.appendChild(s);
      } catch {}
      f.classList.add('loaded');
      view.classList.add('ready');
    }, { once: true });
    f.src = f.dataset.src;
  }

  function setupThumb(cardEl) {
    const view = cardEl.querySelector('.view');
    const f = view.querySelector('iframe');
    if (!f) return;
    fit(view);
    if (sizer) sizer.observe(view);
    loader ? loader.observe(view) : load(view);

    /* On hover, slowly scroll the thumbnail's page down like someone browsing it (same-origin sites only) */
    let anim = 0;
    const doc = () => { try { return f.contentDocument && f.contentDocument.scrollingElement; } catch { return null; } };
    function scrollTo(target, ms) {
      const el = doc();
      if (!el) return;
      cancelAnimationFrame(anim);
      if (reduceMotion) { el.scrollTop = target; return; }
      const from = el.scrollTop, start = performance.now();
      const ease = x => x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
      const step = now => {
        const k = Math.min(1, (now - start) / ms);
        el.scrollTop = from + (target - from) * ease(k);
        if (k < 1) anim = requestAnimationFrame(step);
      };
      anim = requestAnimationFrame(step);
    }
    cardEl.addEventListener('mouseenter', () => {
      const el = doc();
      if (!el) return;
      const max = Math.min(el.scrollHeight - el.clientHeight, 2200);
      if (max > 0) scrollTo(max, Math.max(2500, max * 3));
    });
    cardEl.addEventListener('mouseleave', () => scrollTo(0, 900));
  }

  function render() { renderStats(); renderFilters(); renderCards(); }

  function setFilter(k) {
    filter = k;
    const q = new URLSearchParams(location.search);
    k === 'all' ? q.delete('cat') : q.set('cat', k);
    history.replaceState(null, '', (q.toString() ? `?${q}` : location.pathname) + location.hash);
    $('filters').querySelectorAll('.filter').forEach(x => x.setAttribute('aria-selected', x.dataset.k === k));
    renderCards();
  }

  document.addEventListener('DOMContentLoaded', () => {
    render();
    NM.onLang(render);

    $('filters').addEventListener('click', e => {
      const b = e.target.closest('.filter');
      if (b) setFilter(b.dataset.k);
    });
    /* The status pill on a card moves the project to another category */
    $('cards').addEventListener('click', e => {
      const mb = e.target.closest('.card-money');
      if (mb) { Money.open(mb.dataset.id); return; }
      const b = e.target.closest('.move');
      if (!b) return;
      e.preventDefault();
      Base.statusMenu(b, projects.find(x => x.id === b.closest('.card').dataset.id));
    });
    document.addEventListener('nm:status', render);
    document.addEventListener('nm:money', fillMoney);
    /* Signed in: the newest categories come straight from the repo */
    Base.refreshStatus().then(changed => { if (changed) render(); });
    $('search').addEventListener('input', e => { query = e.target.value.trim().toLowerCase(); renderCards(); });
  });
})();
