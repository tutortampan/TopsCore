import fs from 'fs';

const classMgmt = fs.readFileSync('js/admin/classes-management.js', 'utf8');
const classIdx = classMgmt.indexOf('class="btn');
console.log('--- classes-management.js button snippets ---');
const btnRegex = /class="([^"]*btn[^"]*)"/g;
let m;
const classMgmtBtns = new Set();
while ((m = btnRegex.exec(classMgmt)) !== null) {
  classMgmtBtns.add(m[1]);
}
console.log([...classMgmtBtns].slice(0, 20));

console.log('\n--- student-management.js button snippets ---');
const studentMgmt = fs.readFileSync('js/admin/student-management.js', 'utf8');
const studentBtns = new Set();
while ((m = btnRegex.exec(studentMgmt)) !== null) {
  studentBtns.add(m[1]);
}
console.log([...studentBtns].slice(0, 20));

