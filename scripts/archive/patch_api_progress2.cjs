const fs = require('fs');
const file = 'd:/TopsCore/js/api.js';
let content = fs.readFileSync(file, 'utf8');

const regex = /export async function fetchStudentProgress\(studentId\) \{\s*const sb = await getSupabase\(\);\s*const \{ data, error \} = await sb\.from\('progress'\)\.select\('\*'\)\.eq\('student_id', studentId\);\s*if \(error\) throw error;\s*return data;\s*\}/s;

const replacement = `export async function fetchStudentProgress(studentId) {
  const sb = await getSupabase();
  const { data, error } = await sb.from('progress').select('*').eq('student_id', studentId);
  if (error) {
    console.error('Progress fetch error:', error);
    return [];
  }
  return data || [];
}`;

if (regex.test(content)) {
    content = content.replace(regex, replacement);
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed fetchStudentProgress successfully.');
} else {
    console.log('Could not find target block to replace.');
}
