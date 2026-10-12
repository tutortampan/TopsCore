const fs = require('fs');
let content = fs.readFileSync('d:/TopsCore/js/admin/student-management.js', 'utf8');

// 1. Solid background
content = content.replace('background:var(--clr-surface-2, #0f172a);', 'background:#0f172a;');

// 2. Sort batches alphabetically
content = content.replace('batches = bRes || [];', "batches = (bRes || []).sort((a,b) => (a.name||'').localeCompare(b.name||''));");

// 3. Sort classes alphabetically
content = content.replace('classes = cRes || [];', "classes = (cRes || []).sort((a,b) => (a.name||'').localeCompare(b.name||''));");

// 4. Progress upsert -> Include ID if exists
// Find where we build the options:
let searchStr = 'html += `\n              <div class="form-group mb-0">\n                <label class="form-label" style="font-size:0.75rem;">${escHtml(cls.name)}</label>\n                <select class="form-control bfe-class-progress" data-class-id="${cls.id}">';
let replaceStr = 'html += `\n              <div class="form-group mb-0">\n                <label class="form-label" style="font-size:0.75rem;">${escHtml(cls.name)}</label>\n                <select class="form-control bfe-class-progress" data-class-id="${cls.id}" data-prog-id="${prog ? prog.id : \'\'}">';
content = content.replace(searchStr, replaceStr);

let pushSearch = `progressPayload.push({
          student_id: finalStudentId,
          class_id: sel.getAttribute('data-class-id'),
          unlocked_level: parseInt(sel.value, 10)
        });`;
let pushReplace = `const pId = sel.getAttribute('data-prog-id');
        const obj = {
          student_id: finalStudentId,
          class_id: sel.getAttribute('data-class-id'),
          unlocked_level: parseInt(sel.value, 10)
        };
        if(pId) obj.id = pId;
        progressPayload.push(obj);`;
content = content.replace(pushSearch, pushReplace);

let upsertSearch = `await sb.from('progress').upsert(progressPayload, { onConflict: 'student_id,class_id' });`;
let upsertReplace = `// Upsert one by one to avoid constraint issues
        for (const p of progressPayload) {
          if (p.id) {
            await sb.from('progress').update({unlocked_level: p.unlocked_level}).eq('id', p.id);
          } else {
            await sb.from('progress').insert(p);
          }
        }`;
content = content.replace(upsertSearch, upsertReplace);

fs.writeFileSync('d:/TopsCore/js/admin/student-management.js', content, 'utf8');
console.log('Patched student-management.js');
