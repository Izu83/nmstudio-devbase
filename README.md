# NMStudio Devbase

Our base for every site we make. Each project's files are kept in `sites/`, and the page
lists them all. Click one to open it live in a desktop, tablet or phone frame, switch between
its pages, and read our notes on it (client, who built it, dates, how to run it).

It looks like nmstudio.info, but it's for the two of us. The pages tell Google not to index them.

## Adding a project

1. Copy the site's folder into `sites/`, e.g. `sites/NewClient/`.
   Leave out anything secret (passwords, databases, `.env`). See the warning below.
2. Add an entry at the top of the list in [`projects.js`](projects.js). Every field is explained
   in that file. Only `id`, `name` and `path` are required:

   ```js
   {
     id: 'newclient',
     name: 'New Client',
     path: 'sites/NewClient/',
     status: 'progress',          // live | progress | demo | archived
     client: 'New Client Ltd, Sofia',
     by: ['Николай', 'Митко'],
     started: '2026-11-10',
     updated: '2026-11-20',
     category: { bg: 'Онлайн магазин', en: 'Online shop' },
     description: { bg: '…', en: '…' },
     tech: ['HTML', 'CSS', 'JavaScript'],
     pages: [
       { path: '', label: { bg: 'Начало', en: 'Home' } },
       { path: 'shop/', label: { bg: 'Магазин', en: 'Shop' } }
     ],
     notes: { bg: 'Какво остава, особености…', en: '…' },
     run: 'npx serve .',
     live: 'https://newclient.bg',
     repo: 'https://github.com/…'
   }
   ```

3. Run `node .github/scripts/check.mjs`, then commit and push. The site updates within a minute or two.

A site hosted somewhere else can go in without copying its files: put its full address in `path`
(`path: 'https://newclient.bg/'`). It still shows in the frame, but the thumbnail doesn't scroll on
hover, and the address bar can't follow the pages you click to.

Sites must use relative links (`assets/style.css`, not `/assets/style.css`). Here they live under
`/nmstudio-devbase/sites/<name>/`, not at the root of a domain.

## Categories: Проекти · Завършени · В работа · Демо

The tabs above the list filter the projects: all of them, finished (`live`), still in progress
(`progress`) and demos made for a business to see (`demo`).

To move a project to another category, click the status pill on its card (or in the preview's
"About the project" panel) and pick the new one. This needs you to be signed in (see below). The
change is saved to [`store/status.js`](store/status.js) in the repo, so you both see it: you see it
right away, and the public site updates within a minute after the deploy. `status` in `projects.js`
is only the starting category.

## The admin panel (`admin/`)

Money, per project:

- **Split**: what percentage of every payment each person takes, e.g. you 35%, the other 0% and a
  third person 65%. The two of you are set up once (Settings); your share is "our profit", and
  everyone else in a split counts as from outside.
- **Payments**: the build ("Изработка"), **maintenance** paid every month or every year (for
  finished and in-progress projects), and anything else with your own text ("Друго": a domain,
  photos, a new page…). A payment can have its own split if it's shared differently.
- **To be paid**: every unpaid payment and every maintenance month or year that's due, with a
  "Paid" button. Paid maintenance periods are ticked on the payment as chips.
- At the top: collected, our profit (and what each person got), what's still to be paid, and
  maintenance income a month. You can show a single year.
- "Other income" is for money that isn't from a particular project.

### Signing in

The site is static, so the panel saves to the repo through the GitHub API. Each of you signs in
once per device with a GitHub token; it's kept only in that browser.

- Repo owner (Izu83): [new fine-grained token](https://github.com/settings/personal-access-tokens/new),
  Repository access: only `nmstudio-devbase`, Permissions: **Contents: Read and write**.
- The other one: be added as a collaborator on the repo (Settings → Collaborators), then make a
  [classic token](https://github.com/settings/tokens/new?scopes=public_repo&description=NMStudio%20Devbase)
  with `public_repo`. Fine-grained tokens can't reach another person's repo.

The same sign-in lets you move projects between categories.

### The money is encrypted

The repo and the site are public, so the money data is encrypted in the browser (AES-256-GCM, with a
key made from your shared password) before it's saved to `store/finance.enc.json`. Without the
password nobody can read it, including GitHub. **There's no way to get the data back if you both
forget the password**, so keep it somewhere safe. You can change it in Settings.

Saving the money data doesn't redeploy the site (`[skip ci]`); the panel reads it straight from
the repo. If you both change something at the same time, both changes are kept.

## Opening it on your computer

The page has to be served over http, not opened as a file:

```
python -m http.server 5180
```

Then open http://devbase.localhost:5180/. Use `devbase.localhost`, not `localhost`: Sunny Complex
switches to its demo mode on any host except `localhost`/`127.0.0.1`, and without its own server its
booking and admin pages need that demo mode.

## GitHub Pages

Repository: https://github.com/Izu83/nmstudio-devbase. Site: https://izu83.github.io/nmstudio-devbase/

The site is published by GitHub Actions ([`.github/workflows/pages.yml`](.github/workflows/pages.yml)).
For that, **Settings → Pages → Source** must be set to **GitHub Actions**. Every push to `main` then:

1. checks `projects.js`: it runs, ids are unique, every project folder and page has its `index.html`,
   and no project has its own `.git` folder; checks the categories in `store/status.js`, and that
   `store/finance.enc.json` is encrypted;
2. checks that nothing secret is in git (`sites/*/data/`, `*.db`, `admin-password.txt`, `.env`, keys);
3. builds the site without `README.md` and `.github/`, and adds the commit to the style and script
   addresses (`style.css?v=db2e870`), so browsers don't keep showing the old version;
4. publishes it.

If a check fails, nothing is published and the old version stays online. The Actions tab says what's
wrong. To run the same check before pushing:

```
node .github/scripts/check.mjs
```

To publish again without a new commit: Actions → Deploy to GitHub Pages → Run workflow.

### Projects that have their own git repository

The base keeps its own copy of every project's files. Copy a project in **without its `.git`
folder**: with it, git stores only an empty link instead of the files, and the preview is a 404.
The project's own repository stays the place where you work on it; to update the base, copy the
files over again, then commit and push.

On Windows, this copies a project without `.git` and without its `data/` folder:

```
robocopy D:\Projects\Sites\NewClient sites\NewClient /E /XD .git data .claude node_modules
```

## Before you push

- **This site is public.** On a free GitHub account, Pages is visible to anyone who has the
  address, even when the repository is private. Never put passwords, client phone numbers or other
  private data in `projects.js` or the project folders.
- `.gitignore` keeps out every `sites/*/data/` folder, `*.db` files and `admin-password.txt`.
  Check `git status` after copying in a new project.
- All projects run on the same address, so they share the browser's localStorage. If two projects
  use the same storage key, they'll see each other's data in the preview.

## Files

| File | What it is |
|---|---|
| `index.html` | The list of projects |
| `preview/index.html` | One project in a device frame (`preview/?p=<id>&page=<path>&d=desktop\|tablet\|mobile`) |
| `projects.js` | The projects and our notes on them |
| `admin/index.html` | The admin panel: money, splits, maintenance |
| `store/status.js` | Categories set with the button on the cards |
| `store/finance.enc.json` | The money data, encrypted (made on the first sign-in) |
| `assets/` | Styles and scripts of the base |
| `sites/` | The projects themselves |
| `.github/workflows/pages.yml` | Checks, builds and publishes the site on every push |
| `.github/scripts/check.mjs` | The check (`node .github/scripts/check.mjs`) |
