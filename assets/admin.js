/* The admin panel: what each project brings in, how it's split, maintenance and anything still to be paid.
   The data is encrypted in the browser and saved to the repo (store/finance.enc.json). */
(() => {
  const { t, pick, esc, projects } = NM;
  const $ = id => document.getElementById(id);
  const app = $('app');

  NM.extend({
    bg: {
      'a.title': 'Админ',
      'a.signin': 'Вход',
      'a.signin.sub': 'Нужен е GitHub токен, който може да записва в репото. Въвежда се веднъж на устройство и остава само в този браузър.',
      'a.token': 'GitHub токен',
      'a.token.how': 'Как да направя токен?',
      'a.token.help1': 'Собственикът на репото: <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">нов fine-grained токен</a> → Repository access: само <b>{repo}</b> → Permissions: <b>Contents: Read and write</b>.',
      'a.token.help2': 'Другият (сътрудник в репото): <a href="https://github.com/settings/tokens/new?scopes=public_repo&description=NMStudio%20Devbase" target="_blank" rel="noopener">classic токен</a> с отметнато <b>public_repo</b>.',
      'a.go': 'Влез',
      'a.bad.token': 'Този токен не може да записва в {repo}.',
      'a.bad.net': 'Няма връзка с GitHub: ',
      'a.unlock': 'Отключи парите',
      'a.unlock.sub': 'Данните за парите са криптирани. Въведете общата ни парола.',
      'a.pass': 'Парола',
      'a.pass2': 'Паролата отново',
      'a.remember': 'Запомни паролата на това устройство',
      'a.open': 'Отключи',
      'a.bad.pass': 'Грешна парола.',
      'a.create': 'Първо пускане',
      'a.create.sub': 'Още няма данни за пари. Изберете обща парола: с нея се криптират данните, преди да отидат в репото. Без нея не могат да се прочетат, затова не я губете.',
      'a.names': 'Нашите имена',
      'a.name1': 'Първи',
      'a.name2': 'Втори',
      'a.make': 'Създай',
      'a.bad.match': 'Паролите не съвпадат.',
      'a.bad.short': 'Поне 8 знака.',
      'a.loading': 'Зареждане…',
      'a.signout': 'Изход',
      'a.saved': 'Записано',
      'a.saving': 'Записва…',
      'a.dirty': 'Промени…',
      'a.error': 'Не е записано',
      'a.all.years': 'Всички години',
      's.collected': 'Събрани',
      's.profit': 'Наша печалба',
      's.pending': 'Чакат плащане',
      's.ours': 'наш дял',
      's.maint': 'Поддръжка на месец',
      's.year': 'на година',
      's.others': 'Външни',
      'due.title': 'Чакат плащане',
      'due.none': 'Всичко е платено.',
      'due.pay': 'Платено',
      'due.overdue': 'просрочено',
      'due.nodate': 'без срок',
      'p.title': 'По проекти',
      'p.other': 'Други приходи',
      'p.other.sub': 'Пари, които не са от определен проект.',
      'p.collected': 'събрани',
      'p.profit': 'печалба',
      'p.pending': 'чакат',
      'p.month': '/мес',
      'p.yearly': '/год',
      'p.split': 'Разпределение',
      'p.split.sub': 'Колко процента от всяко плащане взима всеки. Можете да добавите и външен човек.',
      'p.split.total': 'Общо',
      'p.split.bad': 'трябва да е 100%',
      'p.addPerson': '+ Човек',
      'p.who': 'Име',
      'p.items': 'Плащания',
      'p.noitems': 'Още няма нищо. Добавете изработката, поддръжка или друго плащане.',
      'add.build': '+ Изработка',
      'add.maint': '+ Поддръжка',
      'add.other': '+ Друго',
      'i.build': 'Изработка',
      'i.maint': 'Поддръжка',
      'i.label': 'Какво е',
      'i.label.ph': 'напр. домейн, снимки, нова страница',
      'i.amount': 'Сума €',
      'i.kind': 'Плаща се',
      'i.once': 'Еднократно',
      'i.month': 'Всеки месец',
      'i.year': 'Всяка година',
      'i.due': 'Срок',
      'i.start': 'От',
      'i.end': 'До (по избор)',
      'i.paid': 'Платено',
      'i.unpaid': 'Не е платено',
      'i.markPaid': 'Маркирай платено',
      'i.del': 'Изтрий',
      'i.del.ask': 'Да изтрия ли „{x}“?',
      'i.ownSplit': 'Друго разпределение за това плащане',
      'i.periods': 'Периоди (натиснете, за да маркирате платено)',
      'i.paidOf': '{a} от {b} платени',
      'i.owes': 'дължи {x}',
      'i.next': 'следващо {x}',
      'set.title': 'Настройки',
      'set.people': 'Ние двамата (за печалбата)',
      'set.people.sub': 'Делът на тези хора е „наша печалба“. Всички останали в разпределенията са външни.',
      'set.pass': 'Смяна на паролата',
      'set.pass.btn': 'Смени паролата',
      'set.pass.done': 'Паролата е сменена. Кажете я и на другия.',
      'set.who': 'Влезли сте като {x}.',
      'set.repo': 'Данните са в {repo}, криптирани.'
    },
    en: {
      'a.title': 'Admin',
      'a.signin': 'Sign in',
      'a.signin.sub': 'You need a GitHub token that can write to the repo. You enter it once per device and it stays only in this browser.',
      'a.token': 'GitHub token',
      'a.token.how': 'How do I make a token?',
      'a.token.help1': 'The repo owner: <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">new fine-grained token</a> → Repository access: only <b>{repo}</b> → Permissions: <b>Contents: Read and write</b>.',
      'a.token.help2': 'The other one (a collaborator on the repo): <a href="https://github.com/settings/tokens/new?scopes=public_repo&description=NMStudio%20Devbase" target="_blank" rel="noopener">classic token</a> with <b>public_repo</b> ticked.',
      'a.go': 'Sign in',
      'a.bad.token': "This token can't write to {repo}.",
      'a.bad.net': "Can't reach GitHub: ",
      'a.unlock': 'Unlock the money',
      'a.unlock.sub': 'The money data is encrypted. Enter our shared password.',
      'a.pass': 'Password',
      'a.pass2': 'Password again',
      'a.remember': 'Remember the password on this device',
      'a.open': 'Unlock',
      'a.bad.pass': 'Wrong password.',
      'a.create': 'First start',
      'a.create.sub': "There's no money data yet. Choose a shared password: the data is encrypted with it before it goes to the repo. Without it the data can't be read, so don't lose it.",
      'a.names': 'Our names',
      'a.name1': 'First',
      'a.name2': 'Second',
      'a.make': 'Create',
      'a.bad.match': "The passwords don't match.",
      'a.bad.short': 'At least 8 characters.',
      'a.loading': 'Loading…',
      'a.signout': 'Sign out',
      'a.saved': 'Saved',
      'a.saving': 'Saving…',
      'a.dirty': 'Changes…',
      'a.error': 'Not saved',
      'a.all.years': 'All years',
      's.collected': 'Collected',
      's.profit': 'Our profit',
      's.pending': 'To be paid',
      's.ours': 'our part',
      's.maint': 'Maintenance a month',
      's.year': 'a year',
      's.others': 'Others',
      'due.title': 'To be paid',
      'due.none': 'Everything is paid.',
      'due.pay': 'Paid',
      'due.overdue': 'overdue',
      'due.nodate': 'no due date',
      'p.title': 'By project',
      'p.other': 'Other income',
      'p.other.sub': "Money that isn't from a particular project.",
      'p.collected': 'collected',
      'p.profit': 'profit',
      'p.pending': 'to be paid',
      'p.month': '/mo',
      'p.yearly': '/yr',
      'p.split': 'Split',
      'p.split.sub': 'What percentage of every payment each person takes. You can add someone from outside too.',
      'p.split.total': 'Total',
      'p.split.bad': 'must be 100%',
      'p.addPerson': '+ Person',
      'p.who': 'Name',
      'p.items': 'Payments',
      'p.noitems': 'Nothing yet. Add the build, maintenance or another payment.',
      'add.build': '+ Build',
      'add.maint': '+ Maintenance',
      'add.other': '+ Other',
      'i.build': 'Build',
      'i.maint': 'Maintenance',
      'i.label': 'What it is',
      'i.label.ph': 'e.g. domain, photos, a new page',
      'i.amount': 'Amount €',
      'i.kind': 'Paid',
      'i.once': 'Once',
      'i.month': 'Every month',
      'i.year': 'Every year',
      'i.due': 'Due',
      'i.start': 'From',
      'i.end': 'Until (optional)',
      'i.paid': 'Paid',
      'i.unpaid': 'Not paid',
      'i.markPaid': 'Mark as paid',
      'i.del': 'Delete',
      'i.del.ask': 'Delete "{x}"?',
      'i.ownSplit': 'A different split for this payment',
      'i.periods': 'Periods (click to mark as paid)',
      'i.paidOf': '{a} of {b} paid',
      'i.owes': 'owes {x}',
      'i.next': 'next {x}',
      'set.title': 'Settings',
      'set.people': 'The two of us (for the profit)',
      'set.people.sub': 'What these people take is "our profit". Everyone else in a split counts as from outside.',
      'set.pass': 'Change the password',
      'set.pass.btn': 'Change password',
      'set.pass.done': 'Password changed. Tell the other one too.',
      'set.who': 'Signed in as {x}.',
      'set.repo': 'The data is in {repo}, encrypted.'
    }
  });
  const tf = (k, vars) => t(k).replace(/\{(\w+)\}/g, (_, v) => vars[v] ?? '');
  const repoName = `${Base.REPO.owner}/${Base.REPO.name}`;

  /* ---------- Dates ---------- */
  const today = () => new Date().toLocaleDateString('sv-SE');      // YYYY-MM-DD, local time
  const loc = () => NM.lang === 'bg' ? 'bg-BG' : 'en-GB';
  const short = iso => iso ? new Date(iso + 'T12:00:00').toLocaleDateString(loc(), { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\s*г\.$/, '') : '';
  const BG_MONTHS = ['яну', 'фев', 'мар', 'апр', 'май', 'юни', 'юли', 'авг', 'сеп', 'окт', 'ное', 'дек'];
  const monthLabel = iso => (NM.lang === 'bg' ? BG_MONTHS[+iso.slice(5, 7) - 1]
    : new Date(iso + 'T12:00:00').toLocaleDateString('en-GB', { month: 'short' })) + ' ' + iso.slice(2, 4);
  function addMonths(iso, n) {
    const [y, m, d] = iso.split('-').map(Number);
    const x = new Date(Date.UTC(y, m - 1 + n, 1));
    const last = new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth() + 1, 0)).getUTCDate();
    x.setUTCDate(Math.min(d, last));
    return x.toISOString().slice(0, 10);
  }
  /* Every period of a maintenance from its start until today, plus the next one that isn't due yet */
  function periods(it) {
    if (!it.start) return [];
    const now = today(), out = [], step = it.kind === 'year' ? 12 : 1;
    for (let i = 0; i < 600; i++) {
      const start = addMonths(it.start, i * step);
      if (it.end && start > it.end) break;
      const due = start <= now;
      out.push({ key: it.kind === 'year' ? start.slice(0, 4) : start.slice(0, 7), start, due });
      if (!due) break;
    }
    return out;
  }

  /* ---------- Money maths ---------- */
  const num = v => { const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : 0; };
  const uid = () => Math.random().toString(36).slice(2, 10);
  const splitTotal = split => (split || []).reduce((s, x) => s + num(x.pct), 0);
  const ourFrac = (split, people) => (split || []).filter(x => people.includes(x.who)).reduce((s, x) => s + num(x.pct), 0) / 100;

  /* All paid amounts (events) and everything still to be paid (dues) */
  function ledger(doc) {
    const events = [], dues = [];
    for (const [pid, acct] of Object.entries(doc.projects)) {
      for (const it of acct.items || []) {
        const split = it.split || acct.split || [];
        if (it.kind === 'once') {
          if (it.paidOn) events.push({ pid, it, amount: num(it.amount), date: it.paidOn, split });
          else dues.push({ pid, it, amount: num(it.amount), date: it.due || '', key: '', split });
        } else {
          for (const [key, p] of Object.entries(it.paid || {})) events.push({ pid, it, amount: num(p.amount), date: p.on, split, key });
          for (const p of periods(it)) if (p.due && !(it.paid || {})[p.key]) dues.push({ pid, it, amount: num(it.amount), date: p.start, key: p.key, split });
        }
      }
    }
    return { events, dues };
  }
  /* Monthly maintenance income (yearly ones count as 1/12) */
  function monthly(doc, onlyPid) {
    const now = today();
    let total = 0, ours = 0;
    for (const [pid, acct] of Object.entries(doc.projects)) {
      if (onlyPid && pid !== onlyPid) continue;
      for (const it of acct.items || []) {
        if (it.kind === 'once' || !it.start || it.start > now || (it.end && it.end < now)) continue;
        const m = num(it.amount) / (it.kind === 'year' ? 12 : 1);
        total += m;
        ours += m * ourFrac(it.split || acct.split, doc.people);
      }
    }
    return { total, ours };
  }

  /* ---------- State ---------- */
  const vault = Base.vault();
  let doc = null;
  let year = 'all';
  let tab = 'all';
  const open = new Set(JSON.parse(NM.store.get('nm-admin-open') || '[]'));
  const saveOpen = () => NM.store.set('nm-admin-open', JSON.stringify([...open]));

  const OTHER = '_other';
  const acctName = pid => pid === OTHER ? t('p.other') : ((projects.find(p => p.id === pid) || {}).name || pid);
  function acct(d, pid) {
    if (!d.projects[pid]) d.projects[pid] = { split: d.people.map(w => ({ who: w, pct: Math.round(100 / d.people.length) })), items: [] };
    return d.projects[pid];
  }
  const findItem = (d, pid, iid) => (d.projects[pid] && d.projects[pid].items.find(i => i.id === iid)) || null;

  /* ---------- Screens ---------- */
  function gate(title, sub, body, error = '') {
    app.innerHTML = `
      <section class="gate">
        <h1>${esc(title)}</h1>
        <p class="lead">${sub}</p>
        <form id="gateForm" novalidate>${body}
          <p class="err" id="gateErr" ${error ? '' : 'hidden'}>${esc(error)}</p>
        </form>
      </section>`;
    const first = app.querySelector('input');
    if (first) first.focus();
    return $('gateForm');
  }
  const busy = (form, on) => form.querySelectorAll('button, input').forEach(x => { x.disabled = on; });
  const showErr = msg => { const e = $('gateErr'); e.textContent = msg; e.hidden = false; };

  function signInScreen(error) {
    const form = gate(t('a.signin'), esc(t('a.signin.sub')), `
      <label class="field"><span>${esc(t('a.token'))}</span>
        <input type="password" id="token" autocomplete="off" spellcheck="false" required></label>
      <details class="help"><summary>${esc(t('a.token.how'))}</summary>
        <p>${tf('a.token.help1', { repo: esc(repoName) })}</p>
        <p>${t('a.token.help2')}</p></details>
      <button class="btn btn-primary" type="submit">${esc(t('a.go'))}</button>`, error);
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const v = $('token').value.trim();
      if (!v) return;
      busy(form, true);
      try { await Base.signIn(v); start(); }
      catch (err) {
        busy(form, false);
        showErr(err.status === 401 || err.status === 403 || err.status === 404 ? tf('a.bad.token', { repo: repoName }) : t('a.bad.net') + err.message);
      }
    });
  }

  function unlockScreen(error) {
    const form = gate(t('a.unlock'), esc(t('a.unlock.sub')), `
      <label class="field"><span>${esc(t('a.pass'))}</span><input type="password" id="pass" autocomplete="current-password" required></label>
      <label class="check"><input type="checkbox" id="remember"> ${esc(t('a.remember'))}</label>
      <button class="btn btn-primary" type="submit">${esc(t('a.open'))}</button>
      <button class="link" type="button" id="out">${esc(t('a.signout'))}</button>`, error);
    $('out').addEventListener('click', signOut);
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const pass = $('pass').value;
      if (!pass) return;
      busy(form, true);
      try {
        await vault.load(pass);
        Base.pass.set(pass, $('remember').checked);
        ready();
      } catch (err) {
        busy(form, false);
        showErr(err.wrongPassword ? t('a.bad.pass') : t('a.bad.net') + err.message);
        $('pass').select();
      }
    });
  }

  function createScreen() {
    const form = gate(t('a.create'), esc(t('a.create.sub')), `
      <label class="field"><span>${esc(t('a.pass'))}</span><input type="password" id="p1" autocomplete="new-password" required minlength="8"></label>
      <label class="field"><span>${esc(t('a.pass2'))}</span><input type="password" id="p2" autocomplete="new-password" required></label>
      <fieldset class="field"><legend>${esc(t('a.names'))}</legend>
        <div class="two"><input id="n1" placeholder="${esc(t('a.name1'))}" value="${esc(Base.login)}"><input id="n2" placeholder="${esc(t('a.name2'))}"></div></fieldset>
      <label class="check"><input type="checkbox" id="remember"> ${esc(t('a.remember'))}</label>
      <button class="btn btn-primary" type="submit">${esc(t('a.make'))}</button>`);
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const p1 = $('p1').value, p2 = $('p2').value;
      if (p1.length < 8) return showErr(t('a.bad.short'));
      if (p1 !== p2) return showErr(t('a.bad.match'));
      const people = [$('n1').value.trim() || t('a.name1'), $('n2').value.trim() || t('a.name2')];
      busy(form, true);
      try {
        await vault.create(p1, { v: 1, people, projects: {} });
        Base.pass.set(p1, $('remember').checked);
        ready();
      } catch (err) { busy(form, false); showErr(t('a.bad.net') + err.message); }
    });
  }

  function signOut() {
    Base.signOut();
    location.reload();
  }

  async function start() {
    if (!Base.token()) return signInScreen();
    app.innerHTML = `<p class="loading-msg">${esc(t('a.loading'))}</p>`;
    Base.refreshStatus();
    try {
      if (!await vault.exists()) return createScreen();
      const pass = Base.pass.get();
      if (pass) {
        try { await vault.load(pass); return ready(); }
        catch (err) { if (!err.wrongPassword) throw err; Base.pass.set('', false); }
      }
      unlockScreen();
    } catch (err) {
      if (err.status === 401) { Base.signOut(); return signInScreen(tf('a.bad.token', { repo: repoName })); }
      signInScreen(t('a.bad.net') + err.message);
    }
  }

  /* ---------- The panel ---------- */
  function ready() {
    doc = vault.doc;
    doc.projects = doc.projects || {};
    doc.people = doc.people || [];
    render();
  }

  function statsHtml(L) {
    const inYear = e => year === 'all' || (e.date || '').startsWith(year);
    const ev = L.events.filter(inYear);
    const collected = ev.reduce((s, e) => s + e.amount, 0);
    const per = {};
    let others = 0;
    for (const e of ev) for (const x of e.split) {
      const v = e.amount * num(x.pct) / 100;
      if (doc.people.includes(x.who)) per[x.who] = (per[x.who] || 0) + v; else others += v;
    }
    const profit = doc.people.reduce((s, w) => s + (per[w] || 0), 0);
    const pending = L.dues.reduce((s, d) => s + d.amount, 0);
    const pendingOurs = L.dues.reduce((s, d) => s + d.amount * ourFrac(d.split, doc.people), 0);
    const m = monthly(doc);
    const people = doc.people.map(w => `<span><b>${esc(w)}</b> ${esc(NM.money(per[w] || 0))}</span>`).join('') +
      (others ? `<span><b>${esc(t('s.others'))}</b> ${esc(NM.money(others))}</span>` : '');
    return `
      <div class="kpis">
        <div class="kpi"><span>${esc(t('s.collected'))}</span><b>${esc(NM.money(collected))}</b></div>
        <div class="kpi hero"><span>${esc(t('s.profit'))}</span><b>${esc(NM.money(profit))}</b><div class="people">${people}</div></div>
        <div class="kpi${pending ? ' warn' : ''}"><span>${esc(t('s.pending'))}</span><b>${esc(NM.money(pending))}</b><small>${esc(t('s.ours'))} ${esc(NM.money(pendingOurs))}</small></div>
        <div class="kpi"><span>${esc(t('s.maint'))}</span><b>${esc(NM.money(m.total))}</b><small>${esc(t('s.ours'))} ${esc(NM.money(m.ours))} · ${esc(NM.money(m.total * 12))} ${esc(t('s.year'))}</small></div>
      </div>`;
  }

  function duesHtml(L) {
    const now = today();
    const list = [...L.dues].sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999'));
    const rows = list.map(d => {
      const when = d.key ? (d.it.kind === 'year' ? d.key : monthLabel(d.date)) : '';
      const late = d.date && d.date < now;
      return `
        <li class="due${late ? ' late' : ''}">
          <div class="due-what"><b>${esc(acctName(d.pid))}</b><span>${esc(d.it.label || t('i.build'))}${when ? ' · ' + esc(when) : ''}</span></div>
          <div class="due-when">${d.date ? esc(short(d.date)) : esc(t('due.nodate'))}${late ? ` <em>${esc(t('due.overdue'))}</em>` : ''}</div>
          <div class="due-sum"><b>${esc(NM.money(d.amount))}</b><small>${esc(t('s.ours'))} ${esc(NM.money(d.amount * ourFrac(d.split, doc.people)))}</small></div>
          <button class="pill-btn" type="button" data-act="pay" data-pid="${esc(d.pid)}" data-iid="${esc(d.it.id)}" data-key="${esc(d.key)}">${esc(t('due.pay'))}</button>
        </li>`;
    }).join('');
    return `
      <section class="block">
        <h2>${esc(t('due.title'))}</h2>
        ${rows ? `<ul class="dues">${rows}</ul>` : `<p class="muted">${esc(t('due.none'))}</p>`}
      </section>`;
  }

  function splitHtml(split, pid, iid = '') {
    const total = splitTotal(split);
    const k = `${pid}:${iid}`;
    const rows = split.map((x, i) => `
      <div class="split-row">
        <input class="in" list="peopleList" value="${esc(x.who)}" placeholder="${esc(t('p.who'))}" aria-label="${esc(t('p.who'))}"
          data-act="split-who" data-pid="${esc(pid)}" data-iid="${esc(iid)}" data-i="${i}" data-k="${esc(k)}:w${i}">
        <label class="pct"><input class="in" type="number" inputmode="decimal" min="0" max="100" step="any" value="${esc(x.pct)}" aria-label="%"
          data-act="split-pct" data-pid="${esc(pid)}" data-iid="${esc(iid)}" data-i="${i}" data-k="${esc(k)}:p${i}"><span>%</span></label>
        <span class="split-cut ${doc.people.includes(x.who) ? 'us' : ''}">${doc.people.includes(x.who) ? '★' : ''}</span>
        <button class="x" type="button" title="${esc(t('i.del'))}" aria-label="${esc(t('i.del'))}" data-act="split-del" data-pid="${esc(pid)}" data-iid="${esc(iid)}" data-i="${i}">×</button>
      </div>`).join('');
    return `
      <div class="split">
        ${rows}
        <div class="split-foot">
          <button class="link" type="button" data-act="split-add" data-pid="${esc(pid)}" data-iid="${esc(iid)}">${esc(t('p.addPerson'))}</button>
          <span class="split-total${Math.abs(total - 100) > 0.001 ? ' bad' : ''}">${esc(t('p.split.total'))} ${+total.toFixed(2)}%${Math.abs(total - 100) > 0.001 ? ' · ' + esc(t('p.split.bad')) : ''}</span>
        </div>
      </div>`;
  }

  function itemHtml(pid, it) {
    const d = `data-pid="${esc(pid)}" data-iid="${esc(it.id)}"`;
    const key = f => `data-k="${esc(pid)}:${esc(it.id)}:${f}"`;
    const field = (f, label, input) => `<label class="field sm"><span>${esc(label)}</span>${input}</label>`;
    const base = `
      ${field('label', t('i.label'), `<input class="in" value="${esc(it.label || '')}" placeholder="${esc(t('i.label.ph'))}" data-act="item" data-f="label" ${d} ${key('label')}>`)}
      ${field('amount', t('i.amount'), `<input class="in num" type="number" inputmode="decimal" min="0" step="any" value="${esc(it.amount ?? '')}" data-act="item" data-f="amount" ${d} ${key('amount')}>`)}
      ${field('kind', t('i.kind'), `<select class="in" data-act="item" data-f="kind" ${d} ${key('kind')}>
        ${['once', 'month', 'year'].map(k => `<option value="${k}"${it.kind === k ? ' selected' : ''}>${esc(t('i.' + k))}</option>`).join('')}</select>`)}`;
    let extra = '', below = '';
    if (it.kind === 'once') {
      extra = `
        ${field('due', t('i.due'), `<input class="in" type="date" value="${esc(it.due || '')}" data-act="item" data-f="due" ${d} ${key('due')}>`)}
        <div class="field sm"><span>${esc(t('i.paid'))}</span>
          <button class="paid-btn${it.paidOn ? ' on' : ''}" type="button" data-act="toggle-paid" ${d} aria-pressed="${!!it.paidOn}">
            ${it.paidOn ? `✓ ${esc(short(it.paidOn))}` : esc(t('i.markPaid'))}</button></div>`;
    } else {
      extra = `
        ${field('start', t('i.start'), `<input class="in" type="date" value="${esc(it.start || '')}" data-act="item" data-f="start" ${d} ${key('start')}>`)}
        ${field('end', t('i.end'), `<input class="in" type="date" value="${esc(it.end || '')}" data-act="item" data-f="end" ${d} ${key('end')}>`)}`;
      const ps = periods(it);
      const due = ps.filter(p => p.due);
      const paidN = due.filter(p => (it.paid || {})[p.key]).length;
      const owes = (due.length - paidN) * num(it.amount);
      const next = ps.find(p => !p.due);
      const shown = ps.slice(-13);
      below = `
        <div class="periods">
          <span class="label">${esc(t('i.periods'))}</span>
          <div class="chips">${shown.map(p => {
            const paid = (it.paid || {})[p.key];
            const label = it.kind === 'year' ? p.key : monthLabel(p.start);
            return `<button type="button" class="per ${paid ? 'paid' : p.due ? 'owed' : 'next'}" ${p.due || paid ? '' : 'disabled'}
              data-act="period" ${d} data-key="${esc(p.key)}" title="${paid ? esc(t('i.paid') + ' ' + short(paid.on) + ' · ' + NM.money(paid.amount)) : esc(short(p.start))}">${esc(label)}</button>`;
          }).join('')}</div>
          <span class="per-sum">${esc(tf('i.paidOf', { a: paidN, b: due.length }))}${owes ? ` · <b>${esc(tf('i.owes', { x: NM.money(owes) }))}</b>` : ''}${next ? ' · ' + esc(tf('i.next', { x: short(next.start) })) : ''}</span>
        </div>`;
    }
    const own = !!it.split;
    return `
      <div class="item">
        <div class="item-grid">${base}${extra}
          <button class="x del" type="button" title="${esc(t('i.del'))}" aria-label="${esc(t('i.del'))}" data-act="item-del" ${d}>×</button>
        </div>
        ${below}
        <label class="check sm"><input type="checkbox" data-act="own-split" ${d} ${own ? 'checked' : ''}> ${esc(t('i.ownSplit'))}</label>
        ${own ? splitHtml(it.split, pid, it.id) : ''}
      </div>`;
  }

  function acctHtml(pid, L) {
    const p = projects.find(x => x.id === pid);
    const a = doc.projects[pid] || { split: doc.people.map(w => ({ who: w, pct: Math.round(100 / doc.people.length) })), items: [] };
    const inYear = e => year === 'all' || (e.date || '').startsWith(year);
    const ev = L.events.filter(e => e.pid === pid && inYear(e));
    const collected = ev.reduce((s, e) => s + e.amount, 0);
    const profit = ev.reduce((s, e) => s + e.amount * ourFrac(e.split, doc.people), 0);
    const pending = L.dues.filter(d => d.pid === pid).reduce((s, d) => s + d.amount, 0);
    const m = monthly(doc, pid);
    const st = p ? NM.status(p) : '';
    const isOpen = open.has(pid);
    const canMaint = !p || st === 'live' || st === 'progress';
    const sub = pid === OTHER ? t('p.other.sub') : (p ? pick(p.client) || pick(p.category) : '');
    return `
      <section class="acct${isOpen ? ' open' : ''}" data-id="${esc(pid)}">
        <div class="acct-head">
          ${p ? `<button class="status s-${st} move" type="button" aria-haspopup="menu" aria-expanded="false" title="${esc(t('move.title'))}" data-act="move" data-pid="${esc(pid)}">${esc(t('status.' + st))}<svg class="icon" viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg></button>` : ''}
          <button class="acct-toggle" type="button" data-act="toggle" data-pid="${esc(pid)}" aria-expanded="${isOpen}">
            <span class="acct-name"><b>${esc(acctName(pid))}</b>${sub ? `<span>${esc(sub)}</span>` : ''}</span>
            <span class="acct-nums">
              <span><b>${esc(NM.money(collected))}</b>${esc(t('p.collected'))}</span>
              <span class="pos"><b>${esc(NM.money(profit))}</b>${esc(t('p.profit'))}</span>
              ${pending ? `<span class="neg"><b>${esc(NM.money(pending))}</b>${esc(t('p.pending'))}</span>` : ''}
              ${m.total ? `<span><b>${esc(NM.money(m.total))}</b>${esc(t('p.month'))}</span>` : ''}
            </span>
            <svg class="icon chev" viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg>
          </button>
        </div>
        ${isOpen ? `
        <div class="acct-body">
          <div class="col">
            <span class="label">${esc(t('p.split'))}</span>
            <p class="hint">${esc(t('p.split.sub'))}</p>
            ${splitHtml(a.split, pid)}
          </div>
          <div class="col wide">
            <span class="label">${esc(t('p.items'))}</span>
            ${(a.items || []).length ? a.items.map(it => itemHtml(pid, it)).join('') : `<p class="hint">${esc(t('p.noitems'))}</p>`}
            <div class="adds">
              ${pid !== OTHER ? `<button class="pill-btn ghost" type="button" data-act="add" data-kind="build" data-pid="${esc(pid)}">${esc(t('add.build'))}</button>` : ''}
              ${canMaint ? `<button class="pill-btn ghost" type="button" data-act="add" data-kind="maint" data-pid="${esc(pid)}">${esc(t('add.maint'))}</button>` : ''}
              <button class="pill-btn ghost" type="button" data-act="add" data-kind="other" data-pid="${esc(pid)}">${esc(t('add.other'))}</button>
            </div>
          </div>
        </div>` : ''}
      </section>`;
  }

  function render() {
    if (!doc) return;
    /* Keep the focus where it was across a re-render */
    const act = document.activeElement;
    const fk = act && act.dataset && act.dataset.k;
    const sel = fk && act.selectionStart != null ? [act.selectionStart, act.selectionEnd] : null;

    const L = ledger(doc);
    const years = [...new Set(L.events.map(e => (e.date || '').slice(0, 4)).filter(Boolean))].sort().reverse();
    if (year !== 'all' && !years.includes(year)) years.unshift(year);
    const ids = [...projects.map(p => p.id), ...Object.keys(doc.projects).filter(id => id !== OTHER && !projects.some(p => p.id === id))];
    const count = k => k === 'all' ? projects.length : projects.filter(p => NM.status(p) === k).length;
    const shown = ids.filter(id => tab === 'all' || (projects.find(p => p.id === id) && NM.status(projects.find(p => p.id === id)) === tab));
    const names = [...new Set([...doc.people, ...Object.values(doc.projects).flatMap(a => [...(a.split || []), ...(a.items || []).flatMap(i => i.split || [])].map(x => x.who))].filter(Boolean))];

    app.innerHTML = `
      <div class="adm-head">
        <h1>${esc(t('a.title'))}</h1>
        <label class="year"><select id="year" aria-label="${esc(t('a.all.years'))}">
          <option value="all">${esc(t('a.all.years'))}</option>
          ${years.map(y => `<option value="${y}"${y === year ? ' selected' : ''}>${y}</option>`).join('')}
        </select><svg class="icon" viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg></label>
      </div>
      ${statsHtml(L)}
      ${duesHtml(L)}
      <section class="block">
        <div class="toolbar">
          <h2>${esc(t('p.title'))}</h2>
          <div class="filters" role="tablist" id="admTabs">${['all', 'live', 'progress', 'demo'].map(k =>
            `<button class="filter${k === 'all' ? '' : ' f-' + k}" type="button" role="tab" data-act="tab" data-k="${k}" aria-selected="${k === tab}">${esc(t('tab.' + k))}<span class="n">${count(k)}</span></button>`).join('')}</div>
        </div>
        <div class="accts">${shown.map(id => acctHtml(id, L)).join('')}${tab === 'all' ? acctHtml(OTHER, L) : ''}</div>
      </section>
      <section class="block settings">
        <h2>${esc(t('set.title'))}</h2>
        <div class="set-grid">
          <div>
            <span class="label">${esc(t('set.people'))}</span>
            <p class="hint">${esc(t('set.people.sub'))}</p>
            <div class="two">${doc.people.map((w, i) => `<input class="in" value="${esc(w)}" data-act="person" data-i="${i}" data-k="person${i}" aria-label="${esc(t('a.names'))}">`).join('')}</div>
          </div>
          <form id="passForm">
            <span class="label">${esc(t('set.pass'))}</span>
            <div class="two"><input class="in" type="password" id="np1" placeholder="${esc(t('a.pass'))}" autocomplete="new-password">
              <input class="in" type="password" id="np2" placeholder="${esc(t('a.pass2'))}" autocomplete="new-password"></div>
            <button class="pill-btn ghost" type="submit">${esc(t('set.pass.btn'))}</button>
          </form>
          <div>
            <p class="hint">${esc(tf('set.who', { x: Base.login || 'GitHub' }))} ${esc(tf('set.repo', { repo: repoName }))}</p>
            <button class="pill-btn ghost" type="button" data-act="signout">${esc(t('a.signout'))}</button>
          </div>
        </div>
      </section>
      <datalist id="peopleList">${names.map(n => `<option value="${esc(n)}">`).join('')}</datalist>`;

    if (fk) {
      const el = app.querySelector(`[data-k="${CSS.escape(fk)}"]`);
      if (el) { el.focus({ preventScroll: true }); if (sel) try { el.setSelectionRange(...sel); } catch {} }
    }
  }

  /* ---------- Changes ---------- */
  const change = fn => vault.change(fn);
  const splitOf = (d, pid, iid) => iid ? findItem(d, pid, iid).split : acct(d, pid).split;

  app.addEventListener('change', e => {
    const el = e.target;
    const { act, pid, iid, f } = el.dataset;
    const i = +el.dataset.i;
    if (el.id === 'year') { year = el.value; return render(); }
    if (act === 'split-who') change(d => { const s = splitOf(d, pid, iid); if (s && s[i]) s[i].who = el.value.trim(); });
    else if (act === 'split-pct') change(d => { const s = splitOf(d, pid, iid); if (s && s[i]) s[i].pct = num(el.value); });
    else if (act === 'item') {
      const v = f === 'amount' ? num(el.value) : el.value;
      change(d => {
        const it = findItem(d, pid, iid);
        if (!it) return;
        it[f] = v;
        if (f === 'kind') {
          if (v === 'once') { delete it.start; delete it.end; delete it.paid; it.paidOn = it.paidOn || ''; }
          else { delete it.due; delete it.paidOn; it.start = it.start || today(); it.paid = it.paid || {}; }
        }
      });
    } else if (act === 'own-split') {
      const on = el.checked;
      change(d => {
        const it = findItem(d, pid, iid);
        if (!it) return;
        if (on) it.split = JSON.parse(JSON.stringify(acct(d, pid).split)); else delete it.split;
      });
    } else if (act === 'person') {
      const next = el.value.trim();
      if (!next) return render();
      change(d => {
        const old = d.people[i];
        d.people[i] = next;
        /* Rename them in every split too */
        for (const a of Object.values(d.projects)) for (const s of [a.split, ...(a.items || []).map(x => x.split)]) for (const x of s || []) if (x.who === old) x.who = next;
      });
    }
  });

  app.addEventListener('click', e => {
    const b = e.target.closest('[data-act]');
    if (!b || b.tagName === 'INPUT' || b.tagName === 'SELECT') return;
    const { act, pid, iid, key, kind } = b.dataset;
    const i = +b.dataset.i;
    if (act === 'toggle') { open.has(pid) ? open.delete(pid) : open.add(pid); saveOpen(); render(); }
    else if (act === 'tab') { tab = b.dataset.k; render(); }
    else if (act === 'move') {
      const p = projects.find(x => x.id === pid);
      Base.statusMenu(b, p, render);
    }
    else if (act === 'signout') signOut();
    else if (act === 'split-add') change(d => { splitOf(d, pid, iid).push({ who: '', pct: 0 }); });
    else if (act === 'split-del') change(d => { splitOf(d, pid, iid).splice(i, 1); });
    else if (act === 'add') {
      open.add(pid); saveOpen();
      const it = kind === 'maint'
        ? { id: uid(), label: t('i.maint'), amount: 0, kind: 'month', start: today(), end: '', paid: {} }
        : { id: uid(), label: kind === 'build' ? t('i.build') : '', amount: 0, kind: 'once', due: '', paidOn: '' };
      change(d => { acct(d, pid).items.push(it); });
      requestAnimationFrame(() => {
        const el = app.querySelector(`[data-k="${CSS.escape(`${pid}:${it.id}:${kind === 'other' ? 'label' : 'amount'}`)}"]`);
        if (el) { el.focus(); el.select && el.select(); }
      });
    }
    else if (act === 'item-del') {
      const it = findItem(doc, pid, iid);
      if (!it || !confirm(tf('i.del.ask', { x: it.label || NM.money(it.amount) }))) return;
      change(d => { const a = d.projects[pid]; a.items = a.items.filter(x => x.id !== iid); });
    }
    else if (act === 'toggle-paid') change(d => { const it = findItem(d, pid, iid); if (it) it.paidOn = it.paidOn ? '' : today(); });
    else if (act === 'period') change(d => {
      const it = findItem(d, pid, iid);
      if (!it) return;
      it.paid = it.paid || {};
      if (it.paid[key]) delete it.paid[key]; else it.paid[key] = { on: today(), amount: num(it.amount) };
    });
    else if (act === 'pay') change(d => {
      const it = findItem(d, pid, iid);
      if (!it) return;
      if (key) { it.paid = it.paid || {}; it.paid[key] = { on: today(), amount: num(it.amount) }; }
      else it.paidOn = today();
    });
  });

  app.addEventListener('submit', async e => {
    if (e.target.id !== 'passForm') return;
    e.preventDefault();
    const p1 = $('np1').value, p2 = $('np2').value;
    if (p1.length < 8) return Base.toast(t('a.bad.short'), true);
    if (p1 !== p2) return Base.toast(t('a.bad.match'), true);
    try {
      await vault.changePassword(p1);
      Base.pass.set(p1, !!NM.store.get('nm-pass'));
      Base.toast(t('set.pass.done'));
      render();
    } catch (err) { Base.toast(t('a.error') + ': ' + err.message, true); }
  });
  /* Enter in a field saves it straight away */
  app.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.matches('input.in') && !e.target.closest('form')) e.target.blur();
  });

  vault.on('change', d => { doc = d; render(); });
  vault.on('status', s => {
    const el = $('save');
    el.hidden = false;
    const bad = s.startsWith('error:');
    el.className = `save ${bad ? 'bad' : s}`;
    el.textContent = bad ? t('a.error') : t('a.' + s);
    el.title = bad ? s.slice(6) : '';
    if (bad) Base.toast(t('a.error') + ': ' + s.slice(6), true);
  });

  /* Coming back to the tab: load what the other one changed meanwhile */
  document.addEventListener('visibilitychange', () => {
    if (!doc) return;
    if (document.hidden) vault.flush();
    else { vault.reload().catch(() => {}); Base.refreshStatus().then(c => { if (c) render(); }); }
  });
  addEventListener('beforeunload', e => { if (vault.busy) { vault.flush(); e.preventDefault(); e.returnValue = ''; } });

  NM.onLang(() => { if (doc) render(); else start(); });
  document.addEventListener('DOMContentLoaded', start);
})();
