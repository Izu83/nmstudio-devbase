/* Our project base. Every project we make gets an entry here.

   To add a site: copy its folder into sites/ and add an entry below (newest first).
   Text can be a plain string, or { bg: "...", en: "..." } for both languages.

   id        short name used in the preview address (preview/?p=<id>)
   name      the project's name
   path      the site's folder, relative to this file (ends with /),
             or a full https:// address if it's hosted somewhere else
   status    'live'      finished (Завършени)
             'progress'  we're still working on it (В работа)
             'demo'      a demo for the business to see (Демо)
             This is only the starting category: once a project is moved with the button
             on its card, store/status.js wins.
   client    who it's for, and how to reach them (optional)
   by        who of us built it
   started   'YYYY-MM-DD' (optional)
   updated   'YYYY-MM-DD', last change (optional)
   category  what kind of site it is
   description  one or two sentences
   tech      a few short labels
   pages     pages for the preview's page picker (path relative to `path`)
   notes     anything worth remembering: passwords live where, what's left, quirks (optional)
   run       how to run it locally (optional)
   live      the real address (optional)
   repo      the source code (optional)
   domain    the address shown in the card's browser bar (optional; defaults to `live`)
   cover     a screenshot to use instead of the live thumbnail (optional)

   This site is public on GitHub Pages: never put passwords or client private data here.
*/
window.PROJECTS = [
  {
    id: 'sunnycomplex',
    name: 'Sunny Complex',
    path: 'sites/SunnyComplex/',
    status: 'progress',
    client: 'Sunny Complex, Радомир',
    by: ['Izu83'],
    started: '2026-11-02',
    updated: '2026-11-05',
    category: { bg: 'Басейн и ресторант', en: 'Pool & restaurant' },
    description: {
      bg: 'Басейн и ресторант в Радомир: меню с доставка до дома, резервация на маса върху плана на залата, админ панел за резервациите и страница за доставките.',
      en: 'Pool and restaurant in Radomir: a menu with home delivery, table booking on the floor plan, an admin panel for bookings and a page for deliveries.'
    },
    tech: ['HTML', 'CSS', 'JavaScript', 'Python'],
    pages: [
      { path: '', label: { bg: 'Начало', en: 'Home' } },
      { path: 'menu/', label: { bg: 'Меню и доставка', en: 'Menu & delivery' } },
      { path: 'reservation/', label: { bg: 'Резервация', en: 'Booking' } },
      { path: 'privacy/', label: { bg: 'Поверителност', en: 'Privacy' } },
      { path: 'admin/', label: { bg: 'Админ (персонал)', en: 'Admin (staff)' } },
      { path: 'deliveries/', label: { bg: 'Доставки (персонал)', en: 'Deliveries (staff)' } }
    ],
    notes: {
      bg: 'Тук работи в демо режим: резервациите и поръчките се пазят само в браузъра, админът е без парола. С python server.py са истински и паролата е в data/admin-password.txt (не се качва). При смяна на домейна: og:url и og:image в index, menu, reservation и privacy.',
      en: 'Runs in demo mode here: bookings and orders stay in the browser and the admin has no password. With python server.py they are real, and the password is in data/admin-password.txt (never uploaded). When the domain changes: og:url and og:image in index, menu, reservation and privacy.'
    },
    run: 'python server.py 5173 --open',
    live: 'https://izu83.github.io/SunnyComplex/',
    repo: 'https://github.com/Izu83/SunnyComplex'
  }
];
