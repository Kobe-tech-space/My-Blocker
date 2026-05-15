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

console.log('Build script loaded. Run build() to start.');
