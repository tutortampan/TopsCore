import fs from 'fs';

const filePath = 'js/api.js';
let content = fs.readFileSync(filePath, 'utf-8');

// Normalize line endings
let norm = content.replace(/\r\n/g, '\n');

// 1. In startTest around line 1140:
const target1 = `  let activeSession = null;
  if (isFormalExam) {
    const accessCheck = await checkStudentTestAccess(studentId, testId);`;

const replacement1 = `  let activeSession = null;
  const isFlexible = (asmData.schedule_mode || asmData.payload?.schedule_mode) === 'flexible';
  if (isFormalExam && !isFlexible && (asmData.schedule_mode === 'strict' || asmData.payload?.test_session)) {
    const accessCheck = await checkStudentTestAccess(studentId, testId);`;

if (!norm.includes(target1)) {
  console.error("target1 not found in js/api.js!");
  process.exit(1);
}
norm = norm.replace(target1, replacement1);

// 2. In checkStudentTestAccess around line 4443:
const target2 = `  if (!isFormalExam) {
    return { allowed: true, is_test: false };
  }

  const session = asm.payload?.test_session;`;

const replacement2 = `  if (!isFormalExam) {
    return { allowed: true, is_test: false };
  }

  const isFlexible = (asm.schedule_mode || asm.payload?.schedule_mode) === 'flexible';
  if (isFlexible) {
    return { allowed: true, is_test: true, is_flexible: true };
  }

  const session = asm.payload?.test_session;`;

if (!norm.includes(target2)) {
  console.error("target2 not found in js/api.js!");
  process.exit(1);
}
norm = norm.replace(target2, replacement2);

fs.writeFileSync(filePath, norm.replace(/\n/g, '\r\n'), 'utf-8');
console.log("Successfully patched flexible exams in js/api.js!");

