const fs = require('fs');
const path = require('path');

console.log('Testing all modal / wizard generators in js/admin/ ...');

// Check test-builder.js
const tbContent = fs.readFileSync('js/admin/test-builder.js', 'utf8');
const tbMatches = [...tbContent.matchAll(/document\.getElementById\(['"]([^'"]+)['"]\)/g)].map(m => m[1]);
console.log('Total document.getElementById in test-builder.js:', tbMatches.length);
const tbMissing = tbMatches.filter(id => !tbContent.includes('id="' + id + '"') && !tbContent.includes("id='" + id + "'"));
console.log('Missing IDs in test-builder.js:', [...new Set(tbMissing)]);

// Check auto-gen-modal.js
const agContent = fs.readFileSync('js/admin/auto-gen-modal.js', 'utf8');
const agMatches = [...agContent.matchAll(/document\.getElementById\(['"]([^'"]+)['"]\)/g)].map(m => m[1]);
const agMissing = agMatches.filter(id => !agContent.includes('id="' + id + '"') && !agContent.includes("id='" + id + "'"));
console.log('Missing IDs in auto-gen-modal.js:', [...new Set(agMissing)]);

// Check test-system-settings-modal.js
const ssContent = fs.readFileSync('js/admin/test-system-settings-modal.js', 'utf8');
const ssMatches = [...ssContent.matchAll(/document\.getElementById\(['"]([^'"]+)['"]\)/g)].map(m => m[1]);
const ssMissing = ssMatches.filter(id => !ssContent.includes('id="' + id + '"') && !ssContent.includes("id='" + id + "'"));
console.log('Missing IDs in test-system-settings-modal.js:', [...new Set(ssMissing)]);

// Check class.js
const clContent = fs.readFileSync('js/admin/class.js', 'utf8');
const clMatches = [...clContent.matchAll(/document\.getElementById\(['"]([^'"]+)['"]\)/g)].map(m => m[1]);
const clMissing = clMatches.filter(id => !clContent.includes('id="' + id + '"') && !clContent.includes("id='" + id + "'"));
// Check if roster-modal is in admin.html
const adminHtml = fs.readFileSync('admin.html', 'utf8');
console.log('roster-modal in admin.html:', adminHtml.includes('id="roster-modal"') || adminHtml.includes("id='roster-modal'"));
console.log('roster-modal-tbody in admin.html:', adminHtml.includes('id="roster-modal-tbody"'));
console.log('roster-add-student-select in admin.html:', adminHtml.includes('id="roster-add-student-select"'));
console.log('roster-add-student-btn in admin.html:', adminHtml.includes('id="roster-add-student-btn"'));

