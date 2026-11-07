(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const money = (n) => n.toFixed(2).replace('.', ',');

  /* ---------- Open now (Sofia time) ---------- */
  const HOURS = { 0: [540, 1290], 1: [540, 1020], 2: [540, 1020], 3: [540, 1020], 4: [540, 1020], 5: [540, 1020], 6: [540, 1290] };
  const DAYS = ['Неделя', 'Понеделник', 'Вторник', 'Сряда', 'Четвъртък', 'Петък', 'Събота'];
  const fmt = (m) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;

  function sofiaNow() {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Sofia', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date());
    const get = (t) => parts.find((p) => p.type === t).value;
    const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
    return { day, mins: Number(get('hour')) * 60 + Number(get('minute')) };
  }

  function updateStatus() {
    const el = document.querySelector('[data-status]');
    const text = document.querySelector('[data-status-text]');
    if (!el || !text) return;
    const { day, mins } = sofiaNow();
    const [open, close] = HOURS[day];
    const weekend = day === 0 || day === 6;
    let msg;
    if (mins >= open && mins < close) {
      el.classList.add('is-open');
      msg = `Отворено сега, до ${fmt(close)}`;
      if (weekend && mins >= 960 && mins < 1140) msg += ' · коктейли 2 за 1 до 19:00';
      else if (close - mins <= 45) msg = `Отворено още ${close - mins} мин.`;
    } else {
      el.classList.remove('is-open');
      msg = mins < open ? `Затворено, отваряме днес в ${fmt(open)}` : `Затворено, отваряме утре в ${fmt(HOURS[(day + 1) % 7][0])}`;
    }
    text.textContent = msg;

    document.querySelectorAll('[data-hours] tr').forEach((tr) => {
      const d = Number(tr.dataset.day);
      tr.classList.toggle('is-today', d === day);
      tr.querySelector('th').textContent = DAYS[d] + (d === day ? ' (днес)' : '');
    });
  }
  updateStatus();
  setInterval(updateStatus, 60_000);

  /* ---------- Split headings into masked words ---------- */
  document.querySelectorAll('[data-split]').forEach((h) => {
    const words = h.textContent.trim().split(/\s+/);
    h.setAttribute('aria-label', h.textContent.trim());
    h.innerHTML = words.map((w, i) => `<span class="w" aria-hidden="true"><span style="--i:${i}">${w}</span></span>`).join(' ');
  });

  /* ---------- Footer letters ---------- */
  document.querySelectorAll('[data-letters]').forEach((el) => {
    el.innerHTML = [...el.textContent].map((c, i) => `<span class="ch" style="--i:${i}">${c}</span>`).join('');
  });

  /* ---------- Categories ---------- */
  const cats = [...document.querySelectorAll('.cat')];
  const figs = [...document.querySelectorAll('.cats__figure img')];
  const wide = () => window.matchMedia('(min-width: 861px)').matches;
  function showCat(i) {
    cats.forEach((c, j) => {
      const on = i === j;
      c.classList.toggle('is-active', on);
      c.querySelector('.cat__btn').setAttribute('aria-expanded', String(on));
    });
    figs.forEach((f, j) => f.classList.toggle('is-active', i === j));
  }
  cats.forEach((c, i) => {
    const btn = c.querySelector('.cat__btn');
    btn.addEventListener('click', () => showCat(i));
    btn.addEventListener('mouseenter', () => { if (wide()) showCat(i); });
    btn.addEventListener('focus', () => { if (wide()) showCat(i); });
  });

  /* ---------- Menu tabs ---------- */
  const tabs = [...document.querySelectorAll('[data-tabs] [role="tab"]')];
  const panels = tabs.map((t) => document.getElementById(t.getAttribute('aria-controls')));
  panels.forEach((p) => p.querySelectorAll('.item').forEach((it, i) => it.style.setProperty('--i', Math.min(i, 12))));
  function selectTab(i, focus) {
    tabs.forEach((t, j) => {
      const on = i === j;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      panels[j].hidden = !on;
      panels[j].classList.remove('is-in');
    });
    void panels[i].offsetWidth;
    panels[i].classList.add('is-in');
    if (focus) tabs[i].focus();
  }
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => selectTab(i));
    t.addEventListener('keydown', (e) => {
      const keys = { ArrowRight: 1, ArrowLeft: -1 };
      if (e.key in keys) { e.preventDefault(); selectTab((i + keys[e.key] + tabs.length) % tabs.length, true); }
      if (e.key === 'Home') { e.preventDefault(); selectTab(0, true); }
      if (e.key === 'End') { e.preventDefault(); selectTab(tabs.length - 1, true); }
    });
  });
  if (tabs.length) selectTab(0);

  /* ---------- Build your own plate ---------- */
  const form = document.querySelector('[data-builder]');
  if (form) {
    const TOAST = 2.0, EGG = 1.75, GF = 1.65, DEFAULT_EGGS = 2;
    const totalEl = document.querySelector('[data-total]');
    const summaryEl = document.querySelector('[data-summary]');
    const eggsEl = form.querySelector('[data-eggs]');
    const eggStyle = form.querySelector('[data-egg-style]');
    const minus = form.querySelector('[data-step="-1"]');
    const plus = form.querySelector('[data-step="1"]');
    let eggs = DEFAULT_EGGS;
    let shown = 7.25;
    let raf;

    const EGG_WORDS = {
      poached: ['поширано яйце', 'поширани яйца'],
      fried: ['яйце на очи', 'яйца на очи'],
      scrambled: ['бъркано яйце', 'бъркани яйца']
    };
    const list = (arr) => arr.length <= 1 ? arr.join('') : `${arr.slice(0, -1).join(', ')} и ${arr[arr.length - 1]}`;

    function tween(to) {
      cancelAnimationFrame(raf);
      if (reduce) { shown = to; totalEl.textContent = money(to); return; }
      const from = shown, start = performance.now(), dur = 420;
      const step = (now) => {
        const t = Math.min((now - start) / dur, 1);
        const e = 1 - Math.pow(1 - t, 3);
        shown = from + (to - from) * e;
        totalEl.textContent = money(shown);
        if (t < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
      const box = totalEl.parentElement;
      box.classList.remove('bump'); void box.offsetWidth; box.classList.add('bump');
    }

    function render(animate = true) {
      const toast = form.querySelector('input[name="toast"]:checked').value;
      const gf = form.querySelector('input[name="gf"]').checked;
      const extras = [...form.querySelectorAll('input[name="x"]:checked')];
      const style = form.querySelector('input[name="eggstyle"]:checked').value;

      let total = TOAST + eggs * EGG + (gf ? GF : 0);
      extras.forEach((x) => { total += Number(x.dataset.price); });

      const base = `${gf ? 'Безглутенов тост' : 'Тост от квасен хляб'} ${toast}`;
      const parts = [];
      if (eggs) parts.push(`${eggs} ${EGG_WORDS[style][eggs > 1 ? 1 : 0]}`);
      extras.forEach((x) => parts.push(x.value));

      summaryEl.textContent = base + (parts.length ? `, ${list(parts)}.` : '.');
      eggsEl.textContent = eggs;
      minus.disabled = eggs === 0;
      plus.disabled = eggs === 4;
      eggStyle.classList.toggle('is-off', eggs === 0);

      if (animate) tween(total); else { shown = total; totalEl.textContent = money(total); }
    }

    form.addEventListener('change', () => render());
    form.addEventListener('submit', (e) => e.preventDefault());
    minus.addEventListener('click', () => { eggs = Math.max(0, eggs - 1); render(); });
    plus.addEventListener('click', () => { eggs = Math.min(4, eggs + 1); render(); });
    document.querySelector('[data-reset]').addEventListener('click', () => {
      form.reset();
      eggs = DEFAULT_EGGS;
      render();
    });
    render(false);
  }

  /* ---------- Back to top ---------- */
  document.querySelectorAll('[data-totop]').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
      const mark = document.querySelector('.wordmark');
      if (mark) mark.focus({ preventScroll: true });
    });
  });

  /* ---------- Count-up ---------- */
  function countUp(el) {
    const to = Number(el.dataset.count);
    if (reduce) return;
    const start = performance.now(), dur = 1400;
    const step = (now) => {
      const t = Math.min((now - start) / dur, 1);
      const e = 1 - Math.pow(1 - t, 4);
      el.textContent = (to * e).toFixed(1).replace('.', ',');
      if (t < 1) requestAnimationFrame(step);
    };
    el.textContent = '0,0';
    requestAnimationFrame(step);
  }

  /* ---------- Entrances ---------- */
  const groups = new Map();
  document.querySelectorAll('.reveal').forEach((el) => {
    const parent = el.closest('section, footer, ul') || document.body;
    const n = groups.get(parent) || 0;
    el.style.setProperty('--d', `${Math.min(n, 7) * 0.08}s`);
    groups.set(parent, n + 1);
  });
  const watched = document.querySelectorAll('.reveal, [data-split], .clip, [data-letters], [data-count]');
  if ('IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        if (e.target.matches('[data-count]')) countUp(e.target);
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });
    watched.forEach((el) => io.observe(el));
  } else {
    watched.forEach((el) => el.classList.add('is-in'));
  }

  /* ---------- Scroll-linked: hero drift, photo strip, hiding bar ---------- */
  const heroImg = document.querySelector('.hero__media img');
  const strip = document.querySelector('[data-strip]');
  const track = strip && strip.querySelector('.strip__track');
  const bar = document.querySelector('[data-bar]');
  let lastY = window.scrollY;
  let ticking = false;

  function onScroll() {
    const y = window.scrollY;
    const vh = window.innerHeight;

    if (!reduce && heroImg) {
      const r = heroImg.parentElement.getBoundingClientRect();
      if (r.bottom > 0) {
        const p = Math.min(Math.max(-r.top / r.height, -1), 1);
        heroImg.style.transform = `translate3d(0, ${(-7 + p * 12).toFixed(2)}%, 0)`;
      }
    }

    if (!reduce && track) {
      const r = strip.getBoundingClientRect();
      if (r.top < vh && r.bottom > 0) {
        const p = (vh - r.top) / (vh + r.height);
        const max = Math.max(track.scrollWidth - window.innerWidth, 0);
        track.style.transform = `translate3d(${(-p * max).toFixed(1)}px, 0, 0)`;
      }
    }

    if (bar) {
      const down = y > lastY && y > 400;
      bar.classList.toggle('is-hidden', down);
      lastY = y;
    }
    ticking = false;
  }
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();
})();
