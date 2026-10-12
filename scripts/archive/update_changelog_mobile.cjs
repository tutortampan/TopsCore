const fs = require('fs');
let changelog = fs.readFileSync('docs/CHANGELOG.md', 'utf8');

const newEntry = `## [2026-10-09 03:45] — Resolve Mobile Layout Bloat and Normalization

**Agent/Session:** Antigravity
**Phase:** UX Refinement
**Status:** PASS

### Why
- User requested specific cleanups to redundant text (badges/classes), symmetry in glowing text, compacted history cards, and spacing around header icons.
- Also implemented structural fixes based on analysis (removing double card nesting, vertical alignment for the Start Now button, reduced outer padding).

### Changed
- \`dashboard.html\`:
  - \`populateUpNext()\`: Removed redundant class name badge and normalized the assessment type string (e.g. from \`VOCAB_TASK\` to \`Task\`).
  - \`renderClasses()\`: Trimmed class name to show just the subject without repeating the level.
  - Removed \`card\` class from \`.up-next-section\`, \`.classes-section\`, and \`.completed-Assessments-section\` to eliminate nested margins and double borders on mobile.
  - Remapped the \`up-next-container\` internal layout to be vertical, letting the "Start Now" button span 100% width on the bottom.
  - Added a 6px space gap behind section emoji icons using \`<span>\`.
  - Tightened root \`main\` margins and paddings for a better mobile fit.
- \`css/dashboard.css\`:
  - Enforced compact padding (8px 12px) and a smaller gap (4px) on \`.completed-Assessment-mobile-card\`.
  - Added exact match drop-shadow/text-shadow effects to \`#stat-overall-grade-value\` to maintain visual symmetry with the average score.
  - Adjusted \`.score-bar-wrap\` background to \`rgba(255, 255, 255, 0.1)\` to ensure visibility against the dark theme.

### Files
- \`dashboard.html\`
- \`css/dashboard.css\`

### Next Action
- Conduct mobile viewport testing to verify the cards now display optimally.

`;

fs.writeFileSync('docs/CHANGELOG.md', newEntry + changelog);
console.log('Updated CHANGELOG.md');
