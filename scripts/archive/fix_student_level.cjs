const fs = require('fs');
const path = 'd:/TopsCore/js/admin/student-management.js';
let content = fs.readFileSync(path, 'utf8');

// Replace 1: Add initialLevelId
content = content.replace(
  "const initialBatchId = draftData?.batch_id ?? (student?.batch_id || '');\n  const initialPin = draftData?.personal_pin ?? (student?.personal_pin || '');",
  "const initialBatchId = draftData?.batch_id ?? (student?.batch_id || '');\n  const initialLevelId = draftData?.level_id ?? (student?.level_id || '');\n  const initialPin = draftData?.personal_pin ?? (student?.personal_pin || '');"
);

// Replace 2: UI changes
content = content.replace(
  "        ${(() => {\r\n          if (!classes || classes.length === 0) return '';",
  "        ${(() => {\n          if (!levels || levels.length === 0) return '';"
);

content = content.replace(
  "          let html = `\r\n            <div style=\"grid-column:1/-1; margin-top:0.5rem; border-top:1px solid var(--clr-border); padding-top:1rem;\">\r\n              <h4 style=\"margin:0 0 0.75rem 0; font-size:0.95rem; display:flex; justify-content:space-between; align-items:center;\">\r\n                <span>&#128200; Manual Level Assignment</span>\r\n                <span class=\"badge badge-neutral\" style=\"font-weight:normal;\">Applies instantly upon save</span>\r\n              </h4>\r\n              <div style=\"display:grid; grid-template-columns:repeat(auto-fill, minmax(200px, 1fr)); gap:1rem; background:rgba(0,0,0,0.1); padding:1rem; border-radius:8px; border:1px solid var(--clr-border);\">\r\n          `;\r\n          classes.forEach(cls => {\r\n            const prog = studentProgress.find(p => p.class_id === cls.id);\r\n            const currentLevelIndex = draftData?.progress?.[cls.id] ?? (prog ? prog.unlocked_level : 1);\r\n            let options = '';\r\n            levels.forEach((lvl, idx) => {\r\n              const lvlIdx = idx + 1;\r\n              options += `<option value=\"${lvlIdx}\" ${lvlIdx == currentLevelIndex ? 'selected' : ''}>Level ${lvlIdx} - ${escHtml(lvl.name)}</option>`;\r\n            });\r\n            html += `\r\n              <div class=\"form-group mb-0\">\r\n                <label class=\"form-label\" style=\"font-size:0.75rem;\">${escHtml(cls.name)}</label>\r\n                <select class=\"form-control bfe-class-progress\" data-class-id=\"${cls.id}\" data-prog-id=\"${prog ? prog.id : ''}\">\r\n                  ${options}\r\n                </select>\r\n              </div>\r\n            `;\r\n          });\r\n          html += `</div></div>`;\r\n          return html;\r\n        })()}",
  `          let options = '<option value="">-- Inherit from Batch --</option>';
          levels.forEach(lvl => {
            options += '<option value="' + lvl.id + '" ' + (lvl.id === initialLevelId ? 'selected' : '') + '>' + escHtml(lvl.name) + '</option>';
          });
          return \`
            <div style="grid-column:1/-1; margin-top:0.5rem; border-top:1px solid var(--clr-border); padding-top:1rem;">
              <h4 style="margin:0 0 0.75rem 0; font-size:0.95rem; display:flex; justify-content:space-between; align-items:center;">
                <span>📈 Manual Level Assignment</span>
                <span class="badge badge-neutral" style="font-weight:normal;">Applies instantly upon save</span>
              </h4>
              <div style="background:rgba(0,0,0,0.1); padding:1rem; border-radius:8px; border:1px solid var(--clr-border);">
                <div class="form-group mb-0">
                  <label class="form-label">Student's Current Level</label>
                  <select class="form-control" id="bfe-level">
                    \${options}
                  </select>
                </div>
              </div>
            </div>
          \`;
        })()}`
);

// Replace 3: get data from the element
content = content.replace(
  "    const progressMap = {};\r\n    document.querySelectorAll('.bfe-class-progress').forEach(sel => {\r\n      progressMap[sel.dataset.classId] = parseInt(sel.value, 10);\r\n    });",
  ""
);

content = content.replace(
  "progress: progressMap",
  "level_id: document.getElementById('bfe-level')?.value || null"
);

// Replace 4: input updates
content = content.replace(
  "    ['bfe-name', 'bfe-gender', 'bfe-birth', 'bfe-batch', 'bfe-pin', 'bfe-active'].forEach(id => {",
  "    ['bfe-name', 'bfe-gender', 'bfe-birth', 'bfe-batch', 'bfe-level', 'bfe-pin', 'bfe-active'].forEach(id => {"
);

content = content.replace(
  "    document.querySelectorAll('.bfe-class-progress').forEach(sel => sel.addEventListener('change', updateDraft));",
  ""
);

// Replace 5: prepare the payload for database
content = content.replace(
  "      batch_id:   document.getElementById('bfe-batch').value    || null,\r\n      is_active:  document.getElementById('bfe-active').value === 'true',",
  "      batch_id:   document.getElementById('bfe-batch').value    || null,\r\n      level_id:   document.getElementById('bfe-level')?.value   || null,\r\n      is_active:  document.getElementById('bfe-active').value === 'true',"
);

// Replace 6: remove the manual progress assignment code in the DB save.
// Wait, I can just use a regex for this since it spans many lines.
content = content.replace(
  /\/\/ Save manual progress assignments[\s\S]*?clearAdminCache\('progress'\);\r?\n\s*\}/,
  ""
);


fs.writeFileSync(path, content, 'utf8');
console.log("Done");
