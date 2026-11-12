import fs from 'fs';

const js = fs.readFileSync('js/admin/classes-hub.js', 'utf8');
console.log('classes-hub.js length:', js.length);
console.log(js.slice(0, 1500));

