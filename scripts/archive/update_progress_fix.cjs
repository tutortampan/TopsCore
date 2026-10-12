const fs = require('fs');
let content = fs.readFileSync('d:/TopsCore/js/admin/student-management.js', 'utf8');

const target1 = `<select class="form-control bfe-class-progress" data-class-id="\${cls.id}">`;
const replacement1 = `<select class="form-control bfe-class-progress" data-class-id="\${cls.id}" data-prog-id="\${prog ? prog.id : ''}">`;

if (content.includes(target1)) {
  content = content.replace(target1, replacement1);
  console.log("Replaced target1");
} else {
  console.log("Could not find target1");
}

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

if (content.includes(target2)) {
  content = content.replace(target2, replacement2);
  console.log("Replaced target2");
} else {
  console.log("Could not find target2");
}

fs.writeFileSync('d:/TopsCore/js/admin/student-management.js', content, 'utf8');
