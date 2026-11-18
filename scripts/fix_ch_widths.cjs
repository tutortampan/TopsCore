const fs = require('fs');
const path = 'd:/Drives/Tutor Tampan/TopsCore/js/admin/classes-hub.js';
let content = fs.readFileSync(path, 'utf8');

// Fix thead th: CLASS NAME 220→210, CODE 165→155
content = content.replace(
  /width:220px;text-align:left;cursor:pointer;" onclick="window\.sortClassesHub\('name'\)/,
  "width:210px;text-align:left;cursor:pointer;\" onclick=\"window.sortClassesHub('name')"
);
content = content.replace(
  /width:165px;text-align:center;cursor:pointer;" onclick="window\.sortClassesHub\('code'\)/,
  "width:155px;text-align:center;cursor:pointer;\" onclick=\"window.sortClassesHub('code')"
);

fs.writeFileSync(path, content, 'utf8');
console.log('Done. Total chars:', content.length);
