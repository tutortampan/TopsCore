const fs = require('fs');
let code = fs.readFileSync('d:/TopsCore/js/admin/assessment-management.js', 'utf8');

// 1. Truncate Title
code = code.replace(
  `return \`<div class="fw-700" style="color:var(--clr-text-1); font-size:0.85rem; white-space:normal; min-width:250px;" title="\${escapeHtml(title)}">\${escapeHtml(title)}</div>\`;`,
  `return \`<div class="fw-700" style="color:var(--clr-text-1); font-size:0.85rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:250px;" title="\${escapeHtml(title)}">\${escapeHtml(title)}</div>\`;`
);

// 2. Truncate Prerequisite
code = code.replace(
  `<div class="fw-500 text-muted" style="font-size:0.75rem; min-width: 200px; white-space: normal;" title="\${escapeHtml(prereqDisplay)}">`,
  `<div class="fw-500 text-muted" style="font-size:0.75rem; max-width: 150px; white-space: nowrap; overflow:hidden; text-overflow:ellipsis;" title="\${escapeHtml(prereqDisplay)}">`
);

// 3. Compact Action Buttons
const oldButtons = `              <button class="btn btn-ghost" style="padding: 2px 6px; font-size: 0.75rem;" title="View Results" onclick="window._filterAssessmentResults='\${id}'; window.loadSection('results');">&#128202;</button>
              <button class="btn btn-ghost" style="padding: 2px 6px; font-size: 0.75rem;" title="Recalibrate" onclick="window._filterRecalibrateAssessment='\${id}'; window.loadSection('recalibrator');">&#9878;&#65039;</button>
              <button class="btn btn-secondary" style="padding: 2px 6px; font-size: 0.75rem;" onclick="window._duplicateAssessment('\${id}')" title="Duplicate">Copy</button>
              <button class="btn \${String(r?.status).toLowerCase() === 'published' ? 'btn-danger' : 'btn-success'}" style="padding: 2px 6px; font-size: 0.75rem;" onclick="window._publishAssessment('\${id}', '\${r?.status || 'draft'}')">
                \${String(r?.status).toLowerCase() === 'published' ? 'Unpub' : 'Pub'}
              </button>
              <button class="btn btn-secondary" style="padding: 2px 6px; font-size: 0.75rem;" onclick="window.openAssessmentBuilder('\${id}')">Edit</button>
              <button class="btn btn-danger" style="padding: 2px 6px; font-size: 0.75rem;" onclick="window._deleteRecord('assessments', '\${id}', '\${escapeHtml(r?.title || '')}')">🗑️ Del</button>`;

const newButtons = `              <button class="btn btn-ghost" style="padding: 2px 6px; font-size: 0.85rem;" title="View Results" onclick="window._filterAssessmentResults='\${id}'; window.loadSection('results');">&#128202;</button>
              <button class="btn btn-ghost" style="padding: 2px 6px; font-size: 0.85rem;" title="Recalibrate" onclick="window._filterRecalibrateAssessment='\${id}'; window.loadSection('recalibrator');">&#9878;&#65039;</button>
              <button class="btn btn-secondary" style="padding: 2px 6px; font-size: 0.85rem;" onclick="window._duplicateAssessment('\${id}')" title="Duplicate">📄</button>
              <button class="btn \${String(r?.status).toLowerCase() === 'published' ? 'btn-warning' : 'btn-success'}" style="padding: 2px 6px; font-size: 0.85rem;" onclick="window._publishAssessment('\${id}', '\${r?.status || 'draft'}')" title="\${String(r?.status).toLowerCase() === 'published' ? 'Unpublish' : 'Publish'}">
                \${String(r?.status).toLowerCase() === 'published' ? '👁️‍🗨️' : '👁️'}
              </button>
              <button class="btn btn-secondary" style="padding: 2px 6px; font-size: 0.85rem;" onclick="window.openAssessmentBuilder('\${id}')" title="Edit">✏️</button>
              <button class="btn btn-danger" style="padding: 2px 6px; font-size: 0.85rem;" onclick="window._deleteRecord('assessments', '\${id}', '\${escapeHtml(r?.title || '')}')" title="Delete">🗑️</button>`;

code = code.replace(oldButtons, newButtons);

fs.writeFileSync('d:/TopsCore/js/admin/assessment-management.js', code);
console.log("Patched UI Density.");
