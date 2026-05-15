const { execSync } = require('child_process');

function run(cmd) {
  console.log(`  > ${cmd}`);
  execSync(cmd, { stdio: 'inherit' });
}

console.log('Deploying...\n');

console.log('[1/3] Building...');
run('node build.js');

console.log('\n[2/3] Updating gh-pages branch...');
run('git checkout gh-pages');
run('git rm -rf --cached . 2>nul || git rm -rf --cached . 2>/dev/null || true');
try { execSync('rm -rf *'); } catch (e) { /* ignore */ }
try { execSync('cp -r build/* .'); } catch (e) { execSync('xcopy /E /Y build\\* .\\'); }

const fs = require('fs');
fs.writeFileSync('.nojekyll', '');
run('git add .');
run('git commit -m "deploy" || true');
run('git push origin gh-pages');

console.log('\n[3/3] Switching back to main...');
run('git checkout main');

console.log('\nDeployed! https://kobe-tech-space.github.io/My-Blocker/');
