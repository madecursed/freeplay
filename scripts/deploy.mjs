// Сборка и публикация на GitHub Pages: dist/ → ветка gh-pages.
import { execSync } from 'node:child_process';
import { writeFileSync, rmSync } from 'node:fs';

const run = (cmd, cwd) => execSync(cmd, { stdio: 'inherit', cwd });
const remote = execSync('git remote get-url origin').toString().trim();

run('npm run build');
writeFileSync('dist/.nojekyll', '');
rmSync('dist/.git', { recursive: true, force: true });
run('git init -q -b gh-pages', 'dist');
run('git add -A', 'dist');
run('git commit -q -m "Deploy"', 'dist');
run(`git push -f ${remote} gh-pages`, 'dist');
console.log('Опубликовано. Сайт обновится через 1–2 минуты.');
