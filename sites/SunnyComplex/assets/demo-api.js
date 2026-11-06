/* Demo mode for static hosting (GitHub Pages), where server.py can't run.
   When /api answers with something other than JSON (or not at all), the same calls are answered here
   with the same rules as server.py, and bookings, orders and couriers are kept in this browser's
   localStorage. Nothing is shared between devices. On localhost (start.bat) the real server is always used. */
(() => {
  const realFetch = window.fetch.bind(window);
  const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  const KEY = 'sunny-demo-data';
  let demo = null;

  /* ---------- Storage ---------- */
  const blank = () => ({ reservations: [], orders: [], closures: [], couriers: [{ id: 1, name: 'Доставчик 1' }, { id: 2, name: 'Доставчик 2' }], seq: { r: 0, o: 0, c: 0 }, loggedIn: true });
  const load = () => {
    try { const db = { ...blank(), ...JSON.parse(localStorage.getItem(KEY)) }; db.seq.c = db.seq.c || 0; return db; } catch { return blank(); }
  };
  const save = db => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch {} };

  /* ---------- Helpers, as in server.py ---------- */
  class Bad extends Error { constructor(msg, status = 400) { super(msg); this.status = status; } }
  const pad = n => String(n).padStart(2, '0');
  const isoDay = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const stamp = (d = new Date()) => `${isoDay(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  const serviceDay = (d = new Date()) => isoDay(new Date(d.getTime() - 5 * 3600000));
  const asInt = (v, what) => { const n = Number(v); if (!Number.isInteger(n)) throw new Bad(`Невалидна стойност: ${what}.`); return n; };
  const digits = s => String(s || '').replace(/\D/g, '').length;
  const cents = p => { const [e, c = '0'] = String(p).split(','); return +e * 100 + +(c + '0').slice(0, 2); };
  const parseDay = v => { if (!/^\d{4}-\d{2}-\d{2}$/.test(String(v))) throw new Bad('Невалидна дата.'); return String(v); };

  const floor = () => window.FLOOR_DATA || { open: 9, last: 21, duration: 2, tables: [] };
  const ACTIVE = ['pending', 'confirmed', 'seated'], STATUSES = [...ACTIVE, 'cancelled', 'noshow'];

  function checkReservation(r, staff, keptHour = null) {
    const F = floor(), tables = Object.fromEntries(F.tables.map(t => [t.id, t]));
    const biggest = Math.max(...F.tables.map(t => t.seats), 0), now = new Date(), today = isoDay(now);
    const day = parseDay(r.day);
    const ahead = isoDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 90));
    if (!staff && (day < today || day > ahead)) throw new Bad('Можете да резервирате до 90 дни напред.');
    const hour = asInt(r.hour, 'час');
    if ((hour < F.open || hour > F.last) && hour !== keptHour) throw new Bad(`Резервации се приемат от ${F.open}:00 до ${F.last}:00.`);
    if (!staff && day === today && hour <= now.getHours()) throw new Bad('Този час вече мина.');
    const guests = asInt(r.guests, 'гости');
    if (guests < 1 || guests > 30) throw new Bad('Невалиден брой гости.');
    let table = r.table;
    if (table === null || table === undefined || table === '' || table === 0) table = null;
    else {
      table = asInt(table, 'маса');
      if (!tables[table]) throw new Bad('Няма такава маса.');
      if (!staff && tables[table].seats < guests) throw new Bad(`Маса ${table} е за до ${tables[table].seats} души.`);
    }
    if (table === null && !staff && guests <= biggest) throw new Bad('Изберете маса.');
    const name = String(r.name || '').trim().slice(0, 80), phone = String(r.phone || '').trim().slice(0, 30), note = String(r.note || '').trim().slice(0, 500);
    if (!name) throw new Bad('Напишете име.');
    if (!staff && digits(phone) < 9) throw new Bad('Напишете телефон, на който да ви потърсим.');
    const status = r.status || 'pending';
    if (!STATUSES.includes(status)) throw new Bad('Невалиден статус.');
    return { day, hour, table, guests, name, phone, note, status };
  }
  const closedOn = (db, day) => {
    const list = db.closures.filter(c => c.day === day);
    return { whole: list.some(c => c.tables === null), held: new Set(list.flatMap(c => c.tables || [])) };
  };
  const newCode = () => Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
  const agreed = b => { if (b.agree !== true) throw new Bad('Отбележете, че сте прочели политиката за поверителност.'); return b; };
  const guestView = b => ({ id: b.id, day: b.day, hour: b.hour, table: b.table, guests: b.guests, name: b.name, status: b.status,
    guest_cancelled: !!b.guest_cancelled, can_cancel: ['pending', 'confirmed'].includes(b.status) && new Date(`${b.day}T${pad(b.hour)}:00:00`) > new Date() });
  const findOwn = (db, id, code) => {
    const b = db.reservations.find(x => x.id === +id);
    if (!b || !b.code || b.code !== String(code)) throw new Bad('Не намираме тази резервация. Проверете линка или се обадете.', 404);
    return b;
  };
  const clash = (db, rec, exclude = null) => rec.table === null || !ACTIVE.includes(rec.status) ? null
    : db.reservations.find(b => b.id !== exclude && b.day === rec.day && b.table === rec.table && ACTIVE.includes(b.status) && Math.abs(b.hour - rec.hour) < floor().duration);

  /* Orders: prices come from the menu data, never from the cart */
  function dishes() {
    const out = {}; let fee = 100;
    (window.MENU || []).forEach(cat => {
      cat.items.forEach((it, i) => { out[`${cat.id}:${i}`] = { name: it.n, price: cents(it.p) }; });
      (cat.extras || []).forEach((it, i) => { if (it.n === 'Доставка') fee = cents(it.p); else out[`${cat.id}:x${i}`] = { name: it.n, price: cents(it.p) }; });
    });
    return { out, fee };
  }
  const ORDER_FLOW = ['new', 'preparing', 'on_way', 'delivered'], ORDER_STATUSES = [...ORDER_FLOW, 'cancelled'];
  const ORDER_STAMPS = { preparing: 'accepted_at', on_way: 'sent_at', delivered: 'delivered_at' };

  function checkOrder(r) {
    const { out, fee } = dishes();
    if (!Array.isArray(r.items) || !r.items.length) throw new Bad('Количката е празна.');
    if (r.items.length > 60) throw new Bad('Твърде много артикули в една поръчка. Обадете се.');
    let subtotal = 0;
    const items = r.items.map(line => {
      const dish = line && out[String(line.key)];
      if (!dish) throw new Bad('Някой от артикулите вече не е в менюто. Обновете страницата.');
      const qty = asInt(line.qty, 'количество');
      if (qty < 1 || qty > 30) throw new Bad('Невалидно количество.');
      subtotal += dish.price * qty;
      return { key: line.key, name: dish.name, price: dish.price, qty };
    });
    const text = (k, most) => String(r[k] || '').trim().slice(0, most);
    const o = { name: text('name', 80), phone: text('phone', 30), town: text('town', 60) || 'Радомир', address: text('address', 160),
                details: text('details', 160), note: text('note', 500), payment: r.payment, deliver_at: text('when', 5) || 'asap' };
    if (!o.name) throw new Bad('Напишете име.');
    if (digits(o.phone) < 9) throw new Bad('Напишете телефон, на който да ви потърсим.');
    if (o.address.length < 4) throw new Bad('Напишете адрес за доставка.');
    if (!['cash', 'card'].includes(o.payment)) throw new Bad('Изберете начин на плащане.');
    if (o.deliver_at !== 'asap' && !/^([01]\d|2[0-3]):[0-5]\d$/.test(o.deliver_at)) throw new Bad('Невалиден час за доставка.');
    return { ...o, items, subtotal, fee, total: subtotal + fee };
  }

  /* ---------- The API ---------- */
  function handle(method, path, q, body) {
    const db = load();
    const done = (data, status = 200) => { save(db); return [status, data]; };
    const today = isoDay(new Date());

    if (method === 'GET' && path === 'availability') {
      const day = parseDay(q.get('day')), { whole, held } = closedOn(db, day);
      return done({ day, duration: floor().duration, bookings: db.reservations.filter(b => b.day === day && b.table !== null && ACTIVE.includes(b.status)).map(b => ({ table: b.table, hour: b.hour })),
                    closed: whole, blocked: [...held].sort((a, b) => a - b), closed_days: [...new Set(db.closures.filter(c => c.tables === null && c.day >= today).map(c => c.day))].sort() });
    }
    if (method === 'POST' && path === 'reservations') {
      const rec = checkReservation({ ...agreed(body), status: 'pending' }, false);
      const { whole, held } = closedOn(db, rec.day);
      if (whole) throw new Bad('На този ден ресторантът е зает с частно събитие. Обадете се за друг ден.', 409);
      if (held.has(rec.table)) throw new Bad(`Маса ${rec.table} не е свободна на този ден.`, 409);
      const hit = clash(db, rec);
      if (hit) throw new Bad(`Маса ${rec.table} вече е заета около ${hit.hour}:00.`, 409);
      const row = { id: ++db.seq.r, ...rec, source: 'web', code: newCode(), guest_cancelled: false, created_at: stamp(), updated_at: stamp() };
      db.reservations.push(row);
      return done({ id: row.id, status: row.status, code: row.code }, 201);
    }
    if (method === 'GET' && path === 'booking') return done(guestView(findOwn(db, q.get('id'), q.get('code'))));
    if (method === 'POST' && path === 'booking/cancel') {
      const b = findOwn(db, body.id, body.code);
      if (!guestView(b).can_cancel) throw new Bad('Тази резервация вече не може да се откаже от тук. Обадете се.', 409);
      Object.assign(b, { status: 'cancelled', guest_cancelled: true, updated_at: stamp() });
      return done(guestView(b));
    }
    if (method === 'GET' && path === 'orders/info') return done({ open: true, fee: dishes().fee, from: 9, until: 1 });
    if (method === 'POST' && path === 'orders') {
      const o = checkOrder(agreed(body)), now = new Date();
      const row = { id: ++db.seq.o, day: serviceDay(now), ...o, status: 'new', courier: null, created_at: stamp(now), updated_at: stamp(now), accepted_at: null, sent_at: null, delivered_at: null };
      db.orders.push(row);
      return done({ id: row.id, total: row.total }, 201);
    }
    if (method === 'POST' && path === 'admin/login') {
      if (!String(body.password || '').trim()) throw new Bad('Напишете парола.', 401);
      db.loggedIn = true; return done({ ok: true });
    }
    if (method === 'POST' && path === 'admin/logout') { db.loggedIn = false; return done({ ok: true }); }
    if (!path.startsWith('admin/')) throw new Bad('Няма такъв адрес.', 404);
    if (!db.loggedIn) throw new Bad('Влезте отново.', 401);

    if (method === 'GET' && path === 'admin/me') return done({ ok: true });
    if (method === 'GET' && path === 'admin/reservations') {
      const day = parseDay(q.get('day'));
      const list = db.reservations.filter(b => b.day === day).sort((a, b) => a.hour - b.hour || a.id - b.id);
      return done({ day, duration: floor().duration, reservations: list, pending_upcoming: db.reservations.filter(b => b.status === 'pending' && b.day >= today).length,
                    closures: db.closures.filter(c => c.day === day) });
    }
    if (method === 'POST' && path === 'admin/reservations') {
      const rec = checkReservation({ status: 'confirmed', ...body }, true);
      const hit = clash(db, rec);
      if (hit) throw new Bad(`Маса ${rec.table} вече е заета около ${hit.hour}:00.`, 409);
      const row = { id: ++db.seq.r, ...rec, source: 'staff', code: newCode(), guest_cancelled: false, created_at: stamp(), updated_at: stamp() };
      db.reservations.push(row);
      return done(row, 201);
    }
    let m = path.match(/^admin\/reservations\/(\d+)$/);
    if (m && method === 'PATCH') {
      const row = db.reservations.find(b => b.id === +m[1]);
      if (!row) throw new Bad('Няма такава резервация.', 404);
      const pick = Object.fromEntries(Object.entries(body).filter(([k]) => ['day', 'hour', 'table', 'guests', 'name', 'phone', 'note', 'status'].includes(k)));
      const rec = checkReservation({ ...row, ...pick }, true, row.hour);
      const hit = clash(db, rec, row.id);
      if (hit) throw new Bad(`Маса ${rec.table} е заета около ${hit.hour}:00 (${hit.name}).`, 409);
      Object.assign(row, rec, { updated_at: stamp(), guest_cancelled: !!row.guest_cancelled && rec.status === row.status });
      return done(row);
    }
    if (method === 'POST' && path === 'admin/closures') {
      const day = parseDay(body.day);
      let tables = body.tables ?? null;
      if (tables !== null) {
        const ids = new Set(floor().tables.map(t => t.id));
        if (!Array.isArray(tables) || !tables.length || tables.some(t => !ids.has(t))) throw new Bad('Изберете маси.');
        tables = [...new Set(tables)].sort((a, b) => a - b);
      }
      const row = { id: ++db.seq.c, day, tables, reason: String(body.reason || '').trim().slice(0, 120), created_at: stamp() };
      db.closures.push(row);
      return done(row, 201);
    }
    m = path.match(/^admin\/closures\/(\d+)$/);
    if (m && method === 'DELETE') { db.closures = db.closures.filter(c => c.id !== +m[1]); return done({ ok: true }); }
    if (method === 'GET' && path === 'admin/orders') {
      const day = parseDay(q.get('day'));
      return done({ day, today: serviceDay(), orders: db.orders.filter(o => o.day === day).sort((a, b) => a.id - b.id), couriers: db.couriers,
                    waiting: db.orders.filter(o => o.status === 'new').length, fee: 100 });
    }
    m = path.match(/^admin\/orders\/(\d+)$/);
    if (m && method === 'PATCH') {
      const row = db.orders.find(o => o.id === +m[1]);
      if (!row) throw new Bad('Няма такава поръчка.', 404);
      const status = body.status ?? row.status, courier = 'courier' in body ? body.courier : row.courier;
      if (!ORDER_STATUSES.includes(status)) throw new Bad('Невалиден статус.');
      if (courier !== null && !db.couriers.some(c => c.id === courier)) throw new Bad('Няма такъв доставчик.');
      if ((status === 'on_way' || status === 'delivered') && courier === null) throw new Bad('Изберете доставчик.');
      const now = stamp();
      if (status !== row.status && status !== 'cancelled') {
        Object.entries(ORDER_STAMPS).forEach(([step, col]) => {
          if (ORDER_FLOW.indexOf(step) > ORDER_FLOW.indexOf(status)) row[col] = null;
          else if (step === status) row[col] = row[col] || now;
        });
      }
      Object.assign(row, { status, courier, updated_at: now });
      return done(row);
    }
    m = path.match(/^admin\/couriers\/(\d+)$/);
    if (m && method === 'PATCH') {
      const name = String(body.name || '').trim().slice(0, 40);
      if (!name) throw new Bad('Напишете име.');
      const c = db.couriers.find(x => x.id === +m[1]);
      if (!c) throw new Bad('Няма такъв доставчик.', 404);
      c.name = name;
      return done({ couriers: db.couriers });
    }
    throw new Bad('Няма такъв адрес.', 404);
  }

  /* ---------- Sample day, for showing the staff pages ---------- */
  function sample() {
    const db = load(), now = new Date(), day = serviceDay(now), today = isoDay(now);
    const ago = min => stamp(new Date(now.getTime() - min * 60000));
    const add = (r) => db.reservations.push({ id: ++db.seq.r, day: today, note: '', source: 'web', created_at: ago(300), updated_at: ago(60), ...r });
    add({ hour: 13, table: 7, guests: 4, name: 'Мария Иванова', phone: '0888 123 456', status: 'confirmed', note: 'рожден ден' });
    add({ hour: 19, table: 32, guests: 6, name: 'Георги Петров', phone: '0899 234 567', status: 'confirmed' });
    add({ hour: 20, table: 22, guests: 5, name: 'Елена Димитрова', phone: '0877 345 678', status: 'pending' });
    add({ hour: 20, table: 3, guests: 2, name: 'Стефан Колев', phone: '0887 456 789', status: 'pending', note: 'детско столче' });
    add({ hour: 21, table: 26, guests: 4, name: 'Николай Стоянов', phone: '0898 567 890', status: 'confirmed', source: 'staff' });
    const dish = (name, price, qty) => ({ key: '', name, price, qty });
    const order = (o, items) => {
      const subtotal = items.reduce((a, it) => a + it.price * it.qty, 0);
      db.orders.push({ id: ++db.seq.o, day, town: 'Радомир', details: '', note: '', payment: 'cash', deliver_at: 'asap', courier: null,
                       accepted_at: null, sent_at: null, delivered_at: null, updated_at: stamp(now), items, subtotal, fee: 100, total: subtotal + 100, ...o });
    };
    order({ name: 'Иван Георгиев', phone: '0888 765 432', address: 'ул. Христо Ботев 14', status: 'delivered', courier: 1, created_at: ago(95), accepted_at: ago(93), sent_at: ago(75), delivered_at: ago(62) },
          [dish('Чийзбургер', 1090, 2), dish('Салата Дзадзики', 550, 1)]);
    order({ name: 'Десислава Николова', phone: '0899 876 543', address: 'ул. Райко Даскалов 3', details: 'вх. Б, ет. 4', payment: 'card', status: 'delivered', courier: 2, created_at: ago(70), accepted_at: ago(68), sent_at: ago(48), delivered_at: ago(35) },
          [dish('Пица Белисима', 890, 1), dish('Пица Прошуто крудо със страчатела и пикантен зехтин', 990, 1)]);
    order({ name: 'Петър Василев', phone: '0877 987 654', address: 'ул. Векилски 22', status: 'on_way', courier: 1, created_at: ago(34), accepted_at: ago(32), sent_at: ago(9) },
          [dish('Бест суши комбо -16 бр', 1738, 1), dish('Урамаки Екзотик-4 бр', 460, 2)]);
    order({ name: 'Йорданка Стоева', phone: '0887 098 765', address: 'ул. Струма 7', status: 'preparing', note: 'без лук', created_at: ago(14), accepted_at: ago(12) },
          [dish('2бр. Пилешко сувлаки', 850, 2), dish('Панакота със сладко от боровинки', 400, 2)]);
    order({ name: 'Красимир Тодоров', phone: '0898 109 876', address: 'ул. Отец Паисий 9', status: 'new', deliver_at: '20:30', created_at: ago(2) },
          [dish('Бургер с филе от Треска', 1090, 1), dish('Турска сусамена питка', 490, 1)]);
    save(db);
  }

  /* A small bar on the staff pages: demo notice, sample day, clear */
  function staffBar() {
    if (!document.getElementById('app') || document.getElementById('demoBar')) return;
    const note = document.getElementById('loginNote');
    if (note) note.insertAdjacentHTML('beforebegin', '<p style="color:#8fd6ff;font-size:.9rem">Демо: влиза се с която и да е парола.</p>');
    const bar = document.createElement('div');
    bar.id = 'demoBar';
    bar.innerHTML = '<b>Демо</b><span>Данните се пазят само в този браузър.</span><button type="button" data-demo="sample">Примерен ден</button><button type="button" data-demo="clear">Изчисти</button>';
    bar.style.cssText = 'display:flex;align-items:center;gap:10px;flex-wrap:wrap;width:fit-content;max-width:100%;margin:18px 0 -8px;padding:8px 8px 8px 16px;border-radius:22px;background:#241f19;box-shadow:inset 0 0 0 1px rgba(143,214,255,.45);font:500 .86rem/1.2 Onest,system-ui,sans-serif;color:#ecd8aa';
    bar.querySelector('b').style.cssText = 'color:#8fd6ff;letter-spacing:.06em;text-transform:uppercase;font-size:.78rem';
    bar.querySelectorAll('button').forEach(b => { b.style.cssText = 'padding:8px 14px;border:0;border-radius:999px;cursor:pointer;background:linear-gradient(180deg,#221f1a,#171512);box-shadow:inset 0 1px 0 rgba(255,228,170,.08);color:#f2b544;font:600 .84rem Onest,system-ui,sans-serif'; });
    bar.addEventListener('click', e => {
      const b = e.target.closest('[data-demo]'); if (!b) return;
      if (b.dataset.demo === 'sample') sample();
      else { const db = blank(); db.couriers = load().couriers; save(db); }
      location.reload();
    });
    const main = document.querySelector('#app main');
    if (main) main.prepend(bar); else document.body.append(bar);
  }
  function startDemo() {
    demo = true;
    document.documentElement.dataset.demo = '';
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', staffBar); else staffBar();
  }

  /* ---------- fetch: real server first, this browser if there is none ---------- */
  window.fetch = async (input, init = {}) => {
    const url = new URL(typeof input === 'string' ? input : input.url, location.href);
    const at = url.pathname.indexOf('/api/');
    if (at < 0 || url.origin !== location.origin) return realFetch(input, init);
    if (demo !== true) {
      try {
        const r = await realFetch(input, init);
        if ((r.headers.get('Content-Type') || '').includes('application/json') || local) { demo = false; return r; }
      } catch (err) { if (local) throw err; }
      startDemo();
    }
    const method = (init.method || 'GET').toUpperCase();
    let body = {};
    try { body = init.body ? JSON.parse(init.body) : {}; } catch {}
    try {
      const [status, data] = handle(method, url.pathname.slice(at + 5).replace(/\/$/, ''), url.searchParams, body);
      return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
    } catch (err) {
      const status = err instanceof Bad ? err.status : 500;
      return new Response(JSON.stringify({ error: err.message || 'Грешка.' }), { status, headers: { 'Content-Type': 'application/json' } });
    }
  };
})();
