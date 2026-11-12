import fs from 'fs';

const html = fs.readFileSync('admin.html', 'utf8');
const navRegex = /href="(#[a-zA-Z0-9_\-\?=&]+)"[^>]*>([\s\S]*?)<\/a>/g;
let match;
console.log('--- Navigation Links in admin.html ---');
while ((match = navRegex.exec(html)) !== null) {
  const text = match[2].replace(/<[^>]*>/g, '').trim().replace(/\s+/g, ' ');
  console.log(`${match[1]} | ${text}`);
}

const appJs = fs.readFileSync('js/admin/app.js', 'utf8');
console.log('\n--- Routes in app.js ---');
const routeRegex = /case ['"]#?([a-zA-Z0-9_\-]+)['"]:/g;
while ((match = routeRegex.exec(appJs)) !== null) {
  console.log('Route case:', match[1]);
}

