const fs = require('fs');
let c = fs.readFileSync('js/admin/student-management.js', 'utf8');
c = c.replace('placeholder="1234"', 'placeholder="Leave blank to keep unchanged"');
fs.writeFileSync('js/admin/student-management.js', c);
console.log('Replaced placeholder');
