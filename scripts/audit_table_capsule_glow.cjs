const fs = require('fs');

const code = fs.readFileSync('js/admin/tests-access.js', 'utf8');
const start = code.indexOf('renderModalStudents');
const end = code.indexOf('// Footer summary', start);
const snippet = code.substring(start, end);

console.log('--- AUDIT MODAL OPEN SESSION TABLE ---');
console.log('1. Has badgeBg variable:', snippet.includes('badgeBg'));
console.log('2. Has border-radius in TD:', /<td[^>]*>[\s\S]*?border-radius[\s\S]*?<\/td>/.test(snippet));
console.log('3. Has background in TD span:', /<span[^>]*background:[^>]*>/.test(snippet));
console.log('4. Has text-shadow in TD:', /text-shadow:\s*(?!none)[^;'\"]+/.test(snippet));

// Check exact status TD snippet
const tdMatch = snippet.match(/<td style="padding:6px 8px;[\s\S]*?<\/td>/);
if (tdMatch) {
  console.log('Status TD content:\n', tdMatch[0]);
} else {
  console.log('Status TD not found!');
}
