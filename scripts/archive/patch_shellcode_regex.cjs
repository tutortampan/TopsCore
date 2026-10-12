const fs = require('fs');

const path = 'd:/TopsCore/js/admin/assessment-management.js';
let code = fs.readFileSync(path, 'utf8');

// Insert shellCode in the return object mapping
code = code.replace(
  /status,\s*_raw:\s*r\s*\|\|\s*\{\}\s*\};\s*\}\);/g,
  `status,
      shellCode: r?.shell_code || '',
      _raw: r || {}
    };
  });`
);

fs.writeFileSync(path, code);
console.log("Successfully injected shellCode with regex.");
