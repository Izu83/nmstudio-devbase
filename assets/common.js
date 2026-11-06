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
      'work.empty': 'Няма проекти, които отговарят.',
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
      'work.empty': 'No projects match.',
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
    t, pick, store, projects, siteUrl, previewUrl, shownDomain, isExternal,
    get lang() { return lang; },
    date(iso) {
      if (!iso) return '';
      const d = new Date(iso + 'T12:00:00');
      return isNaN(d) ? iso : d.toLocaleDateString(lang === 'bg' ? 'bg-BG' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    },
    STATUSES: ['progress', 'live', 'demo', 'archived'],
    onLang(fn) { listeners.push(fn); },
    observeReveal(scope) {
      scope.querySelectorAll('.reveal:not(.in)').forEach(el => io ? io.observe(el) : el.classList.add('in'));
    },
    esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  };
})();
