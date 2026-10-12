const fs = require('fs');

const path = 'd:/TopsCore/js/admin/assessment-management.js';
let code = fs.readFileSync(path, 'utf8');

function replaceAllWhitespace(str) {
  return str.replace(/\s+/g, '');
}

function findAndReplace(original, target, replacement) {
  const cleanTarget = replaceAllWhitespace(target);
  let startIdx = -1;
  let endIdx = -1;
  
  // A simple sliding window approach to find the target ignoring whitespace
  let cleanStr = "";
  let map = []; // maps cleanStr index to original index
  for (let i = 0; i < original.length; i++) {
    if (!/\s/.test(original[i])) {
      cleanStr += original[i];
      map.push(i);
    }
  }
  
  const idx = cleanStr.indexOf(cleanTarget);
  if (idx !== -1) {
    startIdx = map[idx];
    endIdx = map[idx + cleanTarget.length - 1];
    const newCode = original.substring(0, startIdx) + replacement + original.substring(endIdx + 1);
    return newCode;
  }
  return original;
}

// 1. Add shellCode to gridData
const t1 = `qCount: _isDyn ? _vaultQ : qCount,
      qIsVault: _isDyn,
      status,
      raw: r
    };`;
const r1 = `qCount: _isDyn ? _vaultQ : qCount,
      qIsVault: _isDyn,
      status,
      shellCode: r?.shell_code || '',
      raw: r
    };`;
code = findAndReplace(code, t1, r1);

// 2. Change ORD to CODE
const t2 = `{
        key: 'order',
        label: 'ORD',
        sortable: true,
        render: (val, row) => {
          const r = (row && typeof row === 'object') ? row : {};
          return \`<div style="font-size:0.75rem; color:var(--clr-text-2); white-space:nowrap;">\${r?.order || '-'}</div>\`;
        }
      },`;
const r2 = `{
        key: 'order',
        label: 'CODE',
        sortable: true,
        render: (val, row) => {
          const r = (row && typeof row === 'object') ? row : {};
          if (r?.shellCode) {
            return \`<div style="font-size:0.7rem; color:var(--clr-primary); font-family:monospace; font-weight:bold; white-space:nowrap; background:rgba(255,255,255,0.05); padding:2px 6px; border-radius:4px; border:1px solid rgba(255,255,255,0.1);" title="\${escapeHtml(r.shellCode)}">\${escapeHtml(r.shellCode)}</div>\`;
          }
          return \`<div style="font-size:0.75rem; color:var(--clr-text-2); white-space:nowrap;">ORD: \${r?.order || '-'}</div>\`;
        }
      },`;
code = findAndReplace(code, t2, r2);

// 3. Truncate TITLE
const t3 = `return \`<div class="fw-700" style="color:var(--clr-text-1); font-size:0.85rem; white-space:normal; min-width:250px;" title="\${escapeHtml(title)}">\${escapeHtml(title)}</div>\`;`;
const r3 = `return \`<div class="fw-700" style="color:var(--clr-text-1); font-size:0.85rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:250px;" title="\${escapeHtml(title)}">\${escapeHtml(title)}</div>\`;`;
code = findAndReplace(code, t3, r3);

// 4. Truncate PREREQUISITE
const t4 = `<div class="fw-500 text-muted" style="font-size:0.75rem; min-width: 200px; white-space: normal;" title="\${escapeHtml(prereqDisplay)}">`;
const r4 = `<div class="fw-500 text-muted" style="font-size:0.75rem; max-width: 150px; white-space: nowrap; overflow:hidden; text-overflow:ellipsis;" title="\${escapeHtml(prereqDisplay)}">`;
code = findAndReplace(code, t4, r4);

// 5. Compact Action Buttons
const t5 = `<button class="btn btn-ghost" style="padding: 2px 6px; font-size: 0.75rem;" title="View Results" onclick="window._filterAssessmentResults='\${id}'; window.loadSection('results');">&#128202;</button>
              <button class="btn btn-ghost" style="padding: 2px 6px; font-size: 0.75rem;" title="Recalibrate" onclick="window._filterRecalibrateAssessment='\${id}'; window.loadSection('recalibrator');">&#9878;&#65039;</button>
              <button class="btn btn-secondary" style="padding: 2px 6px; font-size: 0.75rem;" onclick="window._duplicateAssessment('\${id}')" title="Duplicate">Copy</button>
              <button class="btn \${String(r?.status).toLowerCase() === 'published' ? 'btn-danger' : 'btn-success'}" style="padding: 2px 6px; font-size: 0.75rem;" onclick="window._publishAssessment('\${id}', '\${r?.status || 'draft'}')">
                \${String(r?.status).toLowerCase() === 'published' ? 'Unpub' : 'Pub'}
              </button>
              <button class="btn btn-secondary" style="padding: 2px 6px; font-size: 0.75rem;" onclick="window.openAssessmentBuilder('\${id}')">Edit</button>
              <button class="btn btn-secondary" style="padding: 2px 6px; font-size: 0.75rem; color: var(--clr-accent-1);" onclick="window._deleteRecord('Assessments', '\${id}', '\${escapeHtml(r?.title || '')}')">Del</button>`;

const r5 = `<button class="btn btn-ghost" style="padding: 2px 6px; font-size: 0.85rem;" title="View Results" onclick="window._filterAssessmentResults='\${id}'; window.loadSection('results');">&#128202;</button>
              <button class="btn btn-ghost" style="padding: 2px 6px; font-size: 0.85rem;" title="Recalibrate" onclick="window._filterRecalibrateAssessment='\${id}'; window.loadSection('recalibrator');">&#9878;&#65039;</button>
              <button class="btn btn-secondary" style="padding: 2px 6px; font-size: 0.85rem;" onclick="window._duplicateAssessment('\${id}')" title="Duplicate">📄</button>
              <button class="btn \${String(r?.status).toLowerCase() === 'published' ? 'btn-warning' : 'btn-success'}" style="padding: 2px 6px; font-size: 0.85rem;" onclick="window._publishAssessment('\${id}', '\${r?.status || 'draft'}')" title="\${String(r?.status).toLowerCase() === 'published' ? 'Unpublish' : 'Publish'}">
                \${String(r?.status).toLowerCase() === 'published' ? '👁️‍🗨️' : '👁️'}
              </button>
              <button class="btn btn-secondary" style="padding: 2px 6px; font-size: 0.85rem;" onclick="window.openAssessmentBuilder('\${id}')" title="Edit">✏️</button>
              <button class="btn btn-danger" style="padding: 2px 6px; font-size: 0.85rem;" onclick="window._deleteRecord('assessments', '\${id}', '\${escapeHtml(r?.title || '')}')" title="Delete">🗑️</button>`;

code = findAndReplace(code, t5, r5);

fs.writeFileSync(path, code);
console.log("Successfully patched the UI fully.");
