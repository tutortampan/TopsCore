const fs = require('fs');
let code = fs.readFileSync('d:/TopsCore/js/admin/assessment-management.js', 'utf8');

// Add shellCode to gridData mapping
const targetGridData = `      timeLimit,
      minScore,
      qCount: _isDyn ? _vaultQ : qCount,
      qIsVault: _isDyn,
      status,
      raw: r
    };`;

const replaceGridData = `      timeLimit,
      minScore,
      qCount: _isDyn ? _vaultQ : qCount,
      qIsVault: _isDyn,
      status,
      shellCode: r?.shell_code || '',
      raw: r
    };`;
code = code.replace(targetGridData, replaceGridData);

// Update column definition
const targetColumn = `      {
        key: 'order',
        label: 'ORD',
        sortable: true,
        render: (val, row) => {
          const r = (row && typeof row === 'object') ? row : {};
          return \`<div style="font-size:0.75rem; color:var(--clr-text-2); white-space:nowrap;">\${r?.order || '-'}</div>\`;
        }
      },`;

const replaceColumn = `      {
        key: 'order',
        label: 'CODE',
        sortable: true,
        render: (val, row) => {
          const r = (row && typeof row === 'object') ? row : {};
          if (r?.shellCode) {
            return \`<div style="font-size:0.7rem; color:var(--clr-primary); font-family:monospace; font-weight:bold; white-space:nowrap; background:rgba(255,255,255,0.05); padding:2px 6px; border-radius:4px; border:1px solid rgba(255,255,255,0.1);">\${escapeHtml(r.shellCode)}</div>\`;
          }
          return \`<div style="font-size:0.75rem; color:var(--clr-text-2); white-space:nowrap;">ORD: \${r?.order || '-'}</div>\`;
        }
      },`;

code = code.replace(targetColumn, replaceColumn);

fs.writeFileSync('d:/TopsCore/js/admin/assessment-management.js', code);
console.log("Patched ORD to CODE.");
