import { readFileSync } from 'fs';
const html = readFileSync('admin.html', 'utf8');

// Find version strings for key files
const dgMatch = html.match(/datagrid\.js\?v=[^\s"']*/g);
console.log('datagrid.js version:', dgMatch);

const smMatch = html.match(/student-management\.js\?v=[^\s"']*/g);
console.log('student-management.js version:', smMatch);

const cssMatch = html.match(/admin\.css\?v=[^\s"']*/g);
console.log('admin.css version:', cssMatch);

// Also check if admin.html imports from app.js and what version
const appMatch = html.match(/app\.js\?v=[^\s"']*/g);
console.log('app.js version:', appMatch);
