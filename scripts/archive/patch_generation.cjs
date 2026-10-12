const fs = require('fs');

// 1. Update API.js
let apiCode = fs.readFileSync('d:/TopsCore/js/api.js', 'utf8');
apiCode = apiCode.replace(
  "const code = tier === 'TEST' ? `${modulePrefix}-TEST-${themeCode}` : `${modulePrefix}-TASK-${themeCode}-${topicCode}`;",
  "const suffix = category === 'phrases' ? 'PHR' : 'WOR';\n  const code = tier === 'TEST' ? `${levelNum}${modulePrefix}-${themeCode}-TEST-${suffix}` : `${levelNum}${modulePrefix}-${topicCode}-${suffix}`; // e.g. 3VOCAB-A1-PHR"
);
fs.writeFileSync('d:/TopsCore/js/api.js', apiCode);

// 2. Update assessment-management.js
let uiCode = fs.readFileSync('d:/TopsCore/js/admin/assessment-management.js', 'utf8');
uiCode = uiCode.replace(
  "const prereqTitle = prereqAssessment?.title || prereqAssessment?.name || r?.prereq?.name || r?.prerequisite?.name || r?.prereq || '';",
  "const prereqTitle = prereqAssessment?.shell_code || prereqAssessment?.title || prereqAssessment?.name || r?.prereq?.name || r?.prerequisite?.name || r?.prereq || '';"
);
fs.writeFileSync('d:/TopsCore/js/admin/assessment-management.js', uiCode);

console.log("Patched code generation and prerequisite UI.");
