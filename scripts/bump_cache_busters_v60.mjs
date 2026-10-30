import fs from 'fs';
import path from 'path';

// 1. admin.html
const adminHtmlPath = path.resolve('admin.html');
let adminHtml = fs.readFileSync(adminHtmlPath, 'utf8');
adminHtml = adminHtml.replace(/css\/admin\.css\?v=[^"']+/g, 'css/admin.css?v=20261031_v60');
adminHtml = adminHtml.replace(/admin-init\.js\?v=[^"']+/g, 'admin-init.js?v=20261031_v60');
adminHtml = adminHtml.replace(/js\/admin\/app\.js\?v=[^"']+/g, 'js/admin/app.js?v=20261031_v60');
fs.writeFileSync(adminHtmlPath, adminHtml, 'utf8');
console.log('✓ Bumped cache busters in admin.html');

// 2. js/admin/app.js
const appJsPath = path.resolve('js/admin/app.js');
let appJs = fs.readFileSync(appJsPath, 'utf8');
appJs = appJs.replace(/tests-management\.js\?v=[^"']+/g, 'tests-management.js?v=20261031_v60');
appJs = appJs.replace(/\.\.\/api\.js\?v=[^"']+/g, '../api.js?v=20261031_v60');
fs.writeFileSync(appJsPath, appJs, 'utf8');
console.log('✓ Bumped cache busters in js/admin/app.js');

