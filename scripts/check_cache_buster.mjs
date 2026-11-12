import fs from 'fs';

['admin.html', 'js/admin/tests-access.js'].forEach(f => {
  if (fs.existsSync(f)) {
    const c = fs.readFileSync(f, 'utf8');
    const m = c.match(/tests-access\.js\?v=[^\s"']+/g);
    console.log(f, m);
  }
});
