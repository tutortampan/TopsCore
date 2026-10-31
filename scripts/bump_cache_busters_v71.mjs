import fs from 'fs';

const v = '20261101_v71';

// admin.html
let adminHtml = fs.readFileSync('admin.html', 'utf8');
adminHtml = adminHtml.replace(/css\/admin\.css\?v=[^"']+/g, `css/admin.css?v=${v}`);
adminHtml = adminHtml.replace(/admin-init\.js\?v=[^"']+/g, `admin-init.js?v=${v}`);
adminHtml = adminHtml.replace(/js\/admin\/app\.js\?v=[^"']+/g, `js/admin/app.js?v=${v}`);
fs.writeFileSync('admin.html', adminHtml, 'utf8');
console.log('✓ Bumped admin.html');

// dashboard.html
let dashHtml = fs.readFileSync('dashboard.html', 'utf8');
dashHtml = dashHtml.replace(/js\/dashboard\.js\?v=[^"']+/g, `js/dashboard.js?v=${v}`);
dashHtml = dashHtml.replace(/css\/dashboard\.css\?v=[^"']+/g, `css/dashboard.css?v=${v}`);
fs.writeFileSync('dashboard.html', dashHtml, 'utf8');
console.log('✓ Bumped dashboard.html');

// result.html
let resHtml = fs.readFileSync('result.html', 'utf8');
resHtml = resHtml.replace(/js\/result\.js\?v=[^"']+/g, `js/result.js?v=${v}`);
resHtml = resHtml.replace(/css\/result\.css\?v=[^"']+/g, `css/result.css?v=${v}`);
fs.writeFileSync('result.html', resHtml, 'utf8');
console.log('✓ Bumped result.html');

// js/admin/app.js
let appJs = fs.readFileSync('js/admin/app.js', 'utf8');
appJs = appJs.replace(/\.\.\/api\.js\?v=[^"']+/g, `../api.js?v=${v}`);
appJs = appJs.replace(/\.\.\/grading\.js\?v=[^"']+/g, `../grading.js?v=${v}`);
fs.writeFileSync('js/admin/app.js', appJs, 'utf8');
console.log('✓ Bumped js/admin/app.js');
