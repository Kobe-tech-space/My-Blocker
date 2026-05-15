# Static Blog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a lightweight static blog generator: Markdown in, HTML/CSS/JS out, deployable to any static host.

**Architecture:** A single Node.js build script (`build.js`) reads Markdown posts from `source/posts/`, parses frontmatter via `gray-matter` and Markdown via `marked`, then renders HTML pages using simple `{{ key }}` template replacement. Output lands in `build/` — a self-contained static site.

**Tech Stack:** Node.js, `marked`, `gray-matter`. No other dependencies. Output: pure HTML, CSS, JS.

---

### Task 1: Project Initialization

**Files:**
- Create: `package.json`
- Create: All empty directories

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p source/posts source/pages templates assets/css assets/js assets/images build
```

- [ ] **Step 2: Create package.json**

```json
{
  "name": "static-blog",
  "version": "1.0.0",
  "description": "A lightweight static blog generator",
  "private": true,
  "scripts": {
    "build": "node build.js",
    "clean": "rm -rf build"
  },
  "dependencies": {
    "gray-matter": "^4.0.3",
    "marked": "^15.0.0"
  }
}
```

- [ ] **Step 3: Install dependencies**

Run: `npm install`

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: init project with marked and gray-matter"
```

---

### Task 2: Build Script — Core Utilities

**Files:**
- Create: `build.js`

- [ ] **Step 1: Write build.js skeleton with config, file I/O helpers, and template engine**

```javascript
const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const matter = require('gray-matter');

// --- Config ---
const SOURCE_DIR = path.join(__dirname, 'source');
const POSTS_DIR = path.join(SOURCE_DIR, 'posts');
const PAGES_DIR = path.join(SOURCE_DIR, 'pages');
const TEMPLATE_DIR = path.join(__dirname, 'templates');
const BUILD_DIR = path.join(__dirname, 'build');
const ASSETS_DIR = path.join(__dirname, 'assets');
const SITE_URL = 'https://example.com'; // Change before deploy
const SITE_TITLE = 'My Blog';
const SITE_DESCRIPTION = 'A blog about web development';
const POSTS_PER_PAGE = 10;
const RSS_POST_COUNT = 20;

// --- Utilities ---
function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function copyDir(src, dest) {
  ensureDir(dest);
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(srcPath, destPath);
    else fs.copyFileSync(srcPath, destPath);
  }
}

function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf-8');
}

function writeFile(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf-8');
}

// Template cache
const templateCache = {};

function loadTemplate(name) {
  if (!templateCache[name]) {
    templateCache[name] = readFile(path.join(TEMPLATE_DIR, name));
  }
  return templateCache[name];
}

function render(template, data) {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
    return data[key] !== undefined ? data[key] : '';
  });
}

function renderPage(baseData, contentHtml) {
  const data = { ...baseData, content: contentHtml };
  return render(loadTemplate('base.html'), data);
}

console.log('Build script loaded. Run build() to start.');
```

- [ ] **Step 2: Verify syntax**

Run: `node -c build.js`
Expected: no output (syntax OK)

- [ ] **Step 3: Commit**

```bash
git add build.js
git commit -m "feat: add build script skeleton with core utilities"
```

---

### Task 3: Build Script — Post Parsing & Detail Pages

**Files:**
- Modify: `build.js`

- [ ] **Step 1: Add post parsing and detail page generation functions**

Append to `build.js`:

```javascript
// --- Post Parsing ---
function parsePost(filePath) {
  const raw = readFile(filePath);
  const { data, content } = matter(raw);
  const slug = data.slug || path.basename(filePath, '.md');
  const html = marked.parse(content);
  return {
    slug,
    title: data.title || slug,
    date: data.date ? new Date(data.date) : new Date(),
    dateFormatted: data.date || 'Unknown date',
    isoDate: data.date ? new Date(data.date).toISOString() : new Date().toISOString(),
    tags: data.tags || [],
    description: data.description || '',
    body: html,
  };
}

function getAllPosts() {
  const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.md'));
  return files
    .map(f => parsePost(path.join(POSTS_DIR, f)))
    .sort((a, b) => b.date - a.date);
}

function tagsToHtml(tags) {
  return tags.map(t => `<a href="/tags/${t}.html" class="tag">${t}</a>`).join('');
}

// --- Post Detail Pages ---
function generatePostPages(posts) {
  const baseTmpl = loadTemplate('base.html');
  const postTmpl = loadTemplate('post.html');

  for (const post of posts) {
    const tagsHtml = tagsToHtml(post.tags);
    const postContent = render(postTmpl, { ...post, tags_html: tagsHtml });
    const pageData = {
      title: `${post.title} - ${SITE_TITLE}`,
      description: post.description,
      og_type: 'article',
      og_url: `${SITE_URL}/posts/${post.slug}.html`,
      canonical: `${SITE_URL}/posts/${post.slug}.html`,
      base_path: '../',
      theme: '',
      extra_scripts: '',
    };
    writeFile(path.join(BUILD_DIR, 'posts', `${post.slug}.html`), renderPage(pageData, postContent));
  }
}
```

- [ ] **Step 2: Verify syntax**

Run: `node -c build.js`

- [ ] **Step 3: Commit**

```bash
git add build.js
git commit -m "feat: add post parsing and detail page generation"
```

---

### Task 4: Build Script — Homepage with Pagination

**Files:**
- Modify: `build.js`

- [ ] **Step 1: Add homepage generation function**

Append to `build.js`:

```javascript
// --- Homepage ---
function generateHomepage(posts) {
  const listTmpl = loadTemplate('list.html');
  const totalPages = Math.ceil(posts.length / POSTS_PER_PAGE) || 1;

  for (let page = 1; page <= totalPages; page++) {
    const start = (page - 1) * POSTS_PER_PAGE;
    const pagePosts = posts.slice(start, start + POSTS_PER_PAGE);

    const postsHtml = pagePosts.map(p => {
      const tagsHtml = tagsToHtml(p.tags);
      return `
        <article class="post-card">
          <h2><a href="posts/${p.slug}.html">${p.title}</a></h2>
          <div class="meta">
            <time datetime="${p.isoDate}">${p.dateFormatted}</time>
            <div class="tags">${tagsHtml}</div>
          </div>
          <p class="excerpt">${p.description}</p>
        </article>`;
    }).join('\n');

    let paginationHtml = '';
    if (totalPages > 1) {
      paginationHtml = '<nav class="pagination">';
      if (page > 1) {
        const prev = page === 2 ? 'index.html' : `page/${page - 1}.html`;
        paginationHtml += `<a href="../${prev}">← Newer</a>`;
      }
      if (page < totalPages) {
        paginationHtml += `<a href="../page/${page + 1}.html">Older →</a>`;
      }
      paginationHtml += '</nav>';
    }

    const listContent = render(listTmpl, { posts_html: postsHtml, pagination_html: paginationHtml });
    const pageData = {
      title: page === 1 ? SITE_TITLE : `${SITE_TITLE} - Page ${page}`,
      description: SITE_DESCRIPTION,
      og_type: 'website',
      og_url: page === 1 ? SITE_URL : `${SITE_URL}/page/${page}.html`,
      canonical: page === 1 ? SITE_URL : `${SITE_URL}/page/${page}.html`,
      base_path: '',
      theme: '',
      extra_scripts: '',
    };

    const outPath = page === 1
      ? path.join(BUILD_DIR, 'index.html')
      : path.join(BUILD_DIR, 'page', `${page}.html`);
    writeFile(outPath, renderPage(pageData, listContent));
  }
}
```

- [ ] **Step 2: Verify syntax**

Run: `node -c build.js`

- [ ] **Step 3: Commit**

```bash
git add build.js
git commit -m "feat: add homepage generation with pagination"
```

---

### Task 5: Build Script — Tag Pages

**Files:**
- Modify: `build.js`

- [ ] **Step 1: Add tag page generation functions**

Append to `build.js`:

```javascript
// --- Tag Pages ---
function generateTagPages(posts) {
  const listTmpl = loadTemplate('list.html');
  const tagMap = {};

  for (const post of posts) {
    for (const tag of post.tags) {
      if (!tagMap[tag]) tagMap[tag] = [];
      tagMap[tag].push(post);
    }
  }

  // Individual tag pages
  for (const [tag, tagPosts] of Object.entries(tagMap)) {
    const postsHtml = tagPosts.map(p => {
      const tagsHtml = tagsToHtml(p.tags);
      return `
        <article class="post-card">
          <h2><a href="../posts/${p.slug}.html">${p.title}</a></h2>
          <div class="meta">
            <time datetime="${p.isoDate}">${p.dateFormatted}</time>
            <div class="tags">${tagsHtml}</div>
          </div>
          <p class="excerpt">${p.description}</p>
        </article>`;
    }).join('\n');

    const listContent = render(listTmpl, { posts_html: postsHtml, pagination_html: '' });
    const pageData = {
      title: `Tag: ${tag} - ${SITE_TITLE}`,
      description: `${tagPosts.length} articles tagged "${tag}"`,
      og_type: 'website',
      og_url: `${SITE_URL}/tags/${tag}.html`,
      canonical: `${SITE_URL}/tags/${tag}.html`,
      base_path: '../',
      theme: '',
      extra_scripts: '',
    };
    writeFile(path.join(BUILD_DIR, 'tags', `${tag}.html`), renderPage(pageData, listContent));
  }

  // Tag overview page
  const tagListTmpl = loadTemplate('tag-list.html');
  const tagsHtml = Object.entries(tagMap)
    .sort((a, b) => b[1].length - a[1].length)
    .map(([tag, tagPosts]) =>
      `<li><a href="${tag}.html">${tag}</a> <span class="count">(${tagPosts.length})</span></li>`
    ).join('\n');

  const tagListContent = render(tagListTmpl, { tags_html: tagsHtml });
  const pageData = {
    title: `Tags - ${SITE_TITLE}`,
    description: 'Browse articles by tag',
    og_type: 'website',
    og_url: `${SITE_URL}/tags/index.html`,
    canonical: `${SITE_URL}/tags/index.html`,
    base_path: '../',
    theme: '',
    extra_scripts: '',
  };
  writeFile(path.join(BUILD_DIR, 'tags', 'index.html'), renderPage(pageData, tagListContent));
}
```

- [ ] **Step 2: Verify syntax**

Run: `node -c build.js`

- [ ] **Step 3: Commit**

```bash
git add build.js
git commit -m "feat: add tag page generation"
```

---

### Task 6: Build Script — Standalone Pages

**Files:**
- Modify: `build.js`

- [ ] **Step 1: Add standalone page generation**

Append to `build.js`:

```javascript
// --- Standalone Pages ---
function generatePages() {
  if (!fs.existsSync(PAGES_DIR)) return [];
  const files = fs.readdirSync(PAGES_DIR).filter(f => f.endsWith('.md'));
  const pages = [];

  for (const file of files) {
    const parsed = parsePost(path.join(PAGES_DIR, file));
    const postTmpl = loadTemplate('post.html');
    const tagsHtml = tagsToHtml(parsed.tags);
    const postContent = render(postTmpl, { ...parsed, tags_html: tagsHtml });
    const pageData = {
      title: `${parsed.title} - ${SITE_TITLE}`,
      description: parsed.description,
      og_type: 'website',
      og_url: `${SITE_URL}/${parsed.slug}.html`,
      canonical: `${SITE_URL}/${parsed.slug}.html`,
      base_path: '',
      theme: '',
      extra_scripts: '',
    };
    writeFile(path.join(BUILD_DIR, `${parsed.slug}.html`), renderPage(pageData, postContent));
    pages.push(parsed);
  }
  return pages;
}
```

- [ ] **Step 2: Verify syntax**

Run: `node -c build.js`

- [ ] **Step 3: Commit**

```bash
git add build.js
git commit -m "feat: add standalone page generation"
```

---

### Task 7: Build Script — RSS, Sitemap, Search Index

**Files:**
- Modify: `build.js`

- [ ] **Step 1: Add RSS, sitemap, and search index generators**

Append to `build.js`:

```javascript
// --- RSS ---
function generateRSS(posts) {
  const items = posts.slice(0, RSS_POST_COUNT).map(p => `
    <item>
      <title><![CDATA[${p.title}]]></title>
      <link>${SITE_URL}/posts/${p.slug}.html</link>
      <guid>${SITE_URL}/posts/${p.slug}.html</guid>
      <description><![CDATA[${p.description}]]></description>
      <pubDate>${new Date(p.date).toUTCString()}</pubDate>
    </item>`).join('\n');

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${SITE_TITLE}</title>
    <link>${SITE_URL}</link>
    <description>${SITE_DESCRIPTION}</description>
    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml"/>
    ${items}
  </channel>
</rss>`;

  writeFile(path.join(BUILD_DIR, 'rss.xml'), rss);
}

// --- Sitemap ---
function generateSitemap(posts, pages) {
  const postUrls = posts.map(p =>
    `  <url><loc>${SITE_URL}/posts/${p.slug}.html</loc><lastmod>${p.isoDate}</lastmod></url>`
  ).join('\n');

  const pageUrls = pages.map(p =>
    `  <url><loc>${SITE_URL}/${p.slug}.html</loc></url>`
  ).join('\n');

  // Collect all tags
  const tags = new Set();
  posts.forEach(p => p.tags.forEach(t => tags.add(t)));
  const tagUrls = [...tags].map(t =>
    `  <url><loc>${SITE_URL}/tags/${t}.html</loc></url>`
  ).join('\n');

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${SITE_URL}</loc></url>
  <url><loc>${SITE_URL}/tags/index.html</loc></url>
${tagUrls}
${postUrls}
${pageUrls}
</urlset>`;

  writeFile(path.join(BUILD_DIR, 'sitemap.xml'), sitemap);
}

// --- Search Index ---
function generateSearchIndex(posts) {
  const index = posts.map(p => ({
    title: p.title,
    slug: p.slug,
    tags: p.tags,
    description: p.description,
    date: p.dateFormatted,
  }));
  writeFile(path.join(BUILD_DIR, 'search-index.json'), JSON.stringify(index));
}
```

- [ ] **Step 2: Verify syntax**

Run: `node -c build.js`

- [ ] **Step 3: Commit**

```bash
git add build.js
git commit -m "feat: add RSS, sitemap, and search index generation"
```

---

### Task 8: Build Script — Main Build Orchestrator

**Files:**
- Modify: `build.js`

- [ ] **Step 1: Add the build() function that calls everything in order**

Append to `build.js`:

```javascript
// --- Main Build ---
function build() {
  console.log('Building site...');

  // 1. Clear and copy
  if (fs.existsSync(BUILD_DIR)) fs.rmSync(BUILD_DIR, { recursive: true });
  ensureDir(BUILD_DIR);
  copyDir(ASSETS_DIR, path.join(BUILD_DIR, 'assets'));

  // 2. Parse all posts
  const posts = getAllPosts();
  console.log(`  Found ${posts.length} posts`);

  // 3. Generate pages
  generatePostPages(posts);
  console.log('  Post pages generated');

  generateHomepage(posts);
  console.log('  Homepage generated');

  generateTagPages(posts);
  console.log('  Tag pages generated');

  const pages = generatePages();
  console.log(`  ${pages.length} standalone pages generated`);

  // 4. Generate feeds
  generateRSS(posts);
  console.log('  RSS generated');

  generateSitemap(posts, pages);
  console.log('  Sitemap generated');

  generateSearchIndex(posts);
  console.log('  Search index generated');

  console.log('Build complete! Output in build/');
}

// Run if called directly
if (require.main === module) {
  build();
}
```

- [ ] **Step 2: Verify syntax**

Run: `node -c build.js`

- [ ] **Step 3: Commit**

```bash
git add build.js
git commit -m "feat: add main build orchestrator"
```

---

### Task 9: Templates — base.html

**Files:**
- Create: `templates/base.html`

- [ ] **Step 1: Create base.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{ title }}</title>
  <meta name="description" content="{{ description }}">
  <meta property="og:title" content="{{ title }}">
  <meta property="og:description" content="{{ description }}">
  <meta property="og:type" content="{{ og_type }}">
  <meta property="og:url" content="{{ og_url }}">
  <link rel="canonical" href="{{ canonical }}">
  <link rel="stylesheet" href="{{ base_path }}assets/css/style.css">
  <link rel="alternate" type="application/rss+xml" title="RSS" href="{{ base_path }}rss.xml">
</head>
<body>
  <header class="site-header">
    <div class="header-inner">
      <a href="{{ base_path }}index.html" class="logo">{{ site_title }}</a>
      <nav class="nav-links">
        <a href="{{ base_path }}index.html">Home</a>
        <a href="{{ base_path }}tags/index.html">Tags</a>
        <a href="{{ base_path }}about.html">About</a>
        <a href="{{ base_path }}rss.xml">RSS</a>
      </nav>
      <div class="header-actions">
        <input type="search" id="search-input" placeholder="Search..." autocomplete="off">
        <div id="search-results" class="search-results"></div>
        <button id="theme-toggle" aria-label="Toggle dark mode">🌙</button>
      </div>
    </div>
  </header>

  <main class="site-main">
    {{ content }}
  </main>

  <footer class="site-footer">
    <p>&copy; 2026 My Blog. <a href="{{ base_path }}rss.xml">RSS Feed</a></p>
  </footer>

  <script src="{{ base_path }}assets/js/theme.js"></script>
  <script src="{{ base_path }}assets/js/search.js"></script>
  {{ extra_scripts }}
</body>
</html>
```

- [ ] **Step 2: Update build.js renderPage to pass site_title**

In `build.js`, update `renderPage`:

```javascript
function renderPage(baseData, contentHtml) {
  const data = { ...baseData, content: contentHtml, site_title: SITE_TITLE };
  return render(loadTemplate('base.html'), data);
}
```

- [ ] **Step 3: Verify syntax**

Run: `node -c build.js`

- [ ] **Step 4: Commit**

```bash
git add templates/base.html build.js
git commit -m "feat: add base HTML template"
```

---

### Task 10: Templates — post.html, list.html, tag-list.html

**Files:**
- Create: `templates/post.html`
- Create: `templates/list.html`
- Create: `templates/tag-list.html`

- [ ] **Step 1: Create post.html**

```html
<article class="post-detail">
  <header class="post-header">
    <h1>{{ title }}</h1>
    <div class="post-meta">
      <time datetime="{{ isoDate }}">{{ dateFormatted }}</time>
      <div class="tags">{{ tags_html }}</div>
    </div>
  </header>
  <div class="post-body">
    {{ body }}
  </div>
</article>

<section class="comments">
  <h2>Comments</h2>
  <script src="https://giscus.app/client.js"
    data-repo="USERNAME/REPO"
    data-repo-id="REPO_ID"
    data-category="Announcements"
    data-category-id="CATEGORY_ID"
    data-mapping="specific"
    data-term="{{ slug }}"
    data-strict="0"
    data-reactions-enabled="1"
    data-emit-metadata="0"
    data-input-position="bottom"
    data-theme="preferred_color_scheme"
    data-lang="en"
    crossorigin="anonymous"
    async>
  </script>
  <p class="no-comments-note">To enable comments, configure Giscus with your GitHub repository.</p>
</section>
```

- [ ] **Step 2: Create list.html**

```html
<div class="post-list">
  {{ posts_html }}
</div>
{{ pagination_html }}
```

- [ ] **Step 3: Create tag-list.html**

```html
<div class="tag-list">
  <h1>Tags</h1>
  <ul class="tags-cloud">
    {{ tags_html }}
  </ul>
</div>
```

- [ ] **Step 4: Commit**

```bash
git add templates/post.html templates/list.html templates/tag-list.html
git commit -m "feat: add content templates"
```

---

### Task 11: CSS — Variables, Reset, Layout, Typography

**Files:**
- Create: `assets/css/style.css`

- [ ] **Step 1: Create style.css with variables, reset, layout, and typography**

```css
/* === CSS Custom Properties === */
:root {
  --bg: #ffffff;
  --bg-secondary: #f5f5f5;
  --text: #1a1a1a;
  --text-secondary: #666666;
  --accent: #2563eb;
  --accent-hover: #1d4ed8;
  --border: #e5e5e5;
  --code-bg: #f0f0f0;
  --card-bg: #ffffff;
  --card-shadow: 0 1px 3px rgba(0,0,0,0.08);
  --max-width: 720px;
  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-mono: 'SF Mono', 'Fira Code', 'Fira Mono', Menlo, Consolas, monospace;
}

[data-theme="dark"] {
  --bg: #1a1a1a;
  --bg-secondary: #252525;
  --text: #e5e5e5;
  --text-secondary: #a0a0a0;
  --accent: #60a5fa;
  --accent-hover: #93bbfd;
  --border: #333333;
  --code-bg: #2a2a2a;
  --card-bg: #2a2a2a;
  --card-shadow: 0 1px 3px rgba(0,0,0,0.3);
}

/* === Reset === */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html { font-size: 18px; scroll-behavior: smooth; }

body {
  font-family: var(--font-sans);
  background: var(--bg);
  color: var(--text);
  line-height: 1.7;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

a { color: var(--accent); text-decoration: none; }
a:hover { color: var(--accent-hover); text-decoration: underline; }

img { max-width: 100%; height: auto; }

/* === Header === */
.site-header {
  position: sticky;
  top: 0;
  background: var(--bg);
  border-bottom: 1px solid var(--border);
  z-index: 100;
  backdrop-filter: blur(8px);
}

.header-inner {
  max-width: var(--max-width);
  margin: 0 auto;
  padding: 0.75rem 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.logo {
  font-weight: 700;
  font-size: 1.2rem;
  color: var(--text);
  text-decoration: none;
}
.logo:hover { color: var(--accent); text-decoration: none; }

.nav-links {
  display: flex;
  gap: 1rem;
}
.nav-links a { color: var(--text-secondary); font-size: 0.9rem; }
.nav-links a:hover { color: var(--accent); text-decoration: none; }

.header-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  position: relative;
}

#search-input {
  padding: 0.35rem 0.75rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg-secondary);
  color: var(--text);
  font-size: 0.85rem;
  width: 180px;
}
#search-input:focus { outline: none; border-color: var(--accent); }

#theme-toggle {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.2rem;
  padding: 0.25rem;
}

/* === Main Content === */
.site-main {
  flex: 1;
  max-width: var(--max-width);
  margin: 0 auto;
  padding: 2rem 1rem;
  width: 100%;
}

/* === Footer === */
.site-footer {
  text-align: center;
  padding: 2rem 1rem;
  color: var(--text-secondary);
  font-size: 0.85rem;
  border-top: 1px solid var(--border);
}

/* === Post List === */
.post-list { display: flex; flex-direction: column; gap: 1.5rem; }

.post-card {
  background: var(--card-bg);
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: var(--card-shadow);
  border: 1px solid var(--border);
}
.post-card h2 { margin-bottom: 0.5rem; font-size: 1.4rem; }
.post-card h2 a { color: var(--text); }
.post-card h2 a:hover { color: var(--accent); text-decoration: none; }

.meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
}

.tags { display: flex; gap: 0.35rem; flex-wrap: wrap; }
.tag {
  display: inline-block;
  padding: 0.1rem 0.5rem;
  background: var(--bg-secondary);
  border-radius: 4px;
  font-size: 0.8rem;
  color: var(--text-secondary);
}
.tag:hover { background: var(--accent); color: #fff; text-decoration: none; }

.excerpt { color: var(--text-secondary); font-size: 0.95rem; }

/* === Pagination === */
.pagination {
  display: flex;
  justify-content: space-between;
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border);
}
.pagination a {
  padding: 0.4rem 1rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 0.9rem;
}
.pagination a:hover { background: var(--accent); color: #fff; border-color: var(--accent); text-decoration: none; }

/* === Post Detail === */
.post-detail { margin-bottom: 3rem; }

.post-header { margin-bottom: 2rem; }
.post-header h1 { font-size: 2rem; line-height: 1.3; margin-bottom: 0.75rem; }
.post-meta {
  display: flex;
  align-items: center;
  gap: 1rem;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.post-body { font-size: 1.05rem; }
.post-body h2 { margin: 2rem 0 0.75rem; }
.post-body h3 { margin: 1.5rem 0 0.5rem; }
.post-body p { margin-bottom: 1.25rem; }
.post-body ul, .post-body ol { margin: 0 0 1.25rem 1.5rem; }
.post-body li { margin-bottom: 0.25rem; }
.post-body blockquote {
  border-left: 3px solid var(--accent);
  padding: 0.5rem 1rem;
  margin: 1.25rem 0;
  background: var(--bg-secondary);
  border-radius: 0 6px 6px 0;
}
.post-body code {
  background: var(--code-bg);
  padding: 0.15rem 0.4rem;
  border-radius: 3px;
  font-family: var(--font-mono);
  font-size: 0.85em;
}
.post-body pre {
  background: var(--code-bg);
  padding: 1rem 1.25rem;
  border-radius: 8px;
  overflow-x: auto;
  margin: 1.25rem 0;
  border: 1px solid var(--border);
}
.post-body pre code {
  background: none;
  padding: 0;
  font-size: 0.85rem;
  line-height: 1.6;
}
.post-body hr {
  border: none;
  border-top: 1px solid var(--border);
  margin: 2rem 0;
}

/* === Comments === */
.comments { margin-top: 3rem; padding-top: 2rem; border-top: 1px solid var(--border); }
.comments h2 { margin-bottom: 1rem; }

/* === Tags Cloud === */
.tag-list h1 { margin-bottom: 1.5rem; }
.tags-cloud {
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.tags-cloud li { font-size: 1.1rem; }
.tags-cloud .count { color: var(--text-secondary); font-size: 0.8em; }

/* === Search Results === */
.search-results {
  display: none;
  position: absolute;
  top: 100%;
  right: 0;
  width: 320px;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  max-height: 400px;
  overflow-y: auto;
  z-index: 200;
}
.search-results.active { display: block; }
.search-result-item {
  display: block;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border);
  color: var(--text);
}
.search-result-item:hover { background: var(--bg-secondary); text-decoration: none; }
.search-result-item:last-child { border-bottom: none; }
.search-result-item .result-title { font-weight: 600; }
.search-result-item .result-meta { font-size: 0.8rem; color: var(--text-secondary); }
```

- [ ] **Step 2: Commit**

```bash
git add assets/css/style.css
git commit -m "feat: add stylesheet with light/dark variables, layout, and typography"
```

---

### Task 12: JavaScript — theme.js

**Files:**
- Create: `assets/js/theme.js`

- [ ] **Step 1: Create theme.js**

```javascript
(function () {
  const STORAGE_KEY = 'blog-theme';
  const DARK = 'dark';
  const LIGHT = 'light';

  function getSystemPreference() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? DARK : LIGHT;
  }

  function getTheme() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === DARK || stored === LIGHT) return stored;
    return getSystemPreference();
  }

  function applyTheme(theme) {
    if (theme === DARK) {
      document.documentElement.setAttribute('data-theme', DARK);
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }

  function toggleTheme() {
    const current = getTheme();
    const next = current === DARK ? LIGHT : DARK;
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
    updateButton(next);
  }

  function updateButton(theme) {
    const btn = document.getElementById('theme-toggle');
    if (btn) btn.textContent = theme === DARK ? '☀️' : '🌙';
  }

  function init() {
    const theme = getTheme();
    applyTheme(theme);
    updateButton(theme);

    const btn = document.getElementById('theme-toggle');
    if (btn) btn.addEventListener('click', toggleTheme);

    // Listen for system changes when no stored preference
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () {
      if (!localStorage.getItem(STORAGE_KEY)) {
        const sys = getSystemPreference();
        applyTheme(sys);
        updateButton(sys);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
```

- [ ] **Step 2: Commit**

```bash
git add assets/js/theme.js
git commit -m "feat: add dark mode toggle script"
```

---

### Task 13: JavaScript — search.js

**Files:**
- Create: `assets/js/search.js`

- [ ] **Step 1: Create search.js**

```javascript
(function () {
  let index = [];
  let loaded = false;

  async function loadIndex() {
    try {
      const resp = await fetch('/search-index.json');
      if (!resp.ok) return;
      index = await resp.json();
      loaded = true;
    } catch (e) {
      console.warn('Search index not available');
    }
  }

  function search(query) {
    if (!loaded || !query.trim()) return [];
    const q = query.toLowerCase().trim();
    return index.filter(item =>
      item.title.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.tags.some(t => t.toLowerCase().includes(q))
    ).slice(0, 8);
  }

  function renderResults(results, container) {
    if (results.length === 0) {
      container.innerHTML = '<div class="search-result-item" style="color:var(--text-secondary)">No results</div>';
      return;
    }
    container.innerHTML = results.map(r => `
      <a href="/posts/${r.slug}.html" class="search-result-item">
        <div class="result-title">${escapeHtml(r.title)}</div>
        <div class="result-meta">${escapeHtml(r.date)} · ${escapeHtml(r.tags.join(', '))}</div>
      </a>
    `).join('');
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function init() {
    const input = document.getElementById('search-input');
    const results = document.getElementById('search-results');
    if (!input || !results) return;

    loadIndex();

    let debounceTimer;
    input.addEventListener('input', function () {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const found = search(input.value);
        if (input.value.trim()) {
          renderResults(found, results);
          results.classList.add('active');
        } else {
          results.classList.remove('active');
        }
      }, 200);
    });

    input.addEventListener('focus', function () {
      if (input.value.trim()) results.classList.add('active');
    });

    document.addEventListener('click', function (e) {
      if (!input.contains(e.target) && !results.contains(e.target)) {
        results.classList.remove('active');
      }
    });

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        results.classList.remove('active');
        input.blur();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
```

- [ ] **Step 2: Commit**

```bash
git add assets/js/search.js
git commit -m "feat: add client-side search script"
```

---

### Task 14: Sample Content

**Files:**
- Create: `source/posts/hello-world.md`
- Create: `source/pages/about.md`

- [ ] **Step 1: Create hello-world.md**

```markdown
---
title: Hello World
date: 2026-05-15
tags: [blog, markdown]
description: My first blog post — built with a lightweight static site generator.
---

## Welcome

This is my new blog, built with **pure HTML, CSS, and JavaScript**. Posts are written in Markdown and compiled to static HTML.

### Why Static?

- **Fast**: No server-side rendering, no database queries
- **Simple**: Deploy anywhere — GitHub Pages, Netlify, Vercel
- **Secure**: No backend to exploit

### Code Example

```javascript
// The build script is just a few hundred lines of Node.js
function build() {
  const posts = getAllPosts();
  generatePostPages(posts);
  console.log('Done!');
}
```

Stay tuned for more posts!
```

- [ ] **Step 2: Create about.md**

```markdown
---
title: About
date: 2026-05-15
tags: []
description: About this blog
---

## About This Blog

A lightweight static blog. Write in Markdown. Build with one command. Deploy anywhere.

### Tech

- **Build**: Node.js, marked, gray-matter
- **Output**: HTML, CSS, vanilla JavaScript
- **Features**: Dark mode, search, tags, RSS, SEO
```

- [ ] **Step 3: Commit**

```bash
git add source/posts/hello-world.md source/pages/about.md
git commit -m "feat: add sample content"
```

---

### Task 15: Build Verification & CLAUDE.md Update

- [ ] **Step 1: Run the build**

Run: `npm run build`
Expected: Output in `build/` with `index.html`, `posts/hello-world.html`, `tags/`, `about.html`, `rss.xml`, `sitemap.xml`, `search-index.json`, `assets/`

- [ ] **Step 2: Verify output files exist**

Run: `ls -R build/`
Check that all expected files are present.

- [ ] **Step 3: Verify HTML output**

Run: `head -20 build/index.html`
Check that `<title>`, `<meta>`, `<link canonical>`, `<link rel="stylesheet">` are present and correct.

- [ ] **Step 4: Update CLAUDE.md**

Replace `E:/AIproject/CLAUDE.md` with:

```markdown
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A lightweight static blog generator. Write posts in Markdown under `source/posts/`, run `npm run build`, deploy `build/` to any static host.

## Commands

```bash
npm run build    # Build the site (output to build/)
npm run clean    # Remove build directory
```

## Architecture

```
source/posts/*.md   →  build.js  →  build/ (static HTML/CSS/JS site)
source/pages/*.md   →             →  templates/ (base + content templates)
                                   →  assets/ (copied to build/assets/)
```

- `build.js` — Single-file build script. Reads Markdown, renders templates, outputs static site.
- `templates/base.html` — HTML shell with header, footer, SEO meta, CSS/JS references. `{{ placeholder }}` syntax.
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
```

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md with project commands and architecture"
```
