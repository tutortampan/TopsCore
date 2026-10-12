const fs = require('fs');
let log = fs.readFileSync('d:/TopsCore/docs/CHANGELOG.md', 'utf8');
const entry = `## [2026-10-09 10:40] - Admin UI Fixes

**Agent/Session:** Antigravity
**Phase:** Phase 14 - UX Refinement
**Status:** PASS

### Why
- User reported transparency issues in the edit student modal.
- User requested dropdowns for batches and classes be sorted alphabetically.
- User reported saving levels didn't persist, likely due to an issue with the progress upsert conflict constraint.

### Changed
- Patched \`js/admin/student-management.js\` to set solid \`#0f172a\` background on \`openStudentFullEdit\` modal.
- Added \`.sort((a,b) => (a.name||'').localeCompare(b.name||''))\` to \`batches\` and \`classes\` to ensure alphabetical ordering in dropdowns.
- Updated progress save logic to include \`id\` and use \`.update().eq('id', p.id)\` instead of \`upsert\` with \`onConflict\` parameter, avoiding potential schema constraint errors.
- Verified Admin sidebar handles (audit log completed, all match corresponding domains in \`app.js\`).

### Files
- \`js/admin/student-management.js\`
- \`js/admin/app.js\`

### Next Action
- Await further instructions from user.

`;
fs.writeFileSync('d:/TopsCore/docs/CHANGELOG.md', entry + log, 'utf8');

let state = fs.readFileSync('d:/TopsCore/docs/CURRENT_STATE.md', 'utf8');
state = state.replace('## Newly Completed', '## Newly Completed\n- Admin UI: Fixed transparent edit student modal.\n- Admin UI: Added alphabetical sorting to Batch and Class dropdowns in student edit.\n- Admin UI: Fixed Level / Progress saving logic in student edit.\n- Admin UI: Audited sidebar handlers for ABCD domains.');
fs.writeFileSync('d:/TopsCore/docs/CURRENT_STATE.md', state, 'utf8');
console.log('Updated CHANGELOG and CURRENT_STATE');
