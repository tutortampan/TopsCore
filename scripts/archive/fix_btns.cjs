const fs = require('fs');
let c = fs.readFileSync('index.html', 'utf8');

c = c.replace(`    // ── Change buttons ──
    document.getElementById('change-institution-btn').addEventListener('click', () => {
      reopenSection('sec-institution');
      resetFrom('institution');
    });
    document.getElementById('change-program-btn').addEventListener('click', () => {
      reopenSection('sec-program');
      resetFrom('batch');
    });
    document.getElementById('change-batch-btn').addEventListener('click', () => {
      reopenSection('sec-batch');
      resetFrom('student');
    });
    document.getElementById('change-student-btn').addEventListener('click', () => {
      reopenSection('sec-student');
      resetFrom('pin');
    });`, `    // ── Change buttons ──
    document.getElementById('change-institution-btn').addEventListener('click', () => {
      state.institutionId = null; state.institutionName = null;
      resetFrom('program');
      reopenSection('sec-institution');
    });
    document.getElementById('change-program-btn').addEventListener('click', () => {
      resetFrom('program');
      reopenSection('sec-program');
    });
    document.getElementById('change-batch-btn').addEventListener('click', () => {
      resetFrom('batch');
      reopenSection('sec-batch');
    });
    document.getElementById('change-student-btn').addEventListener('click', () => {
      resetFrom('student');
      reopenSection('sec-student');
    });`);

c = c.replace(`    clearLinkEl.addEventListener('click', () => {
      clearSavedLogin();
      showToast('Saved login cleared.', 'info');
    });`, `    clearLinkEl.addEventListener('click', () => {
      clearSavedLogin();
      state.institutionId = null; state.institutionName = null;
      resetFrom('program');
      reopenSection('sec-institution');
      showToast('Saved login cleared.', 'info');
    });`);

fs.writeFileSync('index.html', c);
console.log("Fixed btns");
