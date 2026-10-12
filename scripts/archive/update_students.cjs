const fs = require('fs');
let content = fs.readFileSync('js/admin/student-management.js', 'utf8');

// 1. Fetch levels
content = content.replace(
  /const \[institutions, programs, batches\] = await Promise\.all\(\[/,
  'const [institutions, programs, batches, levels] = await Promise.all(['
);
content = content.replace(
  /adminFetchAll\('batches'\)\s*\]\);/,
  "adminFetchAll('batches'),\n        adminFetchAll('levels')\n      ]);"
);

// 2. Add Level Dropdown
const levelDropdown = `            <div>
              <label class="form-label" style="display:block;margin-bottom:0.25rem;">Level</label>
              <select id="bulk-level" class="form-input">
                <option value="">-- No Change --</option>
                \${levels.map(l => \`<option value="\${l.id}">\${l.name}</option>\`).join('')}
              </select>
            </div>
            `;
content = content.replace(
  /<div>\s*<label class="form-label" style="display:block;margin-bottom:0\.25rem;">Gender<\/label>/,
  levelDropdown + '<div>\n              <label class="form-label" style="display:block;margin-bottom:0.25rem;">Gender</label>'
);

// 3. Save Logic
content = content.replace(
  /const gender = overlay\.querySelector\('#bulk-gender'\)\.value;/,
  "const gender = overlay.querySelector('#bulk-gender').value;\n        const levelId = overlay.querySelector('#bulk-level').value;"
);
content = content.replace(
  /if \(gender\) updates\.gender = gender;/,
  "if (gender) updates.gender = gender;\n        if (levelId) updates.level_id = levelId;"
);

fs.writeFileSync('js/admin/student-management.js', content);
