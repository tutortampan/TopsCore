const fs = require('fs');
const file = 'd:/TopsCore/assessment.html';
let content = fs.readFileSync(file, 'utf8');

// 1. Header
content = content.replace(
  /<div style="display:flex; justify-content:space-between; align-items:flex-start; width:100%; gap:8px;">([\s\S]*?)<button onclick="openSubmitModal\(\)".*?>Menyerah<\/button>\s*<\/div>/,
  `    <div style="display:flex; justify-content:space-between; align-items:center; width:100%; gap:8px;">
      <div class="assessment-timer" id="assessment-timer" style="display:inline-flex; align-items:center; gap:6px; background:rgba(255,255,255,0.15); padding:6px 12px; border-radius:12px; backdrop-filter:blur(10px); flex-shrink:0;">
        <span style="font-size:1.1rem;">⏳</span>
        <span id="timer-display" style="font-weight:800; color:#fca5a5; font-size:1.1rem; letter-spacing: 0.05em;">--:--</span>
      </div>
      <div style="flex: 1; text-align:center;">
         <h1 id="assessment-main-title" style="font-size:clamp(0.9rem, 3.5vw, 1.15rem); font-weight:800; color:#fff; font-family:'Outfit', sans-serif; line-height: 1.2; margin: 0; text-shadow:0 2px 4px rgba(0,0,0,0.5);">Assessment Title</h1>
      </div>
      <button onclick="openSubmitModal()" style="display:flex; align-items:center; gap:6px; background:#dc2626; color:#fff; border:none; border-radius:12px; padding:6px 12px; font-size:0.9rem; font-weight:800; cursor:pointer; flex-shrink:0; box-shadow:0 4px 12px rgba(0,0,0,0.3); transition: transform 0.2s;">
        <span>🏳️</span> Give up!
      </button>
    </div>`
);

// 2. Nav buttons
content = content.replace(/bottomNext\.textContent = 'Submit.*?';/g, "bottomNext.textContent = 'Submit 📋';");
content = content.replace(/bottomNext\.textContent = 'Next Sec.*?';/g, "bottomNext.textContent = 'Next Sec ➔';");
content = content.replace(/bottomNext\.textContent = 'Next(?! Sec).*?';/g, "bottomNext.textContent = 'Next ➔';");

// 2b. Bottom Nav Bar layout (if needed) - let's make the buttons fatter
content = content.replace(
  /<button class="btn btn-secondary" id="bottom-prev-btn" style="padding:6px 12px; font-size:0\.85rem;"/g,
  '<button class="btn btn-secondary" id="bottom-prev-btn" style="padding:10px 16px; font-size:0.95rem; font-weight:700; border-radius:12px;"'
);
content = content.replace(
  /<button class="btn btn-primary" id="bottom-next-btn" style="padding:6px 12px; font-size:0\.85rem;">/g,
  '<button class="btn btn-primary" id="bottom-next-btn" style="padding:10px 16px; font-size:0.95rem; font-weight:700; border-radius:12px;">'
);


// 3. Dropdown logic
content = content.replace(/renderDropdown\(answerArea, row, savedAnswer, snap\);/g, 'renderPhraseChips(answerArea, row, savedAnswer, snap);');

// 4. q.id bug
content = content.replace(/ta\.id = `written-\$\{q\.id\}`;/g, 'ta.id = `written-${row.id}`;');

fs.writeFileSync(file, content, 'utf8');
console.log('Replaced successfully');
