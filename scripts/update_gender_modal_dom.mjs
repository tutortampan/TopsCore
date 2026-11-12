import fs from 'fs';

let html = fs.readFileSync('dashboard.html', 'utf8');

// Split by newlines, do targeted line replacements
const lines = html.split('\n');

// Line 477 (index 476): title
lines[476] = lines[476].replace('Personalize Your Account', 'CHOOSE YOUR AVATAR');

// Line 478-480: description paragraph — replace 3 lines
lines[477] = lines[477]; // <p class=...> — keep
lines[478] = `            Select your profile avatar to personalize your title and learning dashboard.\r`;
lines[479] = lines[479]; // </p> — keep

// Line 482: comment
lines[481] = `          <!-- Gender Choice Cards — 2-column side-by-side grid -->\r`;

// Line 484: male card div — add role/tabindex/aria-pressed
lines[483] = `            <div class="gender-card p-5" id="opt-gender-male" role="button" tabindex="0" aria-pressed="false">\r`;

// Line 485: before gender-card-icon, insert checkmark div
lines[484] = `              <div class="gender-card-checkmark">✓</div>\r\n              <div class="gender-card-icon">👦</div>\r`;

// Line 489: female card div
lines[488] = `            <div class="gender-card p-5" id="opt-gender-female" role="button" tabindex="0" aria-pressed="false">\r`;

// Line 490: insert checkmark for female
lines[489] = `              <div class="gender-card-checkmark">✓</div>\r\n              <div class="gender-card-icon">👧</div>\r`;

// Line 496: info text — remove extra space
lines[495] = `          <p class="text-xs text-muted mb-6">ℹ️ You can change this anytime later from your Profile settings.</p>\r`;

// Line 499: button text
lines[498] = `            SAVE &amp; CONTINUE &rarr;\r`;

fs.writeFileSync('dashboard.html', lines.join('\n'), 'utf8');
console.log('✅ Gender modal DOM patched line-by-line');

// Verify
const check = fs.readFileSync('dashboard.html', 'utf8').split('\n');
console.log('Line 477:', check[476]);
console.log('Line 484:', check[483]);
console.log('Line 499:', check[498]);
