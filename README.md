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

3. Commit and push. GitHub Pages updates within a minute or two.

A site hosted somewhere else can go in without copying its files: put its full address in `path`
(`path: 'https://newclient.bg/'`). It still shows in the frame, but the thumbnail doesn't scroll on
hover, and the address bar can't follow the pages you click to.

Sites must use relative links (`assets/style.css`, not `/assets/style.css`). Here they live under
`/nmstudio-devbase/sites/<name>/`, not at the root of a domain.

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

Pages is set to **Settings → Pages → Deploy from a branch**, branch `main`, folder `/ (root)`.

Getting the base on a new computer (with the projects that are submodules):

```
git clone --recurse-submodules https://github.com/Izu83/nmstudio-devbase.git
```

### Projects that have their own git repository

A project with its own repository (like `sites/SunnyComplex`) is linked as a **submodule**: the base
stores which commit of that repository to show, and GitHub Pages fetches it when it builds. The
project's repository must be public.

- Add one: `git submodule add https://github.com/<user>/<repo>.git sites/<Name>`
- Show its latest version in the base: `git submodule update --remote sites/<Name>`, then commit and push.
  Until you do that, the base keeps showing the commit it was linked at.

A project without its own repository is simply copied into `sites/`. Don't copy a project in
together with its `.git` folder: git then stores only an empty link, and the preview is a 404.

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
| `assets/` | Styles and scripts of the base |
| `sites/` | The projects themselves |
