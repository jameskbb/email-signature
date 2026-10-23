# Email Signature

A static email signature editor for local use and GitHub Pages. No application dependencies or build step. The browser loads index.html, styles.css, signature.js, template.js, and app.js directly.

## Run and verify

- Open index.html, or run `python3 -m http.server 8000 --bind 127.0.0.1`.
- Node 22 or later: `npm test` runs the renderer tests and repository checks without installing dependencies.
- Browser verification: `npm ci`, `npx playwright install chromium`, then `npm run test:browser` while the local server is running. It also regenerates `docs/images/editor-desktop.png` and `docs/images/editor-mobile.png`.
- A UI change updates the README screenshots in the same change using that browser command.
- The README title card must be the first element after its H1. Keep `docs/src/title-card.html` and `scripts/render-title-card.mjs` committed; `npm run docs:title` regenerates `docs/images/readme-title-email-signature.png` at 1200 x 440 with deviceScaleFactor 2. Refresh it in the same change when the project's appearance or depicted signature changes.

## Conventions

- main is the only branch; run checks, commit, and push main when authorized. No prod branch. GitHub Pages can serve main at the root.
- Keep the app static. Playwright is a development-only dependency.
- Keep CLAUDE.md and AGENTS.md identical.
- No em dashes in any file or commit message.
- Never store real contact details or secrets as sample data.
- Escape user content and restrict URL schemes before inserting exported HTML.
- Commits use the contributor's own authorship without automated co-author trailers.
