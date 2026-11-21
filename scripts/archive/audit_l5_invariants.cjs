const fs = require('fs');

const content = fs.readFileSync('js/admin/tests-access.js', 'utf8');

// Extract modal HTML for Window L5
const startIdx = content.indexOf('id="modal-kick-student-confirm"');
const endIdx = content.indexOf('<!-- Modal 5:', startIdx);
const modalHtml = content.substring(startIdx, endIdx);

// Extract openKickConfirmationModal function
const renderStart = content.indexOf('function openKickConfirmationModal');
const renderEnd = content.indexOf('function evaluateStudentEligibility', renderStart);
const renderFunc = content.substring(renderStart, renderEnd);

console.log('=== AUDIT WINDOW L5 (#modal-kick-student-confirm) ===');

console.log('--- 1. TYPOGRAPHY CHECK ---');
const fontMatches = [...(modalHtml + renderFunc).matchAll(/font-size:\s*(\d+)px/g)];
const invalidFonts = fontMatches.filter(m => ![12, 14, 16, 20, 30, 40].includes(parseInt(m[1], 10)));
console.log('Invalid font sizes:', invalidFonts.map(m => m[0]));

console.log('--- 2. PUNCTUATION & COLONS CHECK ---');
const templateStrings = (renderFunc.match(/`([\s\S]*?)`/g) || []).join(' ');
const htmlOnly = modalHtml + ' ' + templateStrings;
const colonMatches = [...htmlOnly.matchAll(/[a-zA-Z0-9]+\s+:/g)];
console.log('Spaced colons (violations):', colonMatches.map(m => m[0]));

console.log('--- 3. LANGUAGE PURITY (ENGLISH 100%) ---');
const indonesianWords = ['buka', 'sesi', 'tutup', 'pilih', 'siswa', 'cara', 'jawab', 'durasi', 'menit', 'waktu', 'peringatan', 'sudah', 'lulus', 'habis', 'keluarkan', 'batalkan'];
const foundIndo = indonesianWords.filter(w => new RegExp('\\b' + w + '\\b', 'i').test(modalHtml + ' ' + renderFunc));
console.log('Indonesian words:', foundIndo);

console.log('--- 4. ANTI-CAPSULE & ZERO-GLOW ---');
const glowMatches = [...(modalHtml + renderFunc).matchAll(/text-shadow:\s*(?!none)[^;'\"]+/g)];
console.log('Glow styles (violations):', glowMatches.map(m => m[0]));

console.log('--- 5. HEADER (SOLID NAVY 60PX) ---');
const headerMatch = modalHtml.match(/<div style="([^"]*height:60px[^"]*)">/);
if (headerMatch) {
  console.log('Has 60px height:', headerMatch[1].includes('height:60px'));
  console.log('Has Solid Navy #1E293B:', headerMatch[1].includes('#1E293B'));
} else {
  console.log('Header 60px NOT FOUND!');
}

console.log('--- 6. BUTTON HEIGHTS & CTA STANDARDS ---');
const leftBtn = modalHtml.match(/<button[^>]*id="btn-cancel-kick"[^>]*style="([^"]*)"/);
if (leftBtn) {
  console.log('Left Cancel Button has 40px height:', leftBtn[1].includes('height:40px'));
  console.log('Left Cancel Button has Red Accent:', leftBtn[1].includes('var(--grade-e)'));
} else {
  console.log('Left Cancel Button NOT FOUND!');
}

const rightBtn = modalHtml.match(/<button[^>]*id="btn-confirm-kick"[^>]*style="([^"]*)"/);
if (rightBtn) {
  console.log('Right Expel Button has 40px height:', rightBtn[1].includes('height:40px'));
  console.log('Right Expel Button has Red Accent:', rightBtn[1].includes('var(--grade-e)'));
} else {
  console.log('Right Expel Button NOT FOUND!');
}

console.log('--- 7. GAPS & PADDINGS ---');
const gapMatches = [...modalHtml.matchAll(/gap:\s*(\d+)px/g)];
console.log('Gaps used:', [...new Set(gapMatches.map(m => m[0]))]);
