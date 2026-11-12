import fs from 'fs';

const classMgmt = fs.readFileSync('js/admin/classes-management.js', 'utf8');
const lines = classMgmt.split('\n');
lines.forEach((l, idx) => {
  if (l.includes('ACTIONS') || l.includes('col-actions') || l.includes('btn-delete') || l.includes('renderActions') || l.includes('actions:')) {
    console.log(idx + 1, l.trim().slice(0, 120));
  }
});

