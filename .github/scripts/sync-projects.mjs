// Adds every folder in sites/ that has no entry in projects.js yet, so a new site shows up
// without editing anything by hand. Run from the repo root:
//   node .github/scripts/sync-projects.mjs
// The deploy runs it too, so dropping a folder into sites/ and pushing is enough.
// The new entry is a demo with the name, description and tech found in the site itself;
// improve it by hand later (the script never touches entries that already exist).
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';

const root = process.argv[2] || '.';
const file = join(root, 'projects.js');
const src = readFileSync(file, 'utf8');
const box = { window: {} };
vm.runInNewContext(src, box, { filename: 'projects.js' });
const known = new Set((box.window.PROJECTS || []).map(p => p.path));

const sitesDir = join(root, 'sites');
if (!existsSync(sitesDir)) process.exit(0);

const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const decode = s => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
const today = new Date().toISOString().slice(0, 10);
const q = s => JSON.stringify(s);

function walk(dir, depth = 0) {
  let out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === '.git' || e.name === 'node_modules' || e.name === 'data') continue;
    const full = join(dir, e.name);
    if (e.isDirectory() && depth < 3) out = out.concat(walk(full, depth + 1));
    else if (e.isFile()) out.push(full);
  }
  return out;
}

const added = [];
for (const e of readdirSync(sitesDir, { withFileTypes: true })) {
  if (!e.isDirectory()) continue;
  const path = `sites/${e.name}/`;
  if (known.has(path)) continue;
  const dir = join(sitesDir, e.name);
  const index = join(dir, 'index.html');
  if (!existsSync(index)) continue;

  const html = readFileSync(index, 'utf8');
  const title = (html.match(/<title[^>]*>([^<]*)<\/title>/i) || [])[1];
  const desc = (html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) ||
                html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i) || [])[1];
  const name = decode(title || e.name).split(/\s+[·|–—-]\s+/)[0] || e.name;

  const files = walk(dir).map(f => f.toLowerCase());
  const has = ext => files.some(f => f.endsWith(ext));
  const tech = ['HTML', 'CSS'];
  if (has('.js')) tech.push('JavaScript');
  if (has('.py')) tech.push('Python');
  const tags = ['web'];
  if (has('.py')) tags.push('backend');

  const pages = [{ path: '', label: { bg: 'Начало', en: 'Home' } }];
  for (const sub of readdirSync(dir, { withFileTypes: true })) {
    if (sub.isDirectory() && existsSync(join(dir, sub.name, 'index.html'))) {
      pages.push({ path: `${sub.name}/`, label: { bg: sub.name, en: sub.name } });
    }
  }
  const d = decode(desc || '');
  const id = slug(e.name) || 'site';
  const entry = `  {
    id: ${q(id)},
    name: ${q(name)},
    path: ${q(path)},
    status: 'demo',
    by: ['Izu83'],
    started: ${q(today)},
    updated: ${q(today)},
    category: { bg: 'Нов сайт', en: 'New site' },
    description: {
      bg: ${q(d || 'Добавен автоматично. Описанието предстои.')},
      en: ${q(d || 'Added automatically. The description is still to come.')}
    },
    tech: ${JSON.stringify(tech)},
    tags: ${JSON.stringify(tags)},
    pages: ${JSON.stringify(pages).replace(/"(\w+)":/g, '$1:').replace(/"/g, "'")},
    notes: {
      bg: 'Добавен автоматично от sync-projects. Допълнете описанието и етикетите.',
      en: 'Added automatically by sync-projects. Fill in the description and tags.'
    }
  },
`;
  added.push({ id, entry });
}

if (!added.length) { console.log('sync-projects: nothing new in sites/.'); process.exit(0); }

const marker = 'window.PROJECTS = [\n';
const at = src.indexOf(marker);
if (at < 0) { console.error('::error file=projects.js::sync-projects: could not find "window.PROJECTS = ["'); process.exit(1); }
const cut = at + marker.length;
writeFileSync(file, src.slice(0, cut) + added.map(a => a.entry).join('') + src.slice(cut));
console.log(`sync-projects: added ${added.map(a => a.id).join(', ')}.`);
