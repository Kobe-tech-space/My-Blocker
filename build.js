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

console.log('Build script loaded. Run build() to start.');
