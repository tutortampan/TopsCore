const fs = require('fs');
const file = 'd:/TopsCore/js/api.js';
let content = fs.readFileSync(file, 'utf8');

const target = `export async function fetchStudentProgress(studentId) {
  const sb = await getSupabase();
  const { data, error } = await sb.from('progress').select('*').eq('student_id', studentId);
  if (error) throw error;
  return data;
}`;

const replacement = `export async function fetchStudentProgress(studentId) {
  const sb = await getSupabase();
  const { data, error } = await sb.from('progress').select('*').eq('student_id', studentId);
  if (error) {
    console.error('Progress fetch error:', error);
    return [];
  }
  return data || [];
}`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed fetchStudentProgress successfully.');
} else {
    console.log('Could not find target block to replace in api.js');
}
