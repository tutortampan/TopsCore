import fs from 'fs';

const v = '20261101_v74';

['admin.html', 'dashboard.html', 'result.html', 'test.html'].forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/\?v=[0-9_a-zA-Z\.]+/g, `?v=${v}`);
    fs.writeFileSync(file, content, 'utf8');
    console.log(`✓ Bumped ${file} to ?v=${v}`);
  }
});

let appJs = fs.readFileSync('js/admin/app.js', 'utf8');
appJs = appJs.replace(/student-management\.js\?v=[^"']+/g, `student-management.js?v=${v}`);
appJs = appJs.replace(/\.\/app\.js\?v=[^"']+/g, `./app.js?v=${v}`);
appJs = appJs.replace(/\.\.\/api\.js\?v=[^"']+/g, `../api.js?v=${v}`);
appJs = appJs.replace(/\.\.\/grading\.js\?v=[^"']+/g, `../grading.js?v=${v}`);
fs.writeFileSync('js/admin/app.js', appJs, 'utf8');
console.log('✓ Bumped js/admin/app.js');

let smJs = fs.readFileSync('js/admin/student-management.js', 'utf8');
smJs = smJs.replace(/\.\.\/api\.js\?v=[^"']+/g, `../api.js?v=${v}`);
smJs = smJs.replace(/\.\.\/grading\.js\?v=[^"']+/g, `../grading.js?v=${v}`);
fs.writeFileSync('js/admin/student-management.js', smJs, 'utf8');
console.log('✓ Bumped js/admin/student-management.js');
