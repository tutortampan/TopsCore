const fs = require('fs');

const path = 'd:/TopsCore/js/admin/assessment-management.js';
let code = fs.readFileSync(path, 'utf8');

// Replace "Copy" text
code = code.replace(
  />Copy<\/button>/g,
  `>📄</button>`
);

// Replace "Pub" text
code = code.replace(
  /\? 'Unpub' : 'Pub'/g,
  `? '👁️‍🗨️' : '👁️'`
);

// Replace "Edit" text
code = code.replace(
  />Edit<\/button>/g,
  `>✏️</button>`
);

// Replace "🗑️ Del" text
code = code.replace(
  />🗑️ Del<\/button>/g,
  `>🗑️</button>`
);
code = code.replace(
  />Del<\/button>/g,
  `>🗑️</button>`
);

// Also the user showed ORD is still 1,2,3...
// Wait, I changed the label to CODE but did I actually change the HTML rendering?
// Let's manually replace the block for the first column.
code = code.replace(
  `        key: 'order',
        label: 'CODE',
        sortable: true,
        render: (val, row) => {
          const r = (row && typeof row === 'object') ? row : {};
          return \`<div style="font-size:0.75rem; color:var(--clr-text-2); white-space:nowrap;">\${r?.order || '-'}</div>\`;
        }`,
  `        key: 'order',
        label: 'CODE',
        sortable: true,
        render: (val, row) => {
          const r = (row && typeof row === 'object') ? row : {};
          if (r?.shellCode) {
            return \`<div style="font-size:0.75rem; color:var(--clr-primary); font-family:monospace; font-weight:bold; white-space:nowrap; background:rgba(255,255,255,0.05); padding:2px 6px; border-radius:4px; border:1px solid rgba(255,255,255,0.1);" title="\${escapeHtml(r.shellCode)}">\${escapeHtml(r.shellCode)}</div>\`;
          }
          return \`<div style="font-size:0.75rem; color:var(--clr-text-2); white-space:nowrap;">\${r?.order || '-'}</div>\`;
        }`
);


// And truncate TITLE
code = code.replace(
  `return \`<div class="fw-700" style="color:var(--clr-text-1); font-size:0.85rem; white-space:normal; min-width:250px;" title="\${escapeHtml(title)}">\${escapeHtml(title)}</div>\`;`,
  `return \`<div class="fw-700" style="color:var(--clr-text-1); font-size:0.85rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:250px;" title="\${escapeHtml(title)}">\${escapeHtml(title)}</div>\`;`
);

// And truncate PREREQ
code = code.replace(
  `<div class="fw-500 text-muted" style="font-size:0.75rem; min-width: 200px; white-space: normal;" title="\${escapeHtml(prereqDisplay)}">`,
  `<div class="fw-500 text-muted" style="font-size:0.75rem; max-width: 150px; white-space: nowrap; overflow:hidden; text-overflow:ellipsis;" title="\${escapeHtml(prereqDisplay)}">`
);

fs.writeFileSync(path, code);
console.log("Successfully patched buttons and strings.");
