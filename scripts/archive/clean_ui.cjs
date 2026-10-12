const fs = require('fs');

// --- Fix result.html ---
let resultHtml = fs.readFileSync('result.html', 'utf8');
const duplicateFooterRegex = /<div id="bottom-ad-banner" style="position: fixed; bottom: 0; left: 0; width: 100%; height: 50px; background: #000000; color: #94a3b8; display: flex; align-items: center; justify-content: center; font-size: 0\.8rem; z-index: 10000; font-family: 'Outfit', sans-serif; font-weight: 600;">\s*TopsCore &copy; 2026 \| Created by Mr\. Top\s*<\/div>/g;
resultHtml = resultHtml.replace(duplicateFooterRegex, '');
fs.writeFileSync('result.html', resultHtml);
console.log('Fixed result.html');

// --- Fix assessment.html ---
let assessHtml = fs.readFileSync('assessment.html', 'utf8');

// 1. Fix Next button encoding
assessHtml = assessHtml.replace("bottomNext.textContent = 'Next &rarr;'", "bottomNext.textContent = 'Next ➔'");

// 2. Remove duplicate toggleMatrixPopup at ~line 538
const dupPopupRegex = /function toggleMatrixPopup\(show\) \{[\s\S]*?\n    \};\n/;
assessHtml = assessHtml.replace(dupPopupRegex, '');

// 3. Update main window.toggleMatrixPopup logic (line ~1494)
const oldPopupRegex = /window\.toggleMatrixPopup = function\(show\) \{[\s\S]*?    \};\n\n    function saveCurrentAnswer/g;
const newPopup = `window.toggleMatrixPopup = function(show) {
      const popup = document.getElementById('matrix-popup');
      if (!popup) return;
      const isCurrentlyShown = popup.style.display !== 'none';
      const shouldShow = typeof show !== 'undefined' ? show : !isCurrentlyShown;
      
      popup.style.display = shouldShow ? 'flex' : 'none';
      
      const mainContent = document.getElementById('assessment-main');
      if (mainContent) {
        if (shouldShow) {
          mainContent.style.pointerEvents = 'none';
        } else {
          mainContent.style.pointerEvents = 'auto';
        }
      }

      const vk = document.getElementById('virtual-keyboard-container');
      if (vk) {
        if (shouldShow) {
           vk.style.display = 'none';
        } else {
           const row = answerRows[currentIndex];
           if (row) {
             let snap = row.question_snapshot;
             if (typeof snap === 'string') {
               try { snap = JSON.parse(snap); } catch { snap = {}; }
             }
             const answerType = snap?.answer_type || row.answer_type || 'written';
             if ((answerType === 'written' || answerType.includes('written')) && vk) {
               vk.style.display = 'flex';
             }
           }
        }
      }
    };

    function saveCurrentAnswer`;

assessHtml = assessHtml.replace(oldPopupRegex, newPopup);

fs.writeFileSync('assessment.html', assessHtml);
console.log('Fixed assessment.html');
