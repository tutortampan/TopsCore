const fs = require('fs');

const path = 'd:/TopsCore/js/admin/assessment-management.js';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  `      qCount: _isDyn ? _vaultQ : qCount,
      qIsVault: _isDyn,
      status,
      _raw: r || {}
    };`,
  `      qCount: _isDyn ? _vaultQ : qCount,
      qIsVault: _isDyn,
      status,
      shellCode: r?.shell_code || '',
      _raw: r || {}
    };`
);

fs.writeFileSync(path, code);
console.log("Successfully injected shellCode into grid mapping.");
