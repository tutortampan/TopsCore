const fs = require('fs');
let code = fs.readFileSync('d:/TopsCore/js/admin/assessment-management.js', 'utf8');

code = code.replace(
  "onclick=\"window._deleteRecord('Assessments', '${id}', '${escapeHtml(r?.title || '')}')\">Del</button>",
  "onclick=\"window._deleteRecord('assessments', '${id}', '${escapeHtml(r?.title || '')}')\">🗑️ Del</button>"
);
code = code.replace(
  "color: var(--clr-accent-1);",
  "background-color: var(--clr-accent-1); color: white;" // make it look like btn-danger
);

fs.writeFileSync('d:/TopsCore/js/admin/assessment-management.js', code);
console.log("Patched Delete button.");

// Also let's fix the builder crash
let bCode = fs.readFileSync('d:/TopsCore/js/admin/assessment-builder.js', 'utf8');
bCode = bCode.replace(
  "typeRadio.disabled = true;",
  "if (typeRadio) typeRadio.disabled = true;"
);
fs.writeFileSync('d:/TopsCore/js/admin/assessment-builder.js', bCode);
console.log("Patched Builder crash.");
