// Checks the base before it goes online. Run from the repo root (or pass the folder to check):
//   node .github/scripts/check.mjs [folder]
// It fails if projects.js is broken, a project's folder or page is missing,
// or something secret (passwords, databases, .env) is about to be published.
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import vm from 'node:vm';
import { execSync } from 'node:child_process';

const root = process.argv[2] || '.';
const errors = [];
const warnings = [];

/* projects.js is a script that sets window.PROJECTS */
const sandbox = { window: {} };
try {
  vm.runInNewContext(readFileSync(join(root, 'projects.js'), 'utf8'), sandbox, { filename: 'projects.js' });
} catch (e) {
  console.error(`::error file=projects.js::projects.js doesn't run: ${e.message}`);
  process.exit(1);
}
const projects = sandbox.window.PROJECTS;
if (!Array.isArray(projects)) {
  console.error('::error file=projects.js::projects.js must set window.PROJECTS to a list');
  process.exit(1);
}

const STATUSES = ['live', 'progress', 'demo', 'archived'];
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const ids = new Set();
const hasIndex = dir => existsSync(join(dir, 'index.html'));

projects.forEach((p, i) => {
  const who = p && p.id ? `"${p.id}"` : `#${i + 1}`;
  if (!p || typeof p !== 'object') return errors.push(`Project ${who} is not an object`);
  for (const f of ['id', 'name', 'path']) if (!p[f]) errors.push(`Project ${who} has no ${f}`);
  if (p.id) {
    if (ids.has(p.id)) errors.push(`Two projects use the id "${p.id}"`);
    ids.add(p.id);
    if (!/^[a-z0-9-]+$/.test(p.id)) warnings.push(`Project ${who}: use lowercase letters, digits and "-" in the id`);
  }
  if (p.status && !STATUSES.includes(p.status)) errors.push(`Project ${who}: status must be one of ${STATUSES.join(', ')}`);
  for (const f of ['started', 'updated']) if (p[f] && !DATE.test(p[f])) errors.push(`Project ${who}: ${f} must look like 2026-11-05`);
  if (!p.path) return;

  if (/^https?:\/\//i.test(p.path)) return;           // hosted somewhere else
  if (!p.path.endsWith('/')) errors.push(`Project ${who}: path must end with "/"`);
  const dir = join(root, p.path);
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return errors.push(`Project ${who}: folder ${p.path} doesn't exist`);
  if (existsSync(join(dir, '.git'))) errors.push(`Project ${who}: ${p.path} has its own .git folder, so git stores only a link, not the files`);
  for (const pg of p.pages || []) {
    const page = pg && typeof pg.path === 'string' ? pg.path : null;
    if (page === null) { errors.push(`Project ${who}: a page has no path`); continue; }
    if (page.endsWith('.html') ? !existsSync(join(dir, page)) : !hasIndex(join(dir, page))) {
      errors.push(`Project ${who}: page "${page || '/'}" has no ${page.endsWith('.html') ? 'file' : 'index.html'} in ${p.path}`);
    }
  }
  if (!(p.pages || []).length && !hasIndex(dir)) errors.push(`Project ${who}: ${p.path} has no index.html`);
});

/* Nothing secret in sites/. In a git checkout only tracked files count (ignored ones never go online). */
const SECRET = [/^admin-password\.txt$/i, /\.db$/i, /\.sqlite3?$/i, /^\.env(\..*)?$/i, /\.pem$/i, /\.key$/i];
let tracked = null;
if (existsSync(join(root, '.git'))) {
  try { tracked = execSync('git ls-files -z sites', { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean); } catch {}
}
if (tracked) {
  for (const rel of tracked) {
    const name = rel.split('/').pop();
    if (/^sites\/[^/]+\/data\//.test(rel)) errors.push(`${rel} is in git (data/ folders are meant to stay private)`);
    else if (SECRET.some(r => r.test(name))) errors.push(`${rel} looks secret and is in git`);
  }
}
function scan(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    const rel = relative(root, full).replace(/\\/g, '/');
    if (e.isDirectory()) {
      if (e.name === '.git') continue;
      if (e.name === 'data' && /^sites\/[^/]+\/data$/.test(rel)) { errors.push(`${rel}/ would be published (it's meant to stay private)`); continue; }
      scan(full);
    } else if (SECRET.some(r => r.test(e.name))) {
      errors.push(`${rel} looks secret and would be published`);
    }
  }
}
if (!tracked && existsSync(join(root, 'sites'))) scan(join(root, 'sites'));

for (const w of warnings) console.log(`::warning::${w}`);
for (const e of errors) console.log(`::error::${e}`);
if (errors.length) {
  console.log(`\n${errors.length} problem${errors.length > 1 ? 's' : ''} found. Nothing was published.`);
  process.exit(1);
}
console.log(`OK: ${projects.length} project${projects.length === 1 ? '' : 's'}, all folders and pages found, nothing secret.`);
