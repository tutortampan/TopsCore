const fs = require('fs');

let state = fs.readFileSync('docs/CURRENT_STATE.md', 'utf8');

// Update Current Task and Status
state = state.replace(/Current Task: .*/, 'Current Task: Conduct Mobile Viewport Height Testing for .mc-option (pending)');
state = state.replace(/Last Updated: .*/, 'Last Updated: 2026-10-09 03:45 UTC');

// Add to completed
const completedMarker = '## Completed';
const completedTask = `- Streamlined dashboard layout (mobile optimized): removed double card nesting, cleaned up badge redundancies, updated Start Now vertical alignment, improved glow symmetry, and compacted UI elements.`;
if (state.includes(completedMarker)) {
  state = state.replace(completedMarker, `${completedMarker}\n${completedTask}`);
}

fs.writeFileSync('docs/CURRENT_STATE.md', state);
console.log('Updated CURRENT_STATE.md');
