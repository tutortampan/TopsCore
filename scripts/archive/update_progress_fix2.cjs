const fs = require('fs');
let content = fs.readFileSync('d:/TopsCore/js/admin/student-management.js', 'utf8');

const target2 = `progressPayload.push({
          student_id: finalStudentId,
          class_id: sel.getAttribute('data-class-id'),
          unlocked_level: parseInt(sel.value, 10)
        });`;
const replacement2 = `const pId = sel.getAttribute('data-prog-id');
        const obj = {
          student_id: finalStudentId,
          class_id: sel.getAttribute('data-class-id'),
          unlocked_level: parseInt(sel.value, 10)
        };
        if(pId && pId !== 'undefined' && pId !== 'null' && pId !== '') obj.id = pId;
        progressPayload.push(obj);`;

let replaced = false;
// Attempt normalizing spaces
const normalize = str => str.replace(/\s+/g, '');
const searchNormalized = normalize(target2);
let currentNormalized = '';
let matchStart = -1;
let matchEnd = -1;

for (let i = 0; i < content.length; i++) {
  if (content[i].match(/\S/)) {
    currentNormalized += content[i];
    if (currentNormalized.length === 1) {
      matchStart = i;
    }
    if (currentNormalized === searchNormalized) {
      matchEnd = i;
      break;
    }
    if (!searchNormalized.startsWith(currentNormalized)) {
      currentNormalized = '';
      matchStart = -1;
      // Need to re-evaluate current char if we just failed a match
      // For simplicity, we just backtrack
    }
  }
}

if (matchEnd !== -1) {
  content = content.substring(0, matchStart) + replacement2 + content.substring(matchEnd + 1);
  console.log("Replaced target2 with whitespace normalization");
} else {
  // Try regex replace
  content = content.replace(/progressPayload\.push\(\{\s*student_id:\s*finalStudentId,\s*class_id:\s*sel\.getAttribute\('data-class-id'\),\s*unlocked_level:\s*parseInt\(sel\.value,\s*10\)\s*\}\);/, replacement2);
  console.log("Regex replace attempted");
}

fs.writeFileSync('d:/TopsCore/js/admin/student-management.js', content, 'utf8');
