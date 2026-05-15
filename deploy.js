const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const os = require('os');
const TMP = path.join(os.tmpdir(), 'blog-deploy-tmp');

function sh(cmd) {
  console.log(`  > ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd: __dirname });
}

// Step 1: Build
console.log('[1/3] Building...');
sh('node build.js');

// Step 2: Save build/ to temp before switching branches
console.log('\n[2/3] Saving build output to temp...');
fs.rmSync(TMP, { recursive: true, force: true });
fs.cpSync(path.join(__dirname, 'build'), TMP, { recursive: true });

// Step 3: Deploy to gh-pages
console.log('\n[3/3] Deploying to gh-pages...');

// Switch to gh-pages
try { sh('git checkout gh-pages'); }
catch (e) { try { sh('git checkout --orphan gh-pages'); } catch (e2) {} }

// Clean working dir (keep .git only)
for (const name of fs.readdirSync(__dirname)) {
  if (name === '.git') continue;
  fs.rmSync(path.join(__dirname, name), { recursive: true, force: true });
}

// Restore build output from temp
for (const name of fs.readdirSync(TMP)) {
  fs.cpSync(path.join(TMP, name), path.join(__dirname, name), { recursive: true });
}
fs.rmSync(TMP, { recursive: true, force: true });

// .nojekyll
fs.writeFileSync(path.join(__dirname, '.nojekyll'), '');

// Commit and push
sh('git add .');
try { sh('git commit -m "deploy"'); } catch (e) {}
sh('git push origin gh-pages --force');

// Back to main
sh('git checkout main');

console.log('\nDeployed! https://kobe-tech-space.github.io/My-Blocker/');
