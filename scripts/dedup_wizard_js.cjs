'use strict';
const fs = require('fs');
const FILE = 'd:/Drives/Tutor Tampan/TopsCore/js/admin/tests-access.js';
let lines = fs.readFileSync(FILE, 'utf8').split('\n');

// Lines to remove: 1358-1410 (0-indexed: 1357-1409), 53 lines
// But we want to keep the durationInput binding part at 1391-1393, plus 1411+
// Easiest: splice out 1357 to 1409 inclusive (old comment + duplicate block + old auto-dur vars)
// 0-indexed: splice(1357, 53) removes 53 lines starting at index 1357

const preLen = lines.length;

// Lines 1358-1410 = 0-indexed 1357-1409 = 53 lines
// But actually let's just splice out the duplicate:
// Lines 1358 is "  // --- Auto-duration calculation ---"
// Lines 1360-1377 is duplicate pill block
// Lines 1379-1410 is old auto-duration vars (duplicates _wordsQ etc)
// Keep: lines 1391-1393 (durationInput binding) are part of the new block already

// Actually the new block (lines 1379-1393) is clean and correct.
// The OLD duplicate is lines 1358-1377 (comment + duplicate pill loop).
// So splice out 1357 to 1377 (0-indexed), 20 lines.

// Let's verify:
console.log('L1358 (0-idx 1357):', lines[1357].trim());
console.log('L1377 (0-idx 1376):', lines[1376].trim());
console.log('L1378 (0-idx 1377):', lines[1377].trim());
console.log('L1395 (0-idx 1394):', lines[1394].trim());

// Remove lines 1358-1377 (comment "--- Auto-duration ---" + duplicate pill loop)
// That's indices 1357 to 1376 inclusive = 20 lines
lines.splice(1357, 20);
console.log('Spliced 20 lines. New length:', lines.length, '(was', preLen + ')');

// Now check line 1358 again (what was line 1378)
console.log('New L1358 (should be blank):', lines[1357].trim());

// Now also remove the OLD auto-duration duplicate (was lines 1395-1410, now shifted by -20 → 1375-1390)
// Verify:
console.log('New L1376 (0-idx 1375):', lines[1375].trim());
console.log('New L1391 (0-idx 1390):', lines[1390].trim());

// The old auto-dur duplicate block starts where we see "const suggestionText"
// Find it:
let dupStart = -1;
for (let i = 1370; i < 1400; i++) {
  if (lines[i] && lines[i].includes('const suggestionText')) { dupStart = i; break; }
}
console.log('Old auto-dur dup at line (0-idx):', dupStart, '=', (dupStart !== -1 ? lines[dupStart].trim() : 'NOT FOUND'));

if (dupStart !== -1) {
  // Find where it ends (before confirmBtn)
  let dupEnd = dupStart;
  for (let i = dupStart; i < dupStart + 30; i++) {
    if (lines[i] && lines[i].includes('const confirmBtn')) { dupEnd = i - 1; break; }
  }
  const removeCount = dupEnd - dupStart + 1;
  console.log('Removing old auto-dur dup: lines', dupStart, 'to', dupEnd, '=', removeCount, 'lines');
  console.log('  First:', lines[dupStart].trim());
  console.log('  Last:', lines[dupEnd].trim());
  lines.splice(dupStart, removeCount);
  console.log('After removal, new length:', lines.length);
}

fs.writeFileSync(FILE, lines.join('\n'), 'utf8');
console.log('\nWritten. Running syntax check...');
