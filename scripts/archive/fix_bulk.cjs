const fs = require('fs');

let c = fs.readFileSync('d:/TopsCore/js/admin/student-management.js', 'utf8');

c = c.replace(/background:rgba\(0,0,0,0\.6\);/g, 'background:rgba(15,23,42,0.95);backdrop-filter:blur(5px);');
c = c.replace(/background:var\(--clr-surface-2,#1e2235\);/g, 'background:var(--fm-bg-panel, #0F172A);');

c = c.replace(/adminFetchAll\('levels'\)\s*\]\);/, `adminFetchAll('levels')
      ]);

      const sortFn = (a, b) => (a.name || '').localeCompare(b.name || '');
      institutions.sort(sortFn);
      programs.sort(sortFn);
      batches.sort(sortFn);
      levels.sort(sortFn);`);

c = c.replace(/for \(const id of selectedIds\) \{\s*await sb\.from\('students'\)\.update\(updates\)\.eq\('id', id\);\s*\}/, `for (const id of selectedIds) {
          const { error } = await sb.from('students').update(updates).eq('id', id);
          if (error) {
             console.error('Update error on ID', id, error);
             showToast('Failed to update student: ' + error.message, 'error');
             return;
          }
        }`);

c = c.replace(/showToast\(\`Updated \$\{selectedIds\.length\} students\.\`, 'success'\);\s*renderStudents\(area\);/, `showToast(\`Updated \${selectedIds.length} students.\`, 'success');
        if (typeof window.loadSection === 'function') window.loadSection('students'); else renderStudents(area);`);

fs.writeFileSync('d:/TopsCore/js/admin/student-management.js', c);
console.log("File updated");
