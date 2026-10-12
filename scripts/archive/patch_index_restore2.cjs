const fs = require('fs');
const file = 'd:/TopsCore/index.html';
let content = fs.readFileSync(file, 'utf8');

const regex = /\/\/ Step 1: Load institutions and auto-collapse to saved program\s*await loadPrograms\(saved\.institutionId\);\s*if \(!state\.institutionId\) \{ await loadInstitutions\(\); return; \}\s*\/\/ Collapse program section\s*collapseSection\('sec-program', saved\.institutionName \|\| state\.institutionName, 'step-num-1'\);\s*\/\/ Step 2: Load programs\s*await loadClasses\(saved\.programId\);\s*if \(!state\.programId\) \{ unlockSection\('sec-program'\); return; \}\s*collapseSection\('sec-class', saved\.programName \|\| state\.programName, 'step-num-2'\);/s;

const replacement = `// Step 1: Load institutions and auto-collapse to saved institution
      await loadInstitutions(saved.institutionId);
      if (!state.institutionId) { await loadInstitutions(); return; }

      // Collapse institution section
      collapseSection('sec-institution', saved.institutionName || state.institutionName, 'step-num-1');

      // Step 2: Load programs
      await loadPrograms(saved.programId);
      if (!state.programId) { unlockSection('sec-program'); return; }

      collapseSection('sec-program', saved.programName || state.programName, 'step-num-2');`;

if (regex.test(content)) {
    content = content.replace(regex, replacement);
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed restoreSavedLogin successfully.');
} else {
    console.log('Could not find target block to replace.');
}
