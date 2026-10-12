const fs = require('fs');
const path = 'd:/TopsCore/js/admin/student-management.js';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  "  const updateDraft = () => {\r\n    window.isProfileDirty = true;\r\n    level_id: document.getElementById('bfe-level')?.value || null\r\n    };",
  "  const updateDraft = () => {\n    window.isProfileDirty = true;\n    const currentDraft = {\n      name: document.getElementById('bfe-name').value,\n      gender: document.getElementById('bfe-gender').value,\n      birth_date: document.getElementById('bfe-birth').value,\n      batch_id: document.getElementById('bfe-batch').value,\n      personal_pin: document.getElementById('bfe-pin').value,\n      is_active: document.getElementById('bfe-active').value === 'true',\n      level_id: document.getElementById('bfe-level')?.value || null\n    };"
);

// Fallback if \n
content = content.replace(
  "  const updateDraft = () => {\n    window.isProfileDirty = true;\n    level_id: document.getElementById('bfe-level')?.value || null\n    };",
  "  const updateDraft = () => {\n    window.isProfileDirty = true;\n    const currentDraft = {\n      name: document.getElementById('bfe-name').value,\n      gender: document.getElementById('bfe-gender').value,\n      birth_date: document.getElementById('bfe-birth').value,\n      batch_id: document.getElementById('bfe-batch').value,\n      personal_pin: document.getElementById('bfe-pin').value,\n      is_active: document.getElementById('bfe-active').value === 'true',\n      level_id: document.getElementById('bfe-level')?.value || null\n    };"
);

fs.writeFileSync(path, content, 'utf8');
console.log("Done");
