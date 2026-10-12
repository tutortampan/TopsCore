const fs = require('fs');
let c = fs.readFileSync('js/admin/student-management.js', 'utf8');

c = c.replace(
  /const payload = \{([\s\S]*?)photo_url:  currentPhotoUrl \|\| null,\n    \};/,
  `const payload = {$1photo_url:  currentPhotoUrl || null,
    };
    if (!finalStudentId) {
      payload.institution_id = document.getElementById('filter-institution')?.value || null;
      payload.program_id = document.getElementById('filter-program')?.value || null;
      
      if (!payload.institution_id || !payload.program_id) {
        showToast('Please select Institution and Program from the filters before adding a student.', 'error');
        newSaveBtn.innerHTML = 'Save Student';
        newSaveBtn.disabled = false;
        return;
      }
    }`
);

fs.writeFileSync('js/admin/student-management.js', c);
console.log('Done');
