const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const matter = require("gray-matter");

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
  if (!fs.existsSync(src)) return;
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
  const data = { ...baseData, content: contentHtml, site_title: SITE_TITLE };
  return render(loadTemplate('base.html'), data);
}

// --- Helpers ---
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function parseDate(raw) {
  if (!raw) return new Date();
  const d = new Date(raw);
  return isNaN(d.getTime()) ? new Date() : d;
}

function formatDate(raw) {
  if (!raw) return 'Unknown date';
  const d = new Date(raw);
  return isNaN(d.getTime()) ? String(raw) : raw;
}

function slugify(text) {
  return String(text).toLowerCase().trim()
    .replace(/[\s]+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

// --- Post Parsing ---
function parsePost(filePath) {
  const raw = readFile(filePath);
  const { data, content } = matter(raw);
  const slug = data.slug || path.basename(filePath, '.md');
  const html = marked.parse(content);
  const d = parseDate(data.date);
  return {
    slug,
    title: data.title || slug,
    date: d,
    dateFormatted: formatDate(data.date),
    isoDate: d.toISOString(),
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
  return tags.map(t => `<a href="/tags/${slugify(t)}.html" class="tag">${escapeHtml(t)}</a>`).join('');
}

// --- Post Detail Pages ---
function generatePostPages(posts) {
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
          <h2><a href="posts/${p.slug}.html">${escapeHtml(p.title)}</a></h2>
          <div class="meta">
            <time datetime="${p.isoDate}">${p.dateFormatted}</time>
            <div class="tags">${tagsHtml}</div>
          </div>
          <p class="excerpt">${escapeHtml(p.description)}</p>
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
    const tagSlug = slugify(tag);
    const postsHtml = tagPosts.map(p => {
      const tagsHtml = tagsToHtml(p.tags);
      return `
        <article class="post-card">
          <h2><a href="../posts/${p.slug}.html">${escapeHtml(p.title)}</a></h2>
          <div class="meta">
            <time datetime="${p.isoDate}">${p.dateFormatted}</time>
            <div class="tags">${tagsHtml}</div>
          </div>
          <p class="excerpt">${escapeHtml(p.description)}</p>
        </article>`;
    }).join('\n');

    const listContent = render(listTmpl, { posts_html: postsHtml, pagination_html: '' });
    const pageData = {
      title: `Tag: ${escapeHtml(tag)} - ${SITE_TITLE}`,
      description: `${tagPosts.length} articles tagged "${escapeHtml(tag)}"`,
      og_type: 'website',
      og_url: `${SITE_URL}/tags/${tagSlug}.html`,
      canonical: `${SITE_URL}/tags/${tagSlug}.html`,
      base_path: '../',
      theme: '',
      extra_scripts: '',
    };
    writeFile(path.join(BUILD_DIR, 'tags', `${tagSlug}.html`), renderPage(pageData, listContent));
  }

  // Tag overview page
  const tagListTmpl = loadTemplate('tag-list.html');
  const tagsHtml = Object.entries(tagMap)
    .sort((a, b) => b[1].length - a[1].length)
    .map(([tag, tagPosts]) =>
      `<li><a href="${slugify(tag)}.html">${escapeHtml(tag)}</a> <span class="count">(${tagPosts.length})</span></li>`
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

  const tags = new Set();
  posts.forEach(p => p.tags.forEach(t => tags.add(t)));
  const tagUrls = [...tags].map(t =>
    `  <url><loc>${SITE_URL}/tags/${slugify(t)}.html</loc></url>`
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
