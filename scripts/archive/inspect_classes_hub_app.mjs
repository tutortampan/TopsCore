import fs from 'fs';

const js = fs.readFileSync('js/admin/app.js', 'utf8');
const idx = js.indexOf('renderClassesHub');
if (idx !== -1) {
  console.log(js.slice(idx, idx + 1000));
} else {
  console.log('renderClassesHub not found in app.js');
}

