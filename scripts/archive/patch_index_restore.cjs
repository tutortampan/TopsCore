const fs = require('fs');
const file = 'd:/TopsCore/index.html';
let content = fs.readFileSync(file, 'utf8');

const target = `    // --- Restore saved login (Remember Me) ---
    async function restoreSavedLogin() {
      const saved = getSavedLogin();
      if (!saved || !rememberEnabled) {
        await loadInstitutions();
        return;
      }

      showToast('Restoring your saved login...', 'info');

      // Step 1: Load institutions and auto-collapse to saved program
      await loadPrograms(saved.institutionId);
      if (!state.institutionId) { await loadInstitutions(); return; }

      // Collapse program section
      collapseSection('sec-program', saved.institutionName || state.institutionName, 'step-num-1');

      // Step 2: Load programs
      await loadClasses(saved.programId);
      if (!state.programId) { unlockSection('sec-program'); return; }

      collapseSection('sec-class', saved.programName || state.programName, 'step-num-2');`;

const replacement = `    // --- Restore saved login (Remember Me) ---
    async function restoreSavedLogin() {
      const saved = getSavedLogin();
      if (!saved || !rememberEnabled) {
        await loadInstitutions();
        return;
      }

      showToast('Restoring your saved login...', 'info');

      // Step 1: Load institutions
      await loadInstitutions(saved.institutionId);
      if (!state.institutionId) { await loadInstitutions(); return; }

      // Collapse institution section
      collapseSection('sec-institution', saved.institutionName || state.institutionName, 'step-num-1');

      // Step 2: Load programs
      await loadPrograms(saved.programId);
      if (!state.programId) { unlockSection('sec-program'); return; }

      collapseSection('sec-program', saved.programName || state.programName, 'step-num-2');`;

if (content.includes(target.trim())) {
    content = content.replace(target.trim(), replacement.trim());
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed restoreSavedLogin in index.html successfully.');
} else {
    console.log('Could not find target block to replace.');
}
