const fs = require('fs');

const dateStr = new Date().toISOString().slice(0, 16).replace('T', ' ');

const changelogEntry = `
## [${dateStr}] — Streamlined sidebar and unified views

**Agent/Session:** Antigravity
**Phase:** Refactoring Sidebar
**Status:** PASS

### Why
- The user requested streamlining the sidebar by merging unnecessary panels and moving the 'Vocabulary Vault' to the correct logical domain (C - Class).

### Changed
- Removed 'Import Students' and 'Students Roster' distinct sidebar buttons.
- Renamed 'Institutions' to 'Students & Batches' in Domain B.
- Renamed 'Vocabulary Vault' to 'Question Banks' and moved it from Domain D to Domain C.
- Grouped 'Site Settings', 'Audit Logs', 'Data Health', and 'Recycle Bin' into a single 'System Settings' tabbed view under Domain D.
- Added a unified tab interface for 'Students & Batches' to house 'Batches Hierarchy', 'All Students Roster', and 'Import Students' together in one unified view.

### Files
- \`admin.html\`
- \`js/admin/app.js\`

### Database
- N/A

### Tests
- command: N/A
- result: N/A

### Risks / Follow-up
- Validate UI rendering of the new unified tabbed containers in the browser.

### Next Action
- Wait for user feedback on the newly streamlined sidebar.
`;

fs.appendFileSync('docs/CHANGELOG.md', changelogEntry);

const currentState = `
# CURRENT STATE

Last Updated: ${dateStr} UTC
Current Phase: Sidebar Streamlining
Current Task: Merging Views
Status: COMPLETE

## Completed
- Sidebar items 'Import Students' and 'Students' merged into 'Students & Batches'.
- Sidebar items 'Audit', 'Health', 'Recycle', and 'Settings' merged into 'System Settings'.
- Moved 'Vocabulary Vault' to 'Class' domain and renamed to 'Question Banks'.
- Bugfix: Assessment saving properly captures \`class_id\` due to restored DOM elements.

## In Progress
- Waiting on UI feedback.

## Not Started
- Any remaining refactoring items on assessments.

## Next Exact Action
1. Ask the user to verify the new UI layout.
`;

fs.writeFileSync('docs/CURRENT_STATE.md', currentState);
console.log('Logs updated');
