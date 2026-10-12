const fs = require('fs');
const entry = `## [2026-10-10 12:40] - Dashboard & Login Navigation Fixes

**Agent/Session:** Antigravity
**Phase:** Bug Fixes
**Status:** PASS

### Why
- User reported login cascading selection opened 2 options at once (institution and program) on initialization.
- User reported dashboard was stuck in an infinite loading state ('Loading Classes...').

### Changed
- Fixed \`restoreSavedLogin\` in \`index.html\` to correctly call \`loadInstitutions()\` for step 1 and \`loadPrograms()\` for step 2, eliminating the UI glitch that unlocked both at once.
- Replaced \`throw error\` with safe \`console.error\` returning \`[]\` in \`fetchStudentProgress\` (\`js/api.js\`) to prevent Promise rejection if RLS blocks the progress table.
- Added fallback rendering clearing the 'Loading...' placeholders in \`loadDashboard\` catch block within \`dashboard.html\`.

### Files
- \`index.html\`
- \`js/api.js\`
- \`dashboard.html\`

`; 
let content = fs.readFileSync('d:/TopsCore/docs/CHANGELOG.md', 'utf8'); 
fs.writeFileSync('d:/TopsCore/docs/CHANGELOG.md', entry + content);
