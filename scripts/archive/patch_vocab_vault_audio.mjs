import fs from 'fs';

let code = fs.readFileSync('js/admin/vocab-vault.js', 'utf8');

// 1. Add helper speakEnglishWord function if not present
const helperFunc = `
function speakEnglishWord(text) {
  if (!text || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  u.rate = 0.95;
  const voices = window.speechSynthesis.getVoices();
  const enVoice = voices.find(v => (v.lang === 'en-US' || v.lang.startsWith('en')) && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Female')));
  if (enVoice) u.voice = enVoice;
  window.speechSynthesis.speak(u);
}
`;

if (!code.includes('function speakEnglishWord')) {
  code = helperFunc + '\n' + code;
}

// 2. Add speaker button in cell-english
const oldCellEng = `<td class="cell-english" style="padding: 6px 12px; color: #ffffff; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 250px;" title="\${escapeHtml(w.english)}">\${escapeHtml(w.english)}</td>`;
const newCellEng = `<td class="cell-english" style="padding: 6px 12px; color: #ffffff; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 250px;" title="\${escapeHtml(w.english)}">
          <button type="button" class="btn-vault-speak" data-speak="\${escapeHtml(w.english)}" style="background:transparent; border:none; cursor:pointer; padding:0 4px; font-size:12px; color:var(--clr-accent-1, #6366f1); opacity:0.85; transition:transform 0.15s ease;" title="Listen Native Pronunciation">🔊</button>
          \${escapeHtml(w.english)}
        </td>`;

if (code.includes(oldCellEng)) {
  code = code.replace(oldCellEng, newCellEng);
}

// 3. Add event delegation on tbody
const oldDeleteHandlers = `    // Delete handlers\n    tbody.querySelectorAll('[data-del-vault]').forEach(btn => {`;
const newEventDelegation = `    // Native Speech Pronunciation Handler
    tbody.querySelectorAll('.btn-vault-speak').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const text = btn.getAttribute('data-speak');
        speakEnglishWord(text);
        btn.style.transform = 'scale(1.25)';
        setTimeout(() => { btn.style.transform = 'scale(1)'; }, 250);
      });
    });

    // Delete handlers
    tbody.querySelectorAll('[data-del-vault]').forEach(btn => {`;

if (code.includes(oldDeleteHandlers)) {
  code = code.replace(oldDeleteHandlers, newEventDelegation);
}

fs.writeFileSync('js/admin/vocab-vault.js', code, 'utf8');
console.log('Successfully patched native pronunciation into vocab-vault.js');
