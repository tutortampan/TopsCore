const fs = require('fs');
const file = 'd:/TopsCore/js/admin/student-management.js';
let content = fs.readFileSync(file, 'utf8');

const regex = /if\s*\(progressPayload\.length\s*>\s*0\)\s*\{\s*\/\/\s*Upsert\s*one\s*by\s*one\s*to\s*avoid\s*constraint\s*issues\s*for\s*\(const\s*p\s*of\s*progressPayload\)\s*\{\s*if\s*\(p\.id\)\s*\{\s*await\s*sb\.from\('progress'\)\.update\(\{unlocked_level:\s*p\.unlocked_level\}\)\.eq\('id',\s*p\.id\);\s*\}\s*else\s*\{\s*await\s*sb\.from\('progress'\)\.insert\(p\);\s*\}\s*\}\s*clearAdminCache\('progress'\);\s*\}/s;

const replacement = `      if (progressPayload.length > 0) {
        for (const p of progressPayload) {
          const payloadToSave = {
             student_id: p.student_id,
             class_id: p.class_id,
             unlocked_level: p.unlocked_level
          };
          if (p.id) {
            const { error } = await sb.from('progress').update(payloadToSave).eq('id', p.id);
            if (error) {
               console.error('Progress update error:', error);
               throw new Error('Failed to update level: ' + error.message);
            }
          } else {
            const { error } = await sb.from('progress').upsert(payloadToSave, { onConflict: 'student_id,class_id' });
            if (error) {
               console.error('Progress upsert error:', error);
               throw new Error('Failed to set level: ' + error.message);
            }
          }
        }
        clearAdminCache('progress');
      }`;

if (regex.test(content)) {
    content = content.replace(regex, replacement);
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed progress save successfully.');
} else {
    console.log('Could not find target block to replace.');
}
