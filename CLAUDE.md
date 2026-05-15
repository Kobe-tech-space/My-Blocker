# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run build    # Build static site (output to build/)
npm run clean    # Remove build directory
```

## Architecture

```
source/posts/*.md   →  build.js  →  build/ (static HTML/CSS/JS site)
source/pages/*.md   →             →  templates/ (base + content templates)
                                   →  assets/ (copied to build/assets/)
```

- `build.js` — Single-file build script. Reads Markdown, renders templates, outputs static site. Run via `npm run build` or `node build.js`.
- `templates/base.html` — HTML shell with header, footer, SEO meta, CSS/JS references. Uses `{{ placeholder }}` syntax.
- `templates/post.html` — Article detail body (inserted into base's `{{ content }}`).
- `templates/list.html` — Post list body (used by homepage and tag pages).
- `templates/tag-list.html` — Tag cloud body.
- `assets/css/style.css` — All styles including light/dark mode via CSS custom properties.
- `assets/js/theme.js` — Dark mode toggle with localStorage persistence.
- `assets/js/search.js` — Client-side search against search-index.json.

## Key Patterns

- Template rendering uses simple `{{ key }}` regex replacement — no template library.
- Two-level rendering: content template first, then base template wrapping with `{{ content }}`.
- `base_path` variable handles relative path differences (root vs `posts/` vs `tags/`).
- Frontmatter fields: `title`, `date`, `tags`, `description`, `slug` (auto-derived from filename).
- Helper functions: `escapeHtml()`, `slugify()`, `parseDate()`, `formatDate()` for safe output.
