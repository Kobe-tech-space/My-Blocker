# Static Blog Design Spec

## Overview

A lightweight static blog built with pure HTML/CSS/JS. Articles are written in Markdown under `source/posts/`. A Node.js build script (`build.js`) converts them to static HTML files in `build/`, which can be deployed to any static host.

## Tech Stack

- **Output:** Pure HTML, CSS, JavaScript (no runtime framework)
- **Build:** Node.js with `marked` (Markdown→HTML) and `gray-matter` (frontmatter parsing)
- **Search:** Client-side, via pre-generated JSON index
- **Comments:** Giscus (GitHub Discussions-based, free)
- **No other dependencies**

## Directory Structure

```
/
├── source/
│   ├── posts/                 # Markdown articles (*.md)
│   └── pages/                 # Standalone pages (about.md, etc.)
├── templates/
│   ├── base.html              # HTML shell: <html> + header + footer
│   ├── post.html              # Article detail template
│   ├── list.html              # Homepage / tag list template
│   └── tag-list.html          # All-tags overview template
├── assets/
│   ├── css/style.css          # All styles (light + dark mode)
│   ├── js/
│   │   ├── theme.js           # Dark mode toggle
│   │   └── search.js          # Client-side search
│   └── images/
├── build.js                   # Build entry point
├── package.json
└── build/                     # Generated site (deploy target)
    ├── index.html
    ├── posts/<slug>.html
    ├── tags/<tag>.html
    ├── tags/index.html
    ├── about.html
    ├── assets/                # Copied from /assets/
    ├── rss.xml
    ├── sitemap.xml
    └── search-index.json
```

## Build Pipeline (`build.js`)

1. Clear `build/`, copy `assets/` → `build/assets/`
2. Read `source/posts/*.md`, parse each:
   - Frontmatter fields: `title`, `date`, `tags`, `description`, `slug` (auto-derived from filename if absent)
   - Body: Markdown → HTML via `marked`
3. Generate **article detail pages** → `build/posts/<slug>.html`
4. Generate **homepage** → `build/index.html` (articles sorted by date desc, paginated at 10 per page)
5. Generate **tag pages** → `build/tags/<tag>.html` and `build/tags/index.html`
6. Generate **standalone pages** from `source/pages/*.md`
7. Generate **RSS** → `build/rss.xml` (latest 20 articles, RSS 2.0)
8. Generate **sitemap** → `build/sitemap.xml` (all page URLs)
9. Generate **search index** → `build/search-index.json` (`[{title, slug, tags, description, date}, ...]`)

## Templating

Simple `{{ key }}` placeholder replacement using JavaScript template literals. No additional template library.

## Frontmatter Format

```yaml
---
title: My First Post
date: 2026-05-15
tags: [javascript, css]
description: An intro to frontend basics
---
```

`slug` defaults to the filename stem (e.g., `hello-world.md` → `hello-world`).

## UI Design

- **Layout:** Single-column, max-width 720px, centered. Reading-optimized.
- **Colors:** CSS custom properties with light/dark variants
  - Light: white bg `#fff`, dark text `#1a1a1a`, accent `#2563eb`, subtle bg `#f5f5f5`
  - Dark: dark bg `#1a1a1a`, light text `#e5e5e5`, accent `#60a5fa`, card bg `#2a2a2a`
- **Header (fixed):** Logo → Nav links (Home, Tags, About, RSS) → Search input → Dark mode toggle
- **Footer:** Copyright + RSS link
- **Responsive:** Padding adjusts on mobile; nav collapses as needed
- **Code blocks:** Light gray background, monospace font

## Dark Mode

- Default: respect `prefers-color-scheme`
- Toggle sets `data-theme="dark"` on `<html>`, CSS variables respond
- Preference persisted in `localStorage`

## Comments (Giscus)

- Embedded via `<script>` at the bottom of each article page
- Requires a public GitHub repo for Discussions storage
- `data-term` attribute set to article slug to map to the correct Discussion

## Search

- `search.js` fetches `search-index.json` and filters on `input` event
- Matches against title, tags, description
- Results shown in a dropdown panel; click navigates to article

## RSS

- `build/rss.xml`, RSS 2.0 format
- Latest 20 articles
- Linked from header/footer for auto-discovery

## SEO

- Per-page `<title>` and `<meta name="description">`
- Open Graph tags: `og:title`, `og:description`, `og:type`, `og:url`
- `<link rel="canonical">`
- `sitemap.xml`
- Semantic HTML: `<article>`, `<nav>`, `<main>`, `<time>`, `<h1>`–`<h3>`

## Deployment

Copy the `build/` directory to any static host (GitHub Pages, Netlify, Vercel, Cloudflare Pages, etc.).
