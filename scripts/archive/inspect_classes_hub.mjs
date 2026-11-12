import fs from 'fs';

const js = fs.readFileSync('js/admin/classes-management.js', 'utf8');
const idx = js.indexOf('function renderClassesHub');
if (idx !== -1) {
  console.log(js.slice(idx, idx + 1000));
} else {
  console.log('renderClassesHub not found in classes-management.js');
}

