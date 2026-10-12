const fs = require('fs');
let changelog = fs.readFileSync('docs/CHANGELOG.md', 'utf8');

const newEntry = `## [2026-10-09 03:36] — Streamline Section Headers and Remove Redundancy

**Agent/Session:** Antigravity
**Phase:** UX Refinement
**Status:** PASS

### Why
- User wanted to remove redundant "My" prefixes from section titles, drop verbose subtitles to save vertical space, and tighten header spacing across all dashboard sections.

### Changed
- Stripped "My" prefix from "Next Assessment", "Classes", and "Completed Assessments" in \`dashboard.html\`.
- Removed all \`<p class="section-subtitle">\` nodes to eliminate text bloat.
- Adjusted \`css/dashboard.css\` to force \`.section-title\` font size to 1rem and set \`margin-bottom: 6px\` globally across section headers.
- Stripped inline margin overrides from section titles.

### Files
- \`dashboard.html\`
- \`css/dashboard.css\`

### Next Action
- Await testing and feedback from user.

`;

fs.writeFileSync('docs/CHANGELOG.md', newEntry + changelog);
console.log('Updated CHANGELOG.md');
