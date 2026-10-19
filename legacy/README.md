# legacy/: the old jbbru.com

This folder holds the previous version of jbbru.com, moved here with `git mv` during Phase 1b of the redesign so its history is kept.

- **What it is:** a Node.js + Express 4 app with EJS views (`src/`), turned into static HTML by `build-static.js` into `static/`. It is deployed to GitHub Pages from `main` by the workflows in `.github/workflows/`. `OLD-README.md` is its original README.
- **Reference only.** Nothing here is maintained or built on the `redesign` branch. It stays only so content and assets can be looked up while the new site is built.
- **Never imported.** The new app at the repo root must never import, bundle or link to any file in `legacy/`. It is excluded from TypeScript, ESLint and Tailwind.
- **Deleted at launch.** This folder is removed before `redesign` is merged into `main` (see the launch checklist).

To run it locally for reference: `cd legacy && npm ci && npm run dev` (port 3000), or `npm run build-static` to regenerate `static/`.
