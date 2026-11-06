/* The restaurant floor plan, drawn from the owner's sketch. Shared by /reservation and /admin.
   Table data lives in tables.js so the server checks bookings against the same list. */
(() => {
  const NS = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs = {}) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
  const CW = 14, CH = 8, GAP = 4, BENCH = 13;

  /* Walls, halls, the passage, the bar and the door. Coordinates are in a 1040×690 space. */
  const ROOM = `
    <defs>
      <linearGradient id="gFree" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b342a"/><stop offset="1" stop-color="#211d18"/></linearGradient>
      <linearGradient id="gSel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe4a6"/><stop offset=".45" stop-color="#f6c05a"/><stop offset="1" stop-color="#d99a2b"/></linearGradient>
      <linearGradient id="gWood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a4527"/><stop offset="1" stop-color="#2e2416"/></linearGradient>
      <linearGradient id="gBench" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a3826"/><stop offset="1" stop-color="#2a1f15"/></linearGradient>
      <pattern id="hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="7" fill="#15120f"/><rect width="3" height="7" fill="#252019"/></pattern>
      <pattern id="tiles" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="40" height="40" fill="#100e0c"/><path d="M40 0H0V40" fill="none" stroke="rgba(242,181,68,.045)"/></pattern>
      <filter id="lift" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="3" stdDeviation="2.5" flood-color="#000" flood-opacity=".75"/></filter>
      <filter id="glow" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="0" stdDeviation="7" flood-color="#f2b544" flood-opacity=".55"/></filter>
    </defs>
    <rect x="10" y="10" width="1020" height="640" rx="24" fill="url(#tiles)" stroke="rgba(242,181,68,.35)" stroke-width="3"/>
    <g class="zone" data-zone="smoke"><rect x="30" y="74" width="440" height="400" rx="18"/></g>
    <g class="zone" data-zone="clean"><rect x="570" y="74" width="440" height="400" rx="18"/></g>
    <g class="zl" data-zone="smoke" transform="translate(250 44)">
      <rect x="-68" y="-17" width="136" height="34" rx="17"/>
      <g transform="translate(-52 -10) scale(.8333)" class="ic"><rect x="2.5" y="15" width="14" height="4" rx="1"/><path d="M20.5 15v4M16.5 3.5c0 1.8-1.8 1.8-1.8 3.6s1.8 1.8 1.8 3.6M20.5 3.5c0 1.8-1.8 1.8-1.8 3.6s1.8 1.8 1.8 3.6"/></g>
      <text x="-24" y="0">Пушачи</text>
    </g>
    <g class="zl" data-zone="clean" transform="translate(790 44)">
      <rect x="-80" y="-17" width="160" height="34" rx="17"/>
      <g transform="translate(-64 -10) scale(.8333)" class="ic"><circle cx="12" cy="12" r="9.5"/><path d="M5.3 5.3l13.4 13.4M6 12.5h6.5M16 12.5h2"/></g>
      <text x="-36" y="0">Непушачи</text>
    </g>
    <path class="walk" d="M412 628V512Q412 494 432 494H500Q520 494 520 474V96"/>
    <polygon class="fixture" points="962,180 1000,180 992,334 944,334"/>
    <path class="bar-top" d="M560 650V606Q560 568 598 568H742Q780 568 780 606V650"/>
    <text class="label" x="670" y="618">Бар</text>
    <line x1="372" y1="650" x2="452" y2="650" stroke="#0a0908" stroke-width="7"/>
    <path d="M372 650V574" stroke="rgba(242,181,68,.5)" stroke-width="3" stroke-linecap="round"/>
    <path d="M372 574A76 76 0 0 1 448 650" fill="none" stroke="rgba(242,181,68,.25)" stroke-width="1.5" stroke-dasharray="4 5"/>
    <text class="label" x="412" y="676">Вход</text>
    <g class="tables"></g>`;

  function chairs(t) {
    if (t.round) {
      return Array.from({ length: t.seats }, (_, i) => {
        const a = ((i + .5) / t.seats) * Math.PI * 2 - Math.PI / 2, R = t.r + GAP + CH / 2;
        const x = t.cx + R * Math.cos(a), y = t.cy + R * Math.sin(a);
        return { x: x - CW / 2, y: y - CH / 2, w: CW, h: CH, rot: `rotate(${(a * 180 / Math.PI + 90).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})` };
      });
    }
    const { x, y, w, h, seats: n } = t, out = [], square = w / h < 1.3;
    const row = (k, yy) => { for (let i = 0; i < k; i++) out.push({ x: x + w * (i + .5) / k - CW / 2, y: yy, w: CW, h: CH }); };
    const side = xx => out.push({ x: xx, y: y + h / 2 - CW / 2, w: CH, h: CW });
    if (square && n >= 4) {
      const k = (n - 2) / 2;
      row(k, y - GAP - CH); row(k, y + h + GAP); side(x - GAP - CH); side(x + w + GAP);
    } else { row(Math.ceil(n / 2), y - GAP - CH); row(Math.floor(n / 2), y + h + GAP); }
    return out;
  }

  /* Draws the room and every table into an <svg>. Returns the tables by id, each with .g (its element) and .c (its centre). */
  function draw(svg, floor) {
    svg.setAttribute('viewBox', '0 0 1040 690');
    svg.innerHTML = ROOM;
    const layer = svg.querySelector('.tables');
    floor.tables.forEach(t => {
      const cx = t.round ? t.cx : t.x + t.w / 2, cy = t.round ? t.cy : t.y + t.h / 2;
      t.c = [cx, cy];
      const g = el('g', { class: 'tbl', 'data-id': t.id, tabindex: 0, role: 'button' });
      const body = el('g', t.rot ? { transform: `rotate(${t.rot} ${cx} ${cy})` } : {});
      if (t.booth) {
        /* A booth: upholstered benches along both long sides instead of chairs */
        [t.y - GAP - BENCH, t.y + t.h + GAP].forEach(by => body.append(el('rect', { class: 'bench', x: t.x - 4, y: by, width: t.w + 8, height: BENCH, rx: 6 })));
      } else {
        chairs(t).forEach(c => body.append(el('rect', { class: 'chair', x: c.x.toFixed(1), y: c.y.toFixed(1), width: c.w, height: c.h, rx: 3, ...(c.rot ? { transform: c.rot } : {}) })));
      }
      body.append(t.round ? el('circle', { class: 'top', cx, cy, r: t.r }) : el('rect', { class: 'top', x: t.x, y: t.y, width: t.w, height: t.h, rx: 9 }));
      const num = el('text', { x: cx, y: cy + 1 }); num.textContent = t.id;
      g.append(body, num);
      layer.append(g);
      t.g = g;
    });
    return Object.fromEntries(floor.tables.map(t => [t.id, t]));
  }

  /* tables.js must be loaded before this file */
  async function load() {
    if (!window.FLOOR_DATA) throw new Error('assets/tables.js is missing');
    return window.FLOOR_DATA;
  }

  /* "до 6 души · Пушачи · сепаре" */
  const describe = (t, floor) => `до ${t.seats} ${t.seats === 1 ? 'човек' : 'души'} · ${floor.zones[t.zone]}${t.booth ? ' · сепаре' : ''}`;

  window.Floor = { load, draw, describe };
})();
