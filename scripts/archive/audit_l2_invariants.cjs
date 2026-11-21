const fs = require('fs');

const content = fs.readFileSync('js/admin/tests-access.js', 'utf8');

// Extract modal HTML for Window L2
const startIdx = content.indexOf('modal-theme-live-monitor');
const endIdx = content.indexOf('modal-kick-student-confirm', startIdx);
const modalHtml = content.substring(startIdx, endIdx);

// Extract openThemeLiveMonitorModal function
const renderStart = content.indexOf('async function openThemeLiveMonitorModal');
const renderEnd = content.indexOf('function openKickConfirmationModal', renderStart);
const renderFunc = content.substring(renderStart, renderEnd);

console.log('--- 1. TYPOGRAPHY CHECK ---');
const fontMatches = [...(modalHtml + renderFunc).matchAll(/font-size:\s*(\d+)px/g)];
const invalidFonts = fontMatches.filter(m => ![10, 12, 14, 16, 20, 30, 40].includes(parseInt(m[1], 10)));
console.log('Invalid font sizes:', invalidFonts.map(m => m[0]));

console.log('--- 2. PUNCTUATION & COLONS CHECK ---');
const htmlOnly = modalHtml + (renderFunc.match(/`([\s\S]*?)`/g) || []).join(' ');
const colonMatches = [...htmlOnly.matchAll(/[a-zA-Z0-9]+\s+:/g)];
console.log('Spaced colons (violations):', colonMatches.map(m => m[0]));

console.log('--- 3. LANGUAGE PURITY (ENGLISH 100%) ---');
const indonesianWords = ['buka', 'sesi', 'tutup', 'pilih', 'siswa', 'cara', 'jawab', 'durasi', 'menit', 'waktu', 'peringatan', 'sudah', 'lulus', 'habis'];
const foundIndo = indonesianWords.filter(w => new RegExp('\\b' + w + '\\b', 'i').test(modalHtml));
console.log('Indonesian words in HTML:', foundIndo);

console.log('--- 4. ANTI-CAPSULE & ZERO-GLOW IN TABLE CELLS ---');
const tdMatches = [...renderFunc.matchAll(/<td[\s\S]*?<\/td>/g)];
const capsuleTds = tdMatches.filter(td => td[0].includes('border-radius:4px') || td[0].includes('background:rgba('));
console.log('Capsule TDs (violations):', capsuleTds.length);
const glowTds = tdMatches.filter(td => /text-shadow:\s*(?!none)[^;'\"]+/.test(td[0]));
console.log('Glow TDs (violations):', glowTds.length);

console.log('--- 5. BUTTON HEIGHTS & CTA STANDARDS ---');
const leftCloseBtn = modalHtml.match(/<button[^>]*id="btn-close-live-modal-footer"[^>]*style="([^"]*)"/);
if (leftCloseBtn) {
  console.log('Left Close Button Style:\n', leftCloseBtn[1]);
  console.log('Has 40px height:', leftCloseBtn[1].includes('height:40px'));
  console.log('Has Red Accent:', leftCloseBtn[1].includes('var(--grade-e)'));
} else {
  console.log('Left Close Button NOT FOUND!');
}

console.log('--- 6. GAPS & PADDINGS ---');
const gapMatches = [...modalHtml.matchAll(/gap:\s*(\d+)px/g)];
console.log('Gaps used:', [...new Set(gapMatches.map(m => m[0]))]);
