const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function sh(cmd) {
  console.log(`  > ${cmd}`);
  const opts = { stdio: 'inherit', cwd: __dirname };
  // Allow non-zero exit for some commands
  return execSync(cmd, opts);
}

// 1. Build
console.log('[1/2] Building...');
sh('node build.js');

// 2. Commit any uncommitted changes on main first
try { sh('git add . && git commit -m "wip"'); } catch (e) {}
try { sh('git push origin main'); } catch (e) {}

// 3. Deploy to gh-pages
console.log('\n[2/2] Deploying to gh-pages...');

try { sh('git checkout gh-pages'); }
catch (e) {
  // Create gh-pages branch if it doesn't exist
  try { sh('git checkout --orphan gh-pages'); } catch (e2) {}
}

// Remove all tracked files
try { sh('git rm -rf .'); } catch (e) {}

// Remove leftover files, keeping .git and node_modules
const keep = new Set(['.git', 'node_modules']);
const entries = fs.readdirSync(__dirname);
for (const name of entries) {
  if (keep.has(name)) continue;
  fs.rmSync(path.join(__dirname, name), { recursive: true, force: true });
}

// Copy build output to root
const buildDir = path.join(__dirname, 'build');
for (const name of fs.readdirSync(buildDir)) {
  fs.cpSync(path.join(buildDir, name), path.join(__dirname, name), { recursive: true });
}

// Create .nojekyll
fs.writeFileSync(path.join(__dirname, '.nojekyll'), '');

// Commit and push
sh('git add .');
try { sh('git commit -m "deploy"'); } catch (e) { console.log('  (nothing to commit)'); }
sh('git push origin gh-pages --force');

// Switch back
sh('git checkout main');

console.log('\nDone! https://kobe-tech-space.github.io/My-Blocker/');
