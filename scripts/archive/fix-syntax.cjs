const fs = require('fs');
let c = fs.readFileSync('d:/TopsCore/js/admin/vocab-vault.js', 'utf8');
c = c.replace(/\\`/g, '`');
c = c.replace(/\\\${/g, '${');
fs.writeFileSync('d:/TopsCore/js/admin/vocab-vault.js', c);
