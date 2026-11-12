import fs from 'fs';

const html = fs.readFileSync('admin.html', 'utf8');
const sidebarIdx = html.indexOf('admin-sidebar');
if (sidebarIdx !== -1) {
  console.log(html.slice(sidebarIdx, sidebarIdx + 3000));
} else {
  console.log('admin-sidebar not found');
}

