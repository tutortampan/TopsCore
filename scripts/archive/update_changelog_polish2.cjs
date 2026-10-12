const fs = require('fs');
let changelog = fs.readFileSync('docs/CHANGELOG.md', 'utf8');
const clEntry = `
## [2026-10-09] — Dashboard Banner: Strict Implementation
**Agent/Session:** Antigravity / fbff1461
**Phase:** UI Polish
**Status:** PASS
### Changed
- Directly applied user's provided Node.js script to fully replace \`.welcome-banner\` in \`dashboard.html\`.
- Ensures precise DOM mappings for \`#roster-institution\`, \`#roster-program\`, \`#roster-batch\`.
- Grade-color mapping now strictly sets \`avatarBox.style.borderColor\` directly without CSS variables.
`;
fs.writeFileSync('docs/CHANGELOG.md', changelog + clEntry);
console.log('Changelog updated');
