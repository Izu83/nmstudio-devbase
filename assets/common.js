/* Shared by the showcase and the preview: language, project helpers, header and reveal effects. */
(() => {
  const html = document.documentElement;
  html.classList.add('js');

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch {} }
  };

  const fromUrl = new URLSearchParams(location.search).get('lang');
  let lang = fromUrl === 'en' || fromUrl === 'bg' ? fromUrl : (store.get('nm-devbase-lang') || 'bg');

  const dict = {
    bg: {
      'nav.work': 'Проекти',
      'nav.studio': 'nmstudio.info',
      'lang.switch': 'EN: Switch to English',
      'hero.title.1': 'Всичките ни проекти,',
      'hero.title.2': 'на едно място.',
      'hero.sub': 'Нашата база с проекти. Всеки сайт работи тук: отворете го на компютър, таблет или телефон и вижте бележките към него.',
      'stats.projects': 'проекта',
      'stats.project': 'проект',
      'stats.live': 'завършени',
      'stats.progress': 'в работа',
      'stats.demo': 'демо',
      'nav.money': 'Пари',
      'money.title': 'Пари',
      'money.year': 'Година',
      'card.nomoney': 'Добави плащане',
      'tab.all': 'Проекти',
      'tab.live': 'Завършени',
      'tab.progress': 'В работа',
      'tab.demo': 'Демо',
      'move.title': 'Премести в',
      'move.login': 'Влезте в секция „Пари“ (най-долу), за да местите проекти.',
      'move.loginBtn': 'Вход',
      'move.saved': 'Преместено. Сайтът се обновява до минута.',
      'move.error': 'Не успях да запиша: ',
      'stats.updated': 'последна промяна',
      'status.live': 'Завършен',
      'status.progress': 'В работа',
      'status.demo': 'Демо',
      'status.archived': 'Архив',
      'footer.internal': 'само за нас',
      'd.client': 'Клиент',
      'd.by': 'Направен от',
      'd.started': 'Започнат',
      'd.updated': 'Последна промяна',
      'd.notes': 'Бележки',
      'd.run': 'Стартиране локално',
      'd.copy': 'Копирай',
      'd.copied': 'Копирано',
      'd.folder': 'Папка',
      'work.title': 'Проекти',
      'work.all': 'Всички',
      'work.search': 'Търсене…',
      'work.empty': 'Няма проекти тук.',
      'work.open': 'Разгледайте',
      'footer.back': 'Към nmstudio.info',
      'pv.back': 'Всички проекти',
      'pv.desktop': 'Компютър',
      'pv.tablet': 'Таблет',
      'pv.mobile': 'Телефон',
      'pv.reload': 'Презареди',
      'pv.newtab': 'Отвори в нов раздел',
      'pv.info': 'За проекта',
      'pv.page': 'Страница',
      'pv.prev': 'Предишен проект',
      'pv.next': 'Следващ проект',
      'pv.live': 'Истинският сайт',
      'pv.repo': 'Код',
      'pv.close': 'Затвори',
      'pv.notfound': 'Няма такъв проект.',
      'pv.fullscreen': 'Цял екран'
    },
    en: {
      'nav.work': 'Projects',
      'nav.studio': 'nmstudio.info',
      'lang.switch': 'BG: Превключи на български',
      'hero.title.1': 'All our projects,',
      'hero.title.2': 'in one place.',
      'hero.sub': 'Our project base. Every site runs right here: open it on desktop, tablet or phone and read the notes that go with it.',
      'stats.projects': 'projects',
      'stats.project': 'project',
      'stats.live': 'finished',
      'stats.progress': 'in progress',
      'stats.demo': 'demo',
      'nav.money': 'Money',
      'money.title': 'Money',
      'money.year': 'Year',
      'card.nomoney': 'Add a payment',
      'tab.all': 'Projects',
      'tab.live': 'Finished',
      'tab.progress': 'In progress',
      'tab.demo': 'Demo',
      'move.title': 'Move to',
      'move.login': 'Sign in in the Money section (at the bottom) to move projects.',
      'move.loginBtn': 'Sign in',
      'move.saved': 'Moved. The site updates within a minute.',
      'move.error': "Couldn't save: ",
      'stats.updated': 'last change',
      'status.live': 'Live',
      'status.progress': 'In progress',
      'status.demo': 'Demo',
      'status.archived': 'Archived',
      'footer.internal': 'just for us',
      'd.client': 'Client',
      'd.by': 'Built by',
      'd.started': 'Started',
      'd.updated': 'Last change',
      'd.notes': 'Notes',
      'd.run': 'Run locally',
      'd.copy': 'Copy',
      'd.copied': 'Copied',
      'd.folder': 'Folder',
      'work.title': 'Projects',
      'work.all': 'All',
      'work.search': 'Search…',
      'work.empty': 'No projects here.',
      'work.open': 'Explore',
      'footer.back': 'To nmstudio.info',
      'pv.back': 'All projects',
      'pv.desktop': 'Desktop',
      'pv.tablet': 'Tablet',
      'pv.mobile': 'Phone',
      'pv.reload': 'Reload',
      'pv.newtab': 'Open in a new tab',
      'pv.info': 'About the project',
      'pv.page': 'Page',
      'pv.prev': 'Previous project',
      'pv.next': 'Next project',
      'pv.live': 'Live site',
      'pv.repo': 'Code',
      'pv.close': 'Close',
      'pv.notfound': 'No such project.',
      'pv.fullscreen': 'Full screen'
    }
  };

  /* Pages can add their own words: NM.extend({ bg: {...}, en: {...} }) */
  const extend = more => { for (const l in more) Object.assign(dict[l] || (dict[l] = {}), more[l]); };

  const t = key => (dict[lang] && dict[lang][key]) || dict.bg[key] || key;
  /* A project text field: plain string or { bg, en } */
  const pick = v => (v && typeof v === 'object') ? (v[lang] || v.bg || v.en || '') : (v || '');

  const listeners = [];
  function apply() {
    html.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      el.title = t(el.dataset.i18nTitle);
      el.setAttribute('aria-label', t(el.dataset.i18nTitle));
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => { el.placeholder = t(el.dataset.i18nPlaceholder); });
    const btn = document.getElementById('lang');
    if (btn) { btn.textContent = lang === 'bg' ? 'EN' : 'BG'; btn.setAttribute('aria-label', t('lang.switch')); }
    listeners.forEach(fn => fn(lang));
  }
  function setLang(next) { lang = next; store.set('nm-devbase-lang', lang); apply(); }

  /* Where the showcase's root folder is, from the page's data-root ("" or "../") */
  const root = new URL(html.dataset.root || './', location.href);
  const projects = (window.PROJECTS || []).filter(p => p && p.id && p.path);
  const isExternal = p => /^https?:\/\//i.test(p.path);
  const siteUrl = (p, page = '') => new URL(page || '', new URL(p.path, root)).href;
  const shownDomain = p => {
    const src = p.domain || p.live || (isExternal(p) ? p.path : '');
    if (!src) return p.path.replace(/^sites\//, '').replace(/\/$/, '').toLowerCase();
    return src.replace(/^https?:\/\//, '').replace(/\/$/, '');
  };
  const previewUrl = p => new URL(`preview/?p=${encodeURIComponent(p.id)}`, root).href;

  document.addEventListener('DOMContentLoaded', () => {
    apply();
    const btn = document.getElementById('lang');
    if (btn) btn.addEventListener('click', () => setLang(lang === 'bg' ? 'en' : 'bg'));

    const header = document.querySelector('.site-header');
    if (header) {
      const onScroll = () => header.classList.toggle('scrolled', scrollY > 8);
      addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }
    NM.observeReveal(document);
  });

  const io = 'IntersectionObserver' in window
    ? new IntersectionObserver(entries => entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      }), { rootMargin: '0px 0px -8% 0px' })
    : null;

  window.NM = {
    t, pick, store, projects, extend, setLang: next => setLang(next), siteUrl, previewUrl, shownDomain, isExternal,
    get lang() { return lang; },
    date(iso) {
      if (!iso) return '';
      const d = new Date(iso + 'T12:00:00');
      return isNaN(d) ? iso : d.toLocaleDateString(lang === 'bg' ? 'bg-BG' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    },
    STATUSES: ['live', 'progress', 'demo'],
    /* A project's category: what was saved from the base (store/status.js) wins over projects.js */
    status(p) {
      const saved = (window.PROJECT_STATUS || {})[p.id];
      const s = saved || p.status;
      return NM.STATUSES.includes(s) ? s : 'live';
    },
    root,
    money(n) {
      const v = Math.round((+n || 0) * 100) / 100;
      const digits = Number.isInteger(v) ? 0 : 2;     // 1000 €, but 360,50 €
      return new Intl.NumberFormat(lang === 'bg' ? 'bg-BG' : 'en-GB', { style: 'currency', currency: 'EUR', minimumFractionDigits: digits, maximumFractionDigits: digits })
        .format(v);
    },
    apply,
    onLang(fn) { listeners.push(fn); },
    observeReveal(scope) {
      scope.querySelectorAll('.reveal:not(.in)').forEach(el => io ? io.observe(el) : el.classList.add('in'));
    },
    esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  };
})();
